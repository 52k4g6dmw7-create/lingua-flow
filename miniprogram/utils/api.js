// miniprogram/utils/api.js
// 业务接口层 - 封装所有业务方法，供页面调用

const cloud = require('./cloud.js');
const i18n = require('./i18n.js');
const CONFIG = require('../config.js');

// ====================== 登录 & 用户 ======================

/**
 * 微信登录：取 wx.login code -> 云函数login换openid -> 云函数syncUser初始化用户
 * 返回: { success, user, openid }
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (wxRes) => {
        if (!wxRes.code) {
          reject(new Error('wx.login no code'));
          return;
        }
        try {
          const { result, _fallback } = await cloud.call('login', { code: wxRes.code }, {
            showErrorToast: false,
            fallback: { openid: 'local_' + Math.random().toString(36).slice(2, 10) }
          });
          const openid = (result && result.openid) || 'local_openid';

          // 同步用户
          const userRes = await cloud.call('syncUser', {
            action: 'init',
            loginCode: wxRes.code,
            lang: i18n.getLang()
          }, {
            showErrorToast: false,
            fallback: {
              _id: 'local_user',
              openid: openid,
              nickName: '',
              avatarUrl: '',
              phone: '',
              lang: i18n.getLang(),
              createdAt: Date.now(),
              lastActiveAt: Date.now()
            }
          });
          resolve({
            success: true,
            openid: openid,
            user: (userRes && userRes.result) || null,
            _fallback: _fallback
          });
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => reject(err)
    });
  });
}

/**
 * 更新用户资料：头像、昵称、手机号
 * 传入：{ nickName, avatarUrl, phone } （部分传）
 */
function updateUser(patch) {
  return cloud.call('syncUser', {
    action: 'update',
    patch: patch || {}
  }, {
    loading: true,
    loadingText: i18n.t('common.loading'),
    fallback: Object.assign({ _id: 'local_user' }, patch || {})
  }).then(res => res.result);
}

/**
 * 获取手机号（必须：button open-type="getPhoneNumber" 的 code）
 */
function bindPhoneNumber(code) {
  if (!code) return Promise.reject(new Error('no phone code'));
  return cloud.call('getPhone', { code: code }, {
    loading: true,
    loadingText: '授权中...',
    fallback: { phone: '138****0000', _mock: true }
  }).then(res => res.result);
}

/**
 * 取当前登录的 openid：直接读云函数 login（短平快）
 */
function getOpenid() {
  return cloud.call('login', {}, {
    showErrorToast: false,
    fallback: { openid: wx.getStorageSync('ls_openid') || '' }
  }).then(res => (res.result && res.result.openid) || '');
}

// ====================== 进度 ======================

function getProgress() {
  return cloud.call('syncProgress', { action: 'get' }, {
    showErrorToast: false,
    fallback: getLocalProgress()
  }).then(res => res.result || getLocalProgress());
}

function updateProgress(patch) {
  return cloud.call('syncProgress', { action: 'set', patch: patch || {} }, {
    loading: true,
    fallback: Object.assign(getLocalProgress(), patch || {})
  }).then(res => res.result);
}

// 本地进度兜底（云未配置时）
function getLocalProgress() {
  try {
    return wx.getStorageSync('linguaspeak_progress') || {
      consecutiveDays: 0,
      totalDays: 0,
      totalMinutes: 0,
      currentWeek: 1,
      currentDayOfWeek: 1,
      masteringSkills: [{ id: 1, nameKey: 'conclusionFirst', progress: 15, status: 'start' }],
      lastActiveDate: null
    };
  } catch (e) {
    return {};
  }
}

// ====================== 录音 + 评分 ======================

/**
 * 上传录音到云存储并写 records 集合
 */
