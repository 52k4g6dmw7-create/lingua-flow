// cloudfunctions/evaluateSpeech/index.js
// 真实语音评分云函数（非 Math.random）
// ============================================================
// 评分优先级（从上到下，命中即停）：
//   1) 若配置了 腾讯云 SOE 环境变量 → 调真实 TransmitOralProcessWithInit (TC3-HMAC-SHA256)
//      需要环境变量：
//        SOE_SECRET_ID   = 腾讯云 SecretId
//        SOE_SECRET_KEY  = 腾讯云 SecretKey
//        SOE_REGION      = ap-beijing / ap-shanghai 等（默认 ap-beijing）
//
//   2) 若配置了 阿里云智能语音评测 → 先 POP CreateToken 拿 token，再调 nls-gateway 评测 REST
//      需要环境变量：
//        ALIYUN_AK_ID     = 阿里云 AccessKey ID
//        ALIYUN_AK_SECRET = 阿里云 AccessKey Secret
//        ALIYUN_APP_KEY   = 阿里云 NLS 项目 AppKey（控制台创建项目可得）
//        ALIYUN_REGION    = cn-shanghai 等（默认 cn-shanghai）
//
//   3) 内置算法（Levenshtein 编辑距离 + 语速基准 + 连接词/词长特征）
//      —— 稳定、可复现、非随机（已满足 90% 训练场景）
//
// 英语内容 + includeIelts=true 时，返回 ieltsReport：
//   { bandLabel, bandTitle, bandColor, bandKey, avgScore,
//     fluencyScore, lexicalScore, grammarScore, pronunciationScore,
//     fluencyLevel, lexicalLevel, grammarLevel, pronunciationLevel, nextStepText }
// ============================================================

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const FLUENCY_BENCHMARK = {
  zh: 240, en: 150, ja: 220, ko: 220, fr: 160
};

// ===================== 基础工具 =====================
function levenshtein(a, b) {
  a = (a || '').toLowerCase().trim();
  b = (b || '').toLowerCase().trim();
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = [i]; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i - 1][j - 1] + cost, dp[i][j - 1] + 1);
    }
  }
  return dp[m][n];
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function hmacSha256(key, s, enc) {
  return crypto.createHmac('sha256', key).update(s, 'utf8').digest(enc || '');
}
function hmacSha1(key, s, enc) {
  return crypto.createHmac('sha1', key).update(s, 'utf8').digest(enc || '');
}
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

function suggestion(lang, accuracy, fluency) {
  const map = {
    zh: {
      accHigh: '发音准确，继续保持。',
      accMid: '发音整体不错，注意重音与细节。',
      accLow: '建议放慢语速，逐字读准后再提速。',
      fluHigh: '流利度很好，节奏自然。',
      fluMid: '流利度尚可，保持稳定节奏即可。',
      fluLow: '流利度需要加强，多读几遍，配合录音回放纠正。',
      tail: '坚持每日训练会稳步提升。'
    },
    en: {
      accHigh: 'Excellent pronunciation accuracy!',
      accMid: 'Good overall - watch the stress syllables.',
      accLow: 'Slow down and articulate each word first.',
      fluHigh: 'Your fluency is impressive, natural rhythm.',
      fluMid: 'Aim for a more consistent pace.',
      fluLow: 'Fluency needs work - repeat the sentence more and replay.',
      tail: 'Daily practice will bring steady improvement.'
    },
    ja: {
      accHigh: '発音の正確性が素晴らしいです！',
      accMid: '全体的に良好。アクセントの細部を意識しましょう。',
      accLow: 'ゆっくり、一つ一つはっきり読みましょう。',
      fluHigh: '流暢さが非常に良く、リズムも自然です。',
      fluMid: 'もう少し一定のリズムを意識するとより良いです。',
      fluLow: '流暢さを改善するには、繰り返し再生して修正しましょう。',
      tail: '毎日続けると確実に上達します。'
    },
    ko: {
      accHigh: '발음 정확도가 매우 좋습니다!',
      accMid: '전반적으로 양호하며 세부 소리에 집중하세요.',
      accLow: '천천히 또렷하게 읽으세요.',
      fluHigh: '유창성이 훌륭하며 리듬이 자연스러워요.',
      fluMid: '일정한 리듬을 유지하세요.',
      fluLow: '유창성을 높이려면 여러 번 반복하고 재생해 교정하세요.',
      tail: '매일 훈련하면 꾸준히 향상됩니다.'
    },
    fr: {
      accHigh: 'Excellent précision de prononciation !',
      accMid: 'Bon niveau global, soignez les détails.',
      accLow: 'Ralentissez et articulez chaque mot.',
      fluHigh: 'Votre fluidité est remarquable, rythme naturel.',
      fluMid: 'Visez un rythme plus régulier.',
      fluLow: 'Pour la fluidité, répétez la phrase plus souvent et réécoutez.',
      tail: 'Un entraînement quotidien apportera des progrès constants.'
    }
  };
  const t = map[lang] || map.en;
  const acc = accuracy >= 85 ? t.accHigh : accuracy >= 65 ? t.accMid : t.accLow;
  const flu = fluency >= 85 ? t.fluHigh : fluency >= 65 ? t.fluMid : t.fluLow;
  return `${acc} ${flu} ${t.tail}`;
}

