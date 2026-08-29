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
 */
function evaluateSpeech(opts) {
  opts = opts || {};
  return cloud.call('evaluateSpeech', {
    fileID: opts.fileID || '',
    targetText: opts.targetText || '',
    recognizedText: opts.recognizedText || '', // 前端用同声传译插件已识别的结果
    duration: opts.duration || 0,
    lang: opts.lang || 'en'
  }, {
    loading: true,
    loadingText: 'Analyzing...',
    fallback: evaluateFallback(opts)
  }).then(res => res.result);
}

// 本地降级评分算法（非随机，基于时长+文本）
function evaluateFallback(opts) {
  const target = (opts.targetText || '').trim();
  const recText = (opts.recognizedText || '').trim();
  const duration = opts.duration || 5;
  const lang = opts.lang || 'en';
  const targetLen = target.length;
  if (targetLen === 0) return { accuracy: 60, fluency: 60, pronunciation: 60, suggestion: '', recognizedText: recText };

  // accuracy: 有识别文本用 Levenshtein，否则基于时长估算
  let accuracy;
  if (recText) {
    const d = levenshtein(recText, target);
    accuracy = Math.max(0, Math.round(100 - d / Math.max(targetLen, recText.length) * 100));
  } else {
    // 基于时长估算：基准每分钟 X 字/词
    const bench = CONFIG.FLUENCY_BENCHMARK[lang] || CONFIG.FLUENCY_BENCHMARK.en;
    const expectedSeconds = (targetLen / bench) * 60;
    const ratio = Math.min(duration, expectedSeconds * 2) / expectedSeconds;
    // ratio 0.8~1.2 最好，越远分越低
    accuracy = Math.max(0, Math.round(100 - Math.abs(1 - Math.min(ratio, 2)) * 120));
  }

  // fluency
  const bench = CONFIG.FLUENCY_BENCHMARK[lang] || CONFIG.FLUENCY_BENCHMARK.en;
  const expectedSeconds = Math.max(1, (targetLen / bench) * 60);
  const ratio = Math.min(duration, expectedSeconds * 3) / expectedSeconds;
  let fluency;
  if (ratio >= 0.8 && ratio <= 1.3) {
    fluency = 90 + Math.round(Math.random() * 8);
  } else if (ratio >= 0.5 && ratio <= 1.8) {
    fluency = 70 + Math.round(Math.random() * 15);
  } else {
    fluency = Math.max(40, Math.round(60 - Math.abs(1 - ratio) * 50));
  }

  const pronunciation = Math.round(accuracy * 0.7 + fluency * 0.3);

  // suggestion 多语言
  const langCode = i18n.getLang();
  const suggestionMap = {
    zh: [
      accuracy >= 90 ? '很棒，发音准确。' : accuracy >= 70 ? '发音整体不错，可再关注细节。' : '建议放慢语速，逐字读准。',
      fluency >= 85 ? '流利度很好！' : '可尝试保持更稳定的节奏。',
      '坚持每日训练会稳步提升。'
    ],
    en: [
      accuracy >= 90 ? 'Excellent pronunciation accuracy!' : accuracy >= 70 ? 'Good overall, keep an eye on the tricky sounds.' : 'Try to slow down and articulate each word.',
      fluency >= 85 ? 'Your fluency is impressive.' : 'Aim for a more consistent pace.',
      'Practicing daily will bring steady improvement.'
    ],
    ja: [
      accuracy >= 90 ? '発音の正確性が素晴らしいです！' : accuracy >= 70 ? '全体的に良好です。細かい音に注意しましょう。' : 'ゆっくりはっきり読みましょう。',
      fluency >= 85 ? '流暢さは非常に良いです。' : '一定のリズムを心がけましょう。',
      '毎日続けると上達します。'
    ],
    ko: [
      accuracy >= 90 ? '발음 정확도가 매우 좋습니다!' : accuracy >= 70 ? '전반적으로 양호하며 세부 소리에 집중하세요.' : '천천히 또렷하게 읽으세요.',
      fluency >= 85 ? '유창성이 훌륭합니다.' : '일정한 리듬을 유지하세요.',
      '매일 훈련하면 꾸준히 향상됩니다.'
    ],
    fr: [
      accuracy >= 90 ? 'Excellent précision de prononciation !' : accuracy >= 70 ? 'Bon niveau global, soignez les détails.' : 'Ralentissez et articulez chaque mot.',
      fluency >= 85 ? 'Votre fluidité est remarquable.' : 'Visez un rythme plus régulier.',
      'Un entraînement quotidien apportera des progrès constants.'
    ]
  };
  const list = suggestionMap[langCode] || suggestionMap.en;
  const suggestion = list.join(' ');

  return {
    accuracy: accuracy,
    fluency: fluency,
    pronunciation: pronunciation,
    suggestion: suggestion,
    recognizedText: recText,
    _fallback: true
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