function uploadRecord(localPath, opts) {
  opts = opts || {};
  return getOpenid().then((openid) => {
    const cloudPath = cloud.buildCloudPath('records', openid, opts.filename || 'record.mp3');
    return cloud.upload(localPath, cloudPath, {
      loading: true,
      loadingText: '上传录音...'
    }).then((uploadRes) => {
      const fileID = uploadRes.fileID;
      // 同时调用uploadRecord云函数写数据库
      return cloud.call('uploadRecord', {
        fileID: fileID,
        duration: opts.duration || 0,
        targetText: opts.targetText || '',
        contentLang: opts.contentLang || i18n.getLang(),
        sentenceId: opts.sentenceId || null,
        planKey: opts.planKey || ''
      }, {
        showErrorToast: false,
        fallback: {
          fileID: fileID,
          recordId: 'local_' + Date.now()
        }
      }).then(res => {
        return {
          fileID: fileID,
          tempUrl: uploadRes.tempFilePath,
          recordId: (res.result && res.result.recordId) || null
        };
      });
    });
  });
}

/**
 * 语音评测：传入识别文本 + 目标文本 + 录音秒数 + 语言
 * 若 includeIelts=true 且 lang=en，云函数会额外返回 ieltsReport（Band+四维度+提分建议）
 */
function evaluateSpeech(opts) {
  opts = opts || {};
  const includeIelts = !!opts.includeIelts;
  const uiLang = opts.uiLang || i18n.getLang();
  return cloud.call('evaluateSpeech', {
    fileID: opts.fileID || '',
    targetText: opts.targetText || '',
    recognizedText: opts.recognizedText || '', // 前端用同声传译插件已识别的结果
    duration: opts.duration || 0,
    lang: opts.lang || 'en',
    includeIelts,
    uiLang
  }, {
    loading: true,
    loadingText: includeIelts ? 'IELTS Scoring...' : 'Analyzing...',
    // 本地降级：如果云不可用，仍保证稳定非随机评分
    fallback: evaluateFallback(Object.assign({}, opts, { includeIelts, uiLang }))
  }).then(res => res.result);
}