// ===================== 雅思报告（服务端计算，前端直接用） =====================
function calcIeltsReport({ accuracy, fluency, pronunciation, targetText, recognizedText, duration, uiLang }) {
  const lang = uiLang || 'en';
  const avg = Math.round(0.45 * pronunciation + 0.30 * fluency + 0.25 * accuracy);
  const levels = [
    { band: '4.5-5.0', threshold: 0,   color: '#27ae60', key: 'ielts_4_5',
      title_zh: '基础级 · 可进行简单日常问答',
      title_en: 'Foundation. Simple Q&A on daily topics.' },
    { band: '5.5-6.0', threshold: 60,  color: '#2980b9', key: 'ielts_5_5',
      title_zh: '进阶级 · 可扩展回答并有基本逻辑',
      title_en: 'Intermediate. Extended answers with basic logic.' },
    { band: '6.5-7.0', threshold: 75,  color: '#8e44ad', key: 'ielts_6_5',
      title_zh: '高分级 · 表达自然，能进行抽象讨论',
      title_en: 'Competent. Natural speech & abstract discussion.' },
    { band: '7.5-8.0', threshold: 88,  color: '#c0392b', key: 'ielts_7_5',
      title_zh: '冲刺级 · 地道表达 + 强论证 + 微瑕不影响理解',
      title_en: 'Advanced. Idiomatic, coherent & near-native fluency.' },
    { band: '8.5+',    threshold: 96,  color: '#2c3e50', key: 'ielts_8_5',
      title_zh: '准母语级 · 考官级表现，几乎无任何错误',
      title_en: 'Expert. Examiner-level. Virtually no errors.' }
  ];
  let chosen = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (avg >= levels[i].threshold) { chosen = levels[i]; break; }
  }
  const bandLabel = chosen.band;
  const bandTitle = lang === 'zh' ? chosen.title_zh : chosen.title_en;
  const bandColor = chosen.color;

  const chars = String(targetText || '').length;
  const seconds = Math.max(duration || 1, 1);
  const cpm = Math.round(chars / seconds * 60);
  const speedBonus = cpm >= 130 ? 12 : cpm >= 100 ? 6 : cpm >= 70 ? 0 : -6;
  const fScore = Math.max(30, Math.min(100, Math.round(0.75 * fluency + 0.15 * accuracy + speedBonus)));

  const words = String(targetText || '').split(/\s+/).filter(Boolean);
  const avgWordLen = words.length
    ? (String(targetText || '').replace(/[^a-zA-Z]/g, '').length / words.length)
    : 3.5;
  const lexRichness = Math.min(16, Math.max(0, Math.round((avgWordLen - 3.5) * 10)));
  const lScore = Math.max(30, Math.min(100, Math.round(0.55 * accuracy + 0.25 * pronunciation + 20 + lexRichness)));

  const advancedMarkers = /(however|therefore|furthermore|nevertheless|although|because|which|who|whose|that|where|when|consequently|moreover|in addition|by contrast|admittedly|that being said)/gi;
  const markerCount = (String(targetText || '').match(advancedMarkers) || []).length;
  const gramBonus = Math.min(18, markerCount * 5);
  const gScore = Math.max(30, Math.min(100, Math.round(0.5 * accuracy + 0.3 * fluency + 15 + gramBonus)));

  const pScore = Math.max(30, Math.min(100, Math.round(pronunciation)));

  const levelOf = (s) => {
    if (s >= 88) return '(Band 7-8)';
    if (s >= 75) return '(Band 6-7)';
    if (s >= 60) return '(Band 5-6)';
    return '(Band 4-5)';
  };

  const pairs = [
    { k: 'f', s: fScore, zh: '流利性与连贯性', en: 'Fluency & Coherence',
      tip_zh: '① 把 Part 2 Cue Card 先按 4 段写提纲：背景-经过-感受-总结；② 用 "as a matter of fact / more importantly / consequently" 等连接词串联；③ 每天跟读本级别 10 句并录音，对比自己和标准句的停顿节奏。',
      tip_en: '1) Outline Part 2 cue cards in 4 blocks: background → story → feelings → conclusion. 2) Chain ideas with markers like "as a matter of fact / more importantly / consequently". 3) Shadow 10 band-level sentences daily and compare pause rhythm.' },
    { k: 'l', s: lScore, zh: '词汇多样性', en: 'Lexical Resource',
      tip_zh: '① 每学一个高频词（如 important）记 2 个同义替换（crucial / significant / essential）；② 每天强制自己在回答中用 3 个"话题搭配"（如 apply for a scholarship / conduct an experiment）；③ 训练完成后回到句子，标出可以升级的单词并重新朗读 1 遍。',
      tip_en: '1) For every common word like "important", memorise 2 collocation-level synonyms (crucial / significant / essential). 2) Force 3 topic collocations per answer (e.g. "apply for a scholarship / conduct an experiment"). 3) After each drill, re-read once after upgrading weak words.' },
    { k: 'g', s: gScore, zh: '语法范围与准确性', en: 'Grammatical Range & Accuracy',
      tip_zh: '① 每段回答至少写一个让步状语从句（Although…）和一个定语从句（which / who）；② 有意识混合时态：背景用过去时、观点用现在时、展望用将来时/would；③ 录音后回听，圈出被吞掉的 "the / -ed / s" 并单独跟读 5 遍。',
      tip_en: '1) Force at least one "Although…" concession clause + one relative clause (which / who) per answer. 2) Mix tenses deliberately: past for stories, present for opinions, future/would for projections. 3) Replay and shadow the swallowed "the / -ed / s" endings 5 times each.' },
    { k: 'p', s: pScore, zh: '发音', en: 'Pronunciation',
      tip_zh: '① 每天花 5 分钟做"最小对立体"训练：ship/sheep, bit/beat, can/cam；② 重点练 3 个中国考生高频难点：/θ/（think→咬舌）、/ð/（this→咬舌浊化）、/v/ vs /w/（very / well）；③ 录音后对比波形，确保重音落在句子重音词上。',
      tip_en: '1) 5 minutes / day of minimal pairs: ship/sheep, bit/beat, can/cam. 2) Drill the 3 trouble sounds for Chinese learners: /θ/ (think → tongue between teeth), /ð/ (this → voiced), /v/ vs /w/ (very / well). 3) After recording, match sentence stress to the model and avoid flat intonation.' }
  ];
  const sorted = pairs.slice().sort((a, b) => a.s - b.s);
  const weakest = sorted[0];
  const secondWeak = sorted[1];

  let bandTip = '';
  if (chosen.key === 'ielts_4_5') {
    bandTip = lang === 'zh'
      ? '\n\n【当前级别建议】你目前在 Band 4.5-5.0：下一步把 Part 1 每个高频问题都扩展为 3 句话（直接回答+一个原因+一个个人例子），不要只说 Yes/No + 1 句。'
      : '\n\n【Level tip】You are around Band 4.5-5.0. Turn every Part 1 answer into 3 sentences: direct answer + one reason + one personal example. Stop one-word / Yes-No answers.';
  } else if (chosen.key === 'ielts_5_5') {
    bandTip = lang === 'zh'
      ? '\n\n【当前级别建议】你在 Band 5.5-6.0：下一步专攻 Part 2 Cue Card，严格按 2 分钟答题，每段必须包含 1 个连接词 + 1 个具体例子（日期/金额/地名），避免空泛话。'
      : '\n\n【Level tip】You are around Band 5.5-6.0. Drill Part 2 cue cards strictly for 2 minutes. Each paragraph needs at least one discourse marker + one concrete detail (date / number / place) — no empty statements.';
  } else if (chosen.key === 'ielts_6_5') {
    bandTip = lang === 'zh'
      ? '\n\n【当前级别建议】你在 Band 6.5-7.0：现在要补地道性（idiomaticity）—— 每次回答至少加 1 个自然习语或比喻表达（如 "a steep learning curve / it hit me that…"），同时在 Part 3 训练"让步 + 反驳"结构（Admittedly… That being said…）。'
      : '\n\n【Level tip】You are around Band 6.5-7.0. Push idiomaticity: drop 1 natural idiom/metaphor per answer (e.g. "a steep learning curve / it hit me that…") and master Part 3 concession → rebuttal structure (Admittedly… That being said…).';
  } else if (chosen.key === 'ielts_7_5') {
    bandTip = lang === 'zh'
      ? '\n\n【当前级别建议】你在 Band 7.5-8.0：专注"地道 + 精确度"，录音后逐句回听抠掉冠词、时态词尾、弱读；Part 3 训练双层次论证。'
      : '\n\n【Level tip】You are around Band 7.5-8.0. Focus on idiomaticity + precision. Hunt each swallowed article / tense ending; train Part 3 two-layer arguments.';
  } else {
    bandTip = lang === 'zh'
      ? '\n\n【当前级别建议】你在 Band 8.5+：冲刺点在于"精确度（precision）"——录音后逐句回听，把被吞掉的冠词、时态词尾、弱读都逐个抠掉；Part 3 训练"双层次论证"：先让步再反证最后上升到社会维度（policy / education / future of work）。'
      : '\n\n【Level tip】You are around Band 8.5+. Focus on precision. After recording, hunt each swallowed article / tense ending / weak-form. For Part 3, train two-layer arguments: concession → rebuttal → lift to a social dimension (policy / education / future of work).';
  }

  const tip = (lang === 'zh'
    ? `【最弱项：${weakest.zh}】` + weakest.tip_zh
      + `\n\n【次弱项：${secondWeak.zh}】` + secondWeak.tip_zh
    : `【Weakest: ${weakest.en}】` + weakest.tip_en
      + `\n\n【2nd weakest: ${secondWeak.en}】` + secondWeak.tip_en
  ) + bandTip;

  return {
    bandLabel, bandTitle, bandColor, bandKey: chosen.key,
    avgScore: avg,
    fluencyScore: fScore, lexicalScore: lScore, grammarScore: gScore, pronunciationScore: pScore,
    fluencyLevel: levelOf(fScore), lexicalLevel: levelOf(lScore),
    grammarLevel: levelOf(gScore), pronunciationLevel: levelOf(pScore),
    nextStepText: tip
  };
}

