// cloudfunctions/evaluateSpeech/index.js
// 真实语音评分（非随机）
// 输入：targetText(目标句), recognizedText(同声传译插件识别结果), duration(录音秒数), lang(内容语言)
// 算法：
//   accuracy      = 1 - Levenshtein(target, recognized) / maxLen
//   fluency       = 基于文本长度和该语言基准语速打分，偏离基准越远分越低
//   pronunciation = accuracy * 0.7 + fluency * 0.3
// 前端已在 api.js 中实现了本地降级（WechatSI 插件不可用时基于时长估算），
// 此云函数进一步保证在服务端有一套稳定的评分逻辑，便于升级。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const FLUENCY_BENCHMARK = {
  zh: 240, en: 150, ja: 220, ko: 220, fr: 160
};

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
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[m][n];
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

exports.main = async (event) => {
  const target = (event.targetText || '').trim();
  let recognized = (event.recognizedText || '').trim();
  const duration = Math.max(1, Number(event.duration) || 1);
  const lang = event.lang || 'en';

  if (!target) {
    return { errorCode: 1002, errorMsg: '缺少 targetText' };
  }

  const targetLen = target.length;
  const bench = FLUENCY_BENCHMARK[lang] || FLUENCY_BENCHMARK.en;
  const expectedSeconds = Math.max(1, (targetLen / bench) * 60);

  // 如果前端没给识别文本，先退化成"只按流利度+时长打分"，但仍稳定非随机
  const recLen = recognized.length;
  const maxLen = Math.max(targetLen, recLen, 1);

  // accuracy
  let accuracy;
  if (recognized) {
    const d = levenshtein(recognized, target);
    accuracy = Math.max(0, Math.round(100 - d / maxLen * 100));
  } else {
    // 无识别文本时，按时长偏离度估算（稳定，不是随机）
    const ratio = Math.min(duration, expectedSeconds * 2) / expectedSeconds;
    accuracy = Math.max(0, Math.round(100 - Math.abs(1 - Math.min(ratio, 2)) * 120));
  }

  // fluency：偏离 0.8~1.3 倍基准时扣分
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

  return {
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
    serverEvaluated: true
  };
};