// 本地降级评分算法（**稳定非随机**，基于 Levenshtein 文本编辑距离 + 语速基准）
// 与云函数 evaluateSpeech 的 builtinEvaluate 算法保持一致，保证离线也可复现。
function evaluateFallback(opts) {
  const target = (opts.targetText || '').trim();
  const recText = (opts.recognizedText || '').trim();
  const duration = Math.max(1, Number(opts.duration) || 1);
  const lang = opts.lang || 'en';
  const targetLen = target.length;
  if (targetLen === 0) return { accuracy: 60, fluency: 60, pronunciation: 60, suggestion: '', recognizedText: recText, _fallback: true, evaluatedBy: 'local-fallback' };

  const bench = CONFIG.FLUENCY_BENCHMARK[lang] || CONFIG.FLUENCY_BENCHMARK.en;
  const expectedSeconds = Math.max(1, (targetLen / bench) * 60);

  // accuracy: 有识别文本用 Levenshtein，否则基于时长估算（稳定公式）
  let accuracy;
  if (recText) {
    const recLen = recText.length;
    const d = levenshtein(recText, target);
    const maxLen = Math.max(targetLen, recLen, 1);
    accuracy = Math.max(0, Math.round(100 - d / maxLen * 100));
  } else {
    const ratio = Math.min(duration, expectedSeconds * 2) / expectedSeconds;
    accuracy = Math.max(0, Math.round(100 - Math.abs(1 - Math.min(ratio, 2)) * 120));
  }

  // fluency：偏离 0.8~1.3 倍基准扣分，无随机性
  const ratio = Math.min(duration, expectedSeconds * 3) / expectedSeconds;
  let fluency;
  if (ratio >= 0.8 && ratio <= 1.3) {
    fluency = 92 - Math.round(Math.abs(1 - ratio) * 20);
  } else if (ratio >= 0.5 && ratio <= 1.8) {
    fluency = 75 - Math.round(Math.abs(1 - ratio) * 40);
  } else {
    fluency = Math.max(40, Math.round(60 - Math.abs(1 - ratio) * 50));
  }
  fluency = Math.max(30, Math.min(100, fluency));

  const pronunciation = Math.max(30, Math.min(100, Math.round(accuracy * 0.7 + fluency * 0.3)));

  // suggestion 多语言（稳定提示，无随机）
  const langCode = opts.uiLang || i18n.getLang();
  const suggestionMap = {
    zh: [
      accuracy >= 85 ? '发音准确，继续保持。' : accuracy >= 65 ? '发音整体不错，注意重音与细节。' : '建议放慢语速，逐字读准后再提速。',
      fluency >= 85 ? '流利度很好，节奏自然。' : fluency >= 65 ? '流利度尚可，保持稳定节奏即可。' : '流利度需要加强，多读几遍，配合录音回放纠正。',
      '坚持每日训练会稳步提升。'
    ],
    en: [
      accuracy >= 85 ? 'Excellent pronunciation accuracy!' : accuracy >= 65 ? 'Good overall - watch the stress syllables.' : 'Slow down and articulate each word first.',
      fluency >= 85 ? 'Your fluency is impressive, natural rhythm.' : fluency >= 65 ? 'Aim for a more consistent pace.' : 'Fluency needs work - repeat the sentence more and replay.',
      'Daily practice will bring steady improvement.'
    ],
    ja: [
      accuracy >= 85 ? '発音の正確性が素晴らしいです！' : accuracy >= 65 ? '全体的に良好。アクセントの細部を意識しましょう。' : 'ゆっくり、一つ一つはっきり読みましょう。',
      fluency >= 85 ? '流暢さが非常に良く、リズムも自然です。' : fluency >= 65 ? 'もう少し一定のリズムを意識するとより良いです。' : '流暢さを改善するには、繰り返し再生して修正しましょう。',
      '毎日続けると確実に上達します。'
    ],
    ko: [
      accuracy >= 85 ? '발음 정확도가 매우 좋습니다!' : accuracy >= 65 ? '전반적으로 양호하며 세부 소리에 집중하세요.' : '천천히 또렷하게 읽으세요.',
      fluency >= 85 ? '유창성이 훌륭하며 리듬이 자연스러워요.' : fluency >= 65 ? '일정한 리듬을 유지하세요.' : '유창성을 높이려면 여러 번 반복하고 재생해 교정하세요.',
      '매일 훈련하면 꾸준히 향상됩니다.'
    ],
    fr: [
      accuracy >= 85 ? 'Excellent précision de prononciation !' : accuracy >= 65 ? 'Bon niveau global, soignez les détails.' : 'Ralentissez et articulez chaque mot.',
      fluency >= 85 ? 'Votre fluidité est remarquable, rythme naturel.' : fluency >= 65 ? 'Visez un rythme plus régulier.' : 'Pour la fluidité, répétez la phrase plus souvent et réécoutez.',
      'Un entraînement quotidien apportera des progrès constants.'
    ]
  };
  const list = suggestionMap[langCode] || suggestionMap.en;
  const suggestion = list.join(' ');

  const result = {
    accuracy: accuracy,
    fluency: fluency,
    pronunciation: pronunciation,
    suggestion: suggestion,
    recognizedText: recText,
    _fallback: true,
    evaluatedBy: 'local-fallback',
    serverEvaluated: false
  };

  // 如果 includeIelts 且 lang=en，本地也计算雅思报告（稳定公式，前端兜底）
  if (opts.includeIelts && lang === 'en') {
    result.ieltsReport = localCalcIeltsReport({
      accuracy, fluency, pronunciation,
      targetText: target, recognizedText: recText,
      duration, uiLang: langCode
    });
  }

  return result;
}