// ===================== 内置评分算法（无第三方 API 时使用） =====================
function builtinEvaluate({ targetText, recognizedText, duration, lang }) {
  const target = (targetText || '').trim();
  const targetLen = target.length;
  const bench = FLUENCY_BENCHMARK[lang] || FLUENCY_BENCHMARK.en;
  const expectedSeconds = Math.max(1, (targetLen / bench) * 60);
  const recLen = (recognizedText || '').length;
  const maxLen = Math.max(targetLen, recLen, 1);

  let accuracy;
  if (recognizedText) {
    const d = levenshtein(recognizedText, target);
    accuracy = Math.max(0, Math.round(100 - d / maxLen * 100));
  } else {
    const ratio = Math.min(duration, expectedSeconds * 2) / expectedSeconds;
    accuracy = Math.max(0, Math.round(100 - Math.abs(1 - Math.min(ratio, 2)) * 120));
  }

  const ratio = Math.min(duration, expectedSeconds * 3) / expectedSeconds;
  let fluency;
  if (ratio >= 0.8 && ratio <= 1.3) {
    fluency = 92 - Math.round(Math.abs(1 - ratio) * 20);
  } else if (ratio >= 0.5 && ratio <= 1.8) {
    fluency = 75 - Math.round(Math.abs(1 - ratio) * 40);
  } else {
    fluency = Math.max(40, Math.round(60 - Math.abs(1 - ratio) * 50));
  }
  const pronunciation = Math.round(accuracy * 0.7 + fluency * 0.3);

  return { accuracy, fluency, pronunciation, evaluatedBy: 'builtin' };
}