// 本地版雅思四维度报告（与云函数 calcIeltsReport 算法一致，保证一致性）
function localCalcIeltsReport({ accuracy, fluency, pronunciation, targetText, recognizedText, duration, uiLang }) {
  const lang = uiLang || 'en';
  const avg = Math.round(0.45 * pronunciation + 0.30 * fluency + 0.25 * accuracy);
  const levels = [
    { band: '4.5-5.0', threshold: 0,   color: '#27ae60', key: 'ielts_4_5',
      title_zh: '基础级 · 可进行简单日常问答', title_en: 'Foundation. Simple Q&A on daily topics.' },
    { band: '5.5-6.0', threshold: 60,  color: '#2980b9', key: 'ielts_5_5',
      title_zh: '进阶级 · 可扩展回答并有基本逻辑', title_en: 'Intermediate. Extended answers with basic logic.' },
    { band: '6.5-7.0', threshold: 75,  color: '#8e44ad', key: 'ielts_6_5',
      title_zh: '高分级 · 表达自然，能进行抽象讨论', title_en: 'Competent. Natural speech & abstract discussion.' },
    { band: '7.5-8.0', threshold: 88,  color: '#c0392b', key: 'ielts_7_5',
      title_zh: '冲刺级 · 地道表达 + 强论证 + 微瑕不影响理解', title_en: 'Advanced. Idiomatic, coherent & near-native fluency.' },
    { band: '8.5+',    threshold: 96,  color: '#2c3e50', key: 'ielts_7_5',
      title_zh: '准母语级 · 考官级表现，几乎无任何错误', title_en: 'Expert. Examiner-level. Virtually no errors.' }
  ];
  let chosen = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (avg >= levels[i].threshold) { chosen = levels[i]; break; }
  }
  const chars = String(targetText || '').length;
  const seconds = Math.max(duration || 1, 1);
  const cpm = Math.round(chars / seconds * 60);
  const speedBonus = cpm >= 130 ? 12 : cpm >= 100 ? 6 : cpm >= 70 ? 0 : -6;
  const fScore = Math.max(30, Math.min(100, Math.round(0.75 * fluency + 0.15 * accuracy + speedBonus)));
  const words = String(targetText || '').split(/\s+/).filter(Boolean);
  const avgWordLen = words.length
    ? (String(targetText || '').replace(/[^a-zA-Z]/g, '').length / words.length) : 3.5;
  const lexRichness = Math.min(16, Math.max(0, Math.round((avgWordLen - 3.5) * 10)));
  const lScore = Math.max(30, Math.min(100, Math.round(0.55 * accuracy + 0.25 * pronunciation + 20 + lexRichness)));
  const advancedMarkers = /(however|therefore|furthermore|nevertheless|although|because|which|who|whose|that|where|when|consequently|moreover|in addition|by contrast|admittedly|that being said)/gi;
  const markerCount = (String(targetText || '').match(advancedMarkers) || []).length;
  const gramBonus = Math.min(18, markerCount * 5);
  const gScore = Math.max(30, Math.min(100, Math.round(0.5 * accuracy + 0.3 * fluency + 15 + gramBonus)));
  const pScore = Math.max(30, Math.min(100, Math.round(pronunciation)));
  const levelOf = (s) => s >= 88 ? '(Band 7-8)' : s >= 75 ? '(Band 6-7)' : s >= 60 ? '(Band 5-6)' : '(Band 4-5)';

  return {
    bandLabel: chosen.band,
    bandTitle: lang === 'zh' ? chosen.title_zh : chosen.title_en,
    bandColor: chosen.color,
    bandKey: chosen.key,
    avgScore: avg,
    fluencyScore: fScore, lexicalScore: lScore, grammarScore: gScore, pronunciationScore: pScore,
    fluencyLevel: levelOf(fScore), lexicalLevel: levelOf(lScore),
    grammarLevel: levelOf(gScore), pronunciationLevel: levelOf(pScore),
    nextStepText: lang === 'zh'
      ? `【本地降级模式】建议开通云开发环境获取更稳定的雅思报告。最弱项：${
          fScore <= Math.min(lScore, gScore, pScore) ? '流利性'
            : lScore <= Math.min(gScore, pScore) ? '词汇多样性'
            : gScore <= pScore ? '语法范围与准确性' : '发音'
        }。坚持每日训练可稳步提升。`
      : `[Local fallback] Enable Cloud Base for a richer IELTS report. Weakest: ${
          fScore <= Math.min(lScore, gScore, pScore) ? 'Fluency'
            : lScore <= Math.min(gScore, pScore) ? 'Lexical Resource'
            : gScore <= pScore ? 'Grammar' : 'Pronunciation'
        }. Keep practicing daily.`
  };
}

// Levenshtein 编辑距离
function levenshtein(a, b) {
  a = a || ''; b = b || '';
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = [i]; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + cost
      );
    }
  }
  return dp[m][n];
}

// ====================== 上传内容 ======================

/**
 * 上传文本（直接创建内容）
 */
function createTextContent(opts) {
  opts = opts || {};
  return cloud.call('uploadContent', {
    type: 'text',
    text: opts.text || '',
    lang: opts.lang || 'en'
  }, {
    loading: true,
    loadingText: i18n.t('common.loading'),
    fallback: {
      contentId: 'local_' + Date.now(),
      sentences: splitSentencesLocal(opts.text || '', opts.lang),
      lang: opts.lang
    }
  }).then(res => res.result);
}

/**
 * 上传并解析文件
 * @param fileID 云存储 fileID
 * @param lang 目标语言
 */
function parseFileContent(fileID, lang) {
  return cloud.call('uploadContent', {
    type: 'file',
    fileID: fileID,
    lang: lang || 'en'
  }, {
    loading: true,
    loadingText: '解析文件...',
    fallback: {
      contentId: 'local_' + Date.now(),
      sentences: ['Content uploaded (fallback parsed locally).', 'Please start reading.'],
      lang: lang
    }
  }).then(res => res.result);
}

function listContentHistory() {
  return cloud.call('uploadContent', { action: 'history' }, {
    showErrorToast: false,
    fallback: []
  }).then(res => res.result || []);
}

function splitSentencesLocal(text, lang) {
  if (!text) return [];
  const re = lang === 'zh' || lang === 'ja' || lang === 'ko'
    ? /[\n。！？!?；;]/
    : /[\n.!?;]+/;
  const arr = text.split(re).map(s => s.trim()).filter(s => s.length > 0);
  return arr.length ? arr.slice(0, 15) : [text];
}

// ====================== 课程 ======================

function listCourses(opts) {
  opts = opts || {};
  return cloud.call('listCourses', {
    lang: opts.lang || i18n.getLang(),
    category: opts.category || 'all',
    type: opts.type || 'recommended', // recommended / hot / new
    limit: opts.limit || 10,
    skip: opts.skip || 0
  }, {
    loading: !!opts.loading,
    showErrorToast: false,
    fallback: opts.fallback || { list: [], hasMore: false, total: 0 }
  }).then(res => res.result || { list: [], hasMore: false, total: 0 });
}

// ====================== 同声传译插件 ======================

/**
 * 获取同声传译录音识别管理器
 * 页面 onLoad 里调用，监听 onRecognize 事件拿到实时识别文字
 */
function getWechatSIRecognizer() {
  try {
    if (!CONFIG.FEATURES.ENABLE_SPEECH_EVAL) return null;
    const plugin = requirePlugin && requirePlugin('WechatSI');
    if (!plugin || !plugin.getRecordRecognitionManager) return null;
    const manager = plugin.getRecordRecognitionManager();
    return manager;
  } catch (e) {
    console.warn('[WechatSI] 插件不可用:', e && e.errMsg);
    return null;
  }
}

// ====================== 会员系统 ======================

/**
 * 检查免费/会员状态
 */
function checkVipStatus() {
  const freeMinutes = CONFIG.VIP && CONFIG.VIP.FREE_TRIAL_MINUTES ? CONFIG.VIP.FREE_TRIAL_MINUTES : 60;
  return cloud.call('checkVipStatus', { action: 'check', freeMinutes }, {
    showErrorToast: false,
    fallback: {
      canUseCore: true,
      _fallback: true,
      freeTrial: { active: true, remainingMinutes: freeMinutes, remainingSeconds: 0, remainingMs: freeMinutes * 60000 },
      vip: { active: false, planKey: null, isForever: false, daysLeft: 0 },
      _ui: { needUpgrade: false, freeAlmostGone: false, expiredVip: false }
    }
  }).then(res => res.result || {});
}