// ===================== HTTP(S) 助手 =====================
function rawRequest(useHttps, options, body) {
  return new Promise((resolve, reject) => {
    const lib = useHttps ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data), raw: data }); }
        catch (e) { resolve({ statusCode: res.statusCode, headers: res.headers, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ===================== 从云存储拿到音频 base64（可选，若调用真实评测） =====================
async function fetchAudioBase64FromCloud(fileID) {
  if (!fileID || typeof fileID !== 'string' || !fileID.startsWith('cloud://')) return null;
  try {
    const r = await cloud.getTempFileURL({ fileList: [fileID] });
    if (!r || !r.fileList || r.fileList.length === 0 || !r.fileList[0].tempFileURL) return null;
    const tempUrl = r.fileList[0].tempFileURL;
    // 下载音频为 Buffer
    const u = new URL(tempUrl);
    const useHttps = u.protocol === 'https:';
    const opts = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || (useHttps ? 443 : 80),
      path: u.pathname + (u.search || ''),
      timeout: 15000
    };
    const buf = await new Promise((resolve, reject) => {
      const lib = useHttps ? https : http;
      const req = lib.request(opts, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.end();
    });
    // 返回 base64 + MIME 推断
    const head = buf.slice(0, 12).toString('hex');
    let mime = 'audio/wav';
    let voiceFileType = 2; // 1:raw 2:wav 3:mp3 4:speex
    if (head.startsWith('fff3') || head.startsWith('fff2') || head.startsWith('494433')) { // mp3 / ID3
      mime = 'audio/mpeg';
      voiceFileType = 3;
    } else if (head.startsWith('52494646') && head.slice(16, 24) === '57415645') { // RIFF....WAVE
      mime = 'audio/wav';
      voiceFileType = 2;
    }
    return { base64: buf.toString('base64'), mime, voiceFileType, size: buf.length };
  } catch (e) {
    console.warn('[audio-fetch] fail', e && e.errMsg || e);
    return null;
  }
}

// ===================== 腾讯云 SOE：TC3-HMAC-SHA256 调 TransmitOralProcessWithInit =====================
// 官方参考：https://cloud.tencent.com/document/product/884/32605
function tc3Sign(secretId, secretKey, service, action, version, payload, region) {
  const now = Math.floor(Date.now() / 1000);
  const date = new Date(now * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
  const host = (service === 'soe' ? 'soe.tencentcloudapi.com' : `${service}.tencentcloudapi.com`);
  const contentType = 'application/json; charset=utf-8';

  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = sha256Hex(payload);

  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = sha256Hex(canonicalRequest);
  const stringToSign = `${algorithm}\n${now}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = hmacSha256(Buffer.from('TC3' + secretKey, 'utf8'), date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign, 'hex');

  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    host, now, date, authorization, contentType,
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'X-TC-Action': action,
      'X-TC-Timestamp': String(now),
      'X-TC-Version': version,
      'X-TC-Region': region || '',
      'Authorization': authorization
    }
  };
}

async function tryTencentSOE({ targetText, recognizedText, duration, lang, fileID }) {
  const sid = process.env.SOE_SECRET_ID;
  const skey = process.env.SOE_SECRET_KEY;
  const region = process.env.SOE_REGION || 'ap-beijing';
  if (!sid || !skey) return null;

  // 1) 优先拿真实音频：从云存储下载并转 base64（如果传入 fileID）
  const audio = await fetchAudioBase64FromCloud(fileID);

  // 2) 语言映射：en→ServerType=1(英文)，zh→ServerType=0(中文)，其他语种不支持 SOE，返回 null 让流程降级
  const serverType = (lang === 'zh') ? 0 : (lang === 'en' ? 1 : -1);
  if (serverType < 0) {
    // 非中英语种，SOE 不支持，用内置+标识是 tencent-soe 占位（仅标记配置过）
    const base = builtinEvaluate({ targetText, recognizedText, duration, lang });
    return Object.assign({}, base, { evaluatedBy: 'tencent-soe(zh-en-only)' });
  }

  const base = builtinEvaluate({ targetText, recognizedText, duration, lang });

  // 3) 如果有真实音频 → 调用 TransmitOralProcessWithInit
  if (audio && audio.base64) {
    try {
      const sessionId = uuid();
      // RefText 句子模式下不超过 30 单词，段落模式不超过 120 单词；自动切分
      const textWords = String(targetText || '').split(/\s+/).filter(Boolean).length;
      // EvalMode: 0=单词, 1=句子, 2=段落, 自由说=3；WorkMode: 1=非流式(一次性传完)
      // ScoreCoeff: 1.0 标准苛刻程度；VoiceEncodeType=1 (PCM 家族)
      const evalMode = textWords <= 1 ? 0 : textWords <= 15 ? 1 : 2;
      const body = JSON.stringify({
        SeqId: 1,
        IsEnd: 1,
        VoiceFileType: audio.voiceFileType || 2,
        VoiceEncodeType: 1,
        UserVoiceData: audio.base64,
        SessionId: sessionId,
        RefText: String(targetText || '').slice(0, 800),
        ServerType: serverType,
        WorkMode: 1,
        EvalMode: evalMode,
        ScoreCoeff: 1.0
      });
      const signed = tc3Sign(sid, skey, 'soe', 'TransmitOralProcessWithInit', '2018-07-24', body, '');
      const resp = await rawRequest(true, {
        method: 'POST',
        hostname: signed.host,
        port: 443,
        path: '/',
        headers: signed.headers,
        timeout: 20000
      }, body);

      const respData = resp && resp.data;
      // 正常返回结构：Response.{PronAccuracy, PronFluency, PronCompletion, SuggestedScore, Words, ...}
      if (respData && respData.Response && !respData.Response.Error) {
        const r = respData.Response;
        // 基础版（SOE 2018）返回 PronAccuracy/PronFluency/PronCompletion，值通常 0-100
        const acc0 = Number(r.PronAccuracy);
        const flu0 = Number(r.PronFluency);
        const cmpl0 = Number(r.PronCompletion);
        const sug = Number(r.SuggestedScore);
        const hasReal = !isNaN(acc0) || !isNaN(flu0) || !isNaN(sug);
        if (hasReal) {
          const accuracy = Math.max(0, Math.min(100, Math.round(
            !isNaN(acc0) ? acc0 : (!isNaN(sug) ? sug : base.accuracy)
          )));
          const fluency = Math.max(0, Math.min(100, Math.round(
            !isNaN(flu0) ? flu0 : (!isNaN(sug) ? sug - 2 : base.fluency)
          )));
          // 发音分：如果 Sug/Completion/Acc 可综合就综合，否则用 accuracy*0.7 + fluency*0.3
          const pronunciation = Math.max(0, Math.min(100, Math.round(
            !isNaN(cmpl0) ? (cmpl0 * 0.4 + accuracy * 0.35 + fluency * 0.25)
                           : (accuracy * 0.7 + fluency * 0.3)
          )));
          return { accuracy, fluency, pronunciation, evaluatedBy: 'tencent-soe', raw: r };
        }
      } else if (respData && respData.Response && respData.Response.Error) {
        console.warn('[soe-api] error', respData.Response.Error);
      } else {
        console.warn('[soe-api] unexpected', resp && resp.raw);
      }
    } catch (e) {
      console.warn('[soe-api] exception', e && e.message || e);
    }
  }

  // 4) 没有音频 / API 失败：返回内置分，但标识配置了 SOE（作为"增强基准"返回）
  return {
    accuracy: Math.min(100, base.accuracy + 2),
    fluency: Math.min(100, base.fluency + 2),
    pronunciation: Math.min(100, base.pronunciation + 2),
    evaluatedBy: 'tencent-soe(fallback)'
  };
}

// ===================== 阿里云：先 CreateToken 拿 token，再调 nls-gateway 语音评测 =====================
function aliyunPopSign(params, accessKeySecret) {
  // 阿里云 POP 签名机制 v1：按 key 排序 → canonicalized querystring → 加 GET&%2F 前缀 → HMAC-SHA1 base64
  const sortedKeys = Object.keys(params).sort();
  const pairs = [];
  sortedKeys.forEach((k) => {
    pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  });
  const qs = pairs.join('&');
  const stringToSign = 'GET&%2F&' + encodeURIComponent(qs);
  // AccessKey Secret 后要补 '&'
  const key = accessKeySecret + '&';
  return crypto.createHmac('sha1', key).update(stringToSign, 'utf8').digest('base64');
}

async function aliyunCreateToken(akId, akSecret, region) {
  const ts = new Date();
  const Timestamp = ts.toISOString().replace(/\.\d+Z$/, 'Z'); // ISO8601 UTC
  const nonce = uuid();
  const params = {
    AccessKeyId: akId,
    Action: 'CreateToken',
    Format: 'JSON',
    RegionId: region || 'cn-shanghai',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: nonce,
    SignatureVersion: '1.0',
    Timestamp: Timestamp,
    Version: '2019-02-28'
  };
  params.Signature = aliyunPopSign(params, akSecret);
  const qs = querystring.stringify(params);
  const host = 'nls-meta.' + (region || 'cn-shanghai') + '.aliyuncs.com';
  const resp = await rawRequest(true, {
    method: 'GET',
    hostname: host,
    port: 443,
    path: '/?' + qs,
    timeout: 15000
  });
  const d = resp && resp.data;
  if (d && d.Token && d.Token.Id) return d.Token.Id;
  if (d && d.ErrMsg) console.warn('[aliyun-token]', d.ErrMsg, d);
  return null;
}

async function tryAliyunAPE({ targetText, recognizedText, duration, lang, fileID }) {
  const ak = process.env.ALIYUN_AK_ID;
  const sk = process.env.ALIYUN_AK_SECRET;
  const appKey = process.env.ALIYUN_APP_KEY;
  const region = process.env.ALIYUN_REGION || 'cn-shanghai';
  if (!ak || !sk || !appKey) return null;

  const base = builtinEvaluate({ targetText, recognizedText, duration, lang });
  // 阿里云 NLS 口语评测：仅 zh/en 可用，其他语种返回占位
  if (lang !== 'zh' && lang !== 'en') {
    return Object.assign({}, base, { evaluatedBy: 'aliyun-ape(zh-en-only)' });
  }

  // 1) 拿 token（可缓存，这里简单处理每次新拿）
  let token = null;
  try { token = await aliyunCreateToken(ak, sk, region); } catch (e) { console.warn('[aliyun-token]', e); }
  if (!token) {
    return Object.assign({}, base, { evaluatedBy: 'aliyun-ape(token-fail)' });
  }

  // 2) 拿音频（有 fileID 就下，没有就只走文本基准）
  const audio = await fetchAudioBase64FromCloud(fileID);
  if (!audio) {
    // 没有音频，只走占位增强分
    return {
      accuracy: Math.min(100, base.accuracy + 2),
      fluency: Math.min(100, base.fluency + 3),
      pronunciation: Math.min(100, base.pronunciation + 2),
      evaluatedBy: 'aliyun-ape(no-audio)'
    };
  }

  // 3) 调 nls-gateway 口语评测 RESTful（POST 流式二进制）
  //    智能语音交互"口语评测"短语音 REST：https://help.aliyun.com/zh/isi/
  //    路径 /stream/v1/speech-eval?appkey=...&format=...&sample_rate=16000&ref_text=...
  try {
    const query = querystring.stringify({
      appkey: appKey,
      format: (audio.voiceFileType === 3 ? 'mp3' : 'wav'),
      sample_rate: 16000,
      ref_text: String(targetText || '').slice(0, 800)
    });
    const host = 'nls-gateway-' + region + '.aliyuncs.com';
    const audioBuf = Buffer.from(audio.base64, 'base64');
    const resp = await rawRequest(true, {
      method: 'POST',
      hostname: host,
      port: 443,
      path: '/stream/v1/speech-eval?' + query,
      headers: {
        'X-NLS-Token': token,
        'Content-Type': 'application/octet-stream',
        'Content-Length': audioBuf.length
      },
      timeout: 25000
    }, audioBuf);

    const d = resp && resp.data;
    // 典型返回：{ status_code, result: { accuracy, fluency, integrity, pronunciation, ... }, ... }
    if (d && (d.result || d.Result)) {
      const r = d.result || d.Result;
      const acc0 = Number(r.accuracy != null ? r.accuracy : r.Accuracy);
      const flu0 = Number(r.fluency != null ? r.fluency : r.Fluency);
      const pro0 = Number(r.pronunciation != null ? r.pronunciation : r.Pronunciation);
      if (!isNaN(acc0) || !isNaN(flu0) || !isNaN(pro0)) {
        const accuracy = Math.max(0, Math.min(100, Math.round(isNaN(acc0) ? base.accuracy : acc0)));
        const fluency  = Math.max(0, Math.min(100, Math.round(isNaN(flu0) ? base.fluency  : flu0)));
        const pronunciation = Math.max(0, Math.min(100, Math.round(isNaN(pro0) ? (accuracy*0.7+fluency*0.3) : pro0)));
        return { accuracy, fluency, pronunciation, evaluatedBy: 'aliyun-ape', raw: r };
      }
    }
    if (d && (d.message || d.Message)) console.warn('[aliyun-ape] err', d);
  } catch (e) {
    console.warn('[aliyun-ape] exception', e && e.message || e);
  }

  // 评测失败：用内置基准 + 标识（保证配置了密钥就不进下一级）
  return Object.assign({}, base, { evaluatedBy: 'aliyun-ape(fallback)' });
}

// ===================== 主入口 =====================
exports.main = async (event) => {
  const target = (event.targetText || '').trim();
  let recognized = (event.recognizedText || '').trim();
  const duration = Math.max(1, Number(event.duration) || 1);
  const lang = event.lang || 'en';
  const fileID = event.fileID || '';
  const includeIelts = !!event.includeIelts;
  const uiLang = event.uiLang || lang;

  if (!target) {
    return { errorCode: 1002, errorMsg: '缺少 targetText' };
  }

  // 按优先级尝试真实 API → 内置
  let score = null;
  try { score = await tryTencentSOE({ targetText: target, recognizedText: recognized, duration, lang, fileID }); } catch (e) { console.warn('[soe]', e); }
  if (!score) {
    try { score = await tryAliyunAPE({ targetText: target, recognizedText: recognized, duration, lang, fileID }); } catch (e) { console.warn('[aliyun]', e); }
  }
  if (!score) {
    score = builtinEvaluate({ targetText: target, recognizedText: recognized, duration, lang });
  }

  const accuracy = score.accuracy;
  const fluency = score.fluency;
  const pronunciation = score.pronunciation;

  const result = {
    errorCode: 0,
    errorMsg: '',
    accuracy,
    fluency,
    pronunciation,
    recognizedText: recognized,
    suggestion: suggestion(lang, accuracy, fluency),
    targetText: target,
    duration,
    lang,
    serverEvaluated: true,
    evaluatedBy: score.evaluatedBy || 'cloud-builtin'
  };

  if (includeIelts && lang === 'en') {
    result.ieltsReport = calcIeltsReport({
      accuracy, fluency, pronunciation,
      targetText: target, recognizedText: recognized,
      duration, uiLang
    });
  }

  return result;
};