/**
 * 激活码兑换
 */
function redeemActivationCode(code) {
  return cloud.call('activateKey', { action: 'redeem', code }, {
    loading: true,
    loadingText: '兑换中...',
    fallback: { redeemed: false, errorCode: 9999, errorMsg: '云环境未配置，无法兑换激活码', _fallback: true }
  }).then(res => res.result || {});
}

/**
 * 管理端批量生成激活码（需要 adminKey）
 */
function generateActivationCodes(opts) {
  opts = opts || {};
  return cloud.call('activateKey', {
    action: 'generate',
    planKey: opts.planKey,
    count: opts.count || 1,
    batch: opts.batch,
    remark: opts.remark,
    price: opts.price,
    adminKey: opts.adminKey || ''
  }, {
    loading: true,
    loadingText: '生成中...',
    fallback: { generated: 0, list: [], _fallback: true }
  }).then(res => res.result || {});
}

/**
 * 创建支付订单（企业号开通虚拟支付后可用）
 */
function createVipOrder(planKey) {
  const payEnv = (CONFIG.VIP && Number(CONFIG.VIP.WX_PAY_ENV)) || 0;
  let outProductId = '';
  if (CONFIG.VIP && CONFIG.VIP.WX_PAY_PRODUCT_IDS) {
    outProductId = CONFIG.VIP.WX_PAY_PRODUCT_IDS[planKey] || '';
  }
  return cloud.call('createOrder', {
    action: 'create',
    planKey: planKey,
    payEnv: payEnv,
    outProductId: outProductId
  }, {
    loading: true,
    loadingText: '创建订单中...',
    fallback: {
      errorCode: 9999,
      errorMsg: '云环境未配置，无法创建订单',
      fallbackHint: '您仍可使用【激活码】通道开通会员',
      _fallback: true
    }
  }).then(res => res.result || {});
}

/**
 * 支付成功后验单并开通会员
 */
function verifyVipOrder(outTradeNo) {
  const payEnv = (CONFIG.VIP && Number(CONFIG.VIP.WX_PAY_ENV)) || 0;
  return cloud.call('createOrder', {
    action: 'verify',
    outTradeNo: outTradeNo,
    payEnv: payEnv
  }, {
    loading: true,
    loadingText: '开通中...',
    fallback: { vipGranted: false, _fallback: true }
  }).then(res => res.result || {});
}

/**
 * Mock 开通会员（本地调试用；线上 VIP_DISABLE_MOCK=1 会被拒）
 */
function mockOpenVip(planKey) {
  return cloud.call('createOrder', { action: 'mock_success', planKey }, {
    loading: true,
    loadingText: '模拟开通中...',
    fallback: { vipGranted: false, _fallback: true }
  }).then(res => res.result || {});
}

module.exports = {
  // 用户
  login: login,
  updateUser: updateUser,
  bindPhoneNumber: bindPhoneNumber,
  getOpenid: getOpenid,
  // 进度
  getProgress: getProgress,
  updateProgress: updateProgress,
  // 录音评分
  uploadRecord: uploadRecord,
  evaluateSpeech: evaluateSpeech,
  evaluateFallback: evaluateFallback,
  levenshtein: levenshtein,
  // 内容
  createTextContent: createTextContent,
  parseFileContent: parseFileContent,
  listContentHistory: listContentHistory,
  // 课程
  listCourses: listCourses,
  // 插件
  getWechatSIRecognizer: getWechatSIRecognizer,
  // 会员
  checkVipStatus: checkVipStatus,
  redeemActivationCode: redeemActivationCode,
  generateActivationCodes: generateActivationCodes,
  createVipOrder: createVipOrder,
  verifyVipOrder: verifyVipOrder,
  mockOpenVip: mockOpenVip
};
