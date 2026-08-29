// miniprogram/config.js
// ====== 发布前请填写以下配置，否则将使用本地降级模式 ======

const CONFIG = {
  // === 必须：云开发环境ID ===
  // 请在微信开发者工具 -> 云开发控制台 -> 设置 -> 环境ID 中获取
  // 形如: 'lingua-3gxxxxxx'  留空或 'your-env-id' 则走降级模式
  CLOUD_ENV: 'your-env-id',

  // === 必须：同声传译插件 AppID ===
  // 微信官方免费, 到 mp.weixin.qq.com -> 设置 -> 第三方设置 -> 插件管理 -> 添加插件
  // 搜索 "微信同声传译" 添加即可, AppID 固定为:
  WECHAT_SI_PLUGIN_APPID: 'wx069ba97219f66d99',
  WECHAT_SI_PLUGIN_VERSION: '0.3.5',

  // === 功能开关 ===
  FEATURES: {
    // 是否启用获取手机号（个人小程序不可用，需企业/个体认证）
    // 设 false 自动隐藏手机号按钮，不影响其他功能
    ENABLE_PHONE_AUTH: true,

    // 是否启用同声传译评分（若未添加插件可先关，降级为时长估算模型）
    ENABLE_SPEECH_EVAL: true,

    // 是否使用云数据库存课程（关了就用本地静态数据，发现页仍能展示）
    ENABLE_CLOUD_COURSES: true,

    // 调试模式：true 时云函数失败会 console.error 并 toast 错误详情
    DEBUG: true
  },

  // === 默认目标评分基准（语音流利度，字符/分钟） ===
  FLUENCY_BENCHMARK: {
    zh: 240, // 中文每分钟约240字
    en: 150, // 英文每分钟约150词
    ja: 220,
    ko: 220,
    fr: 160
  }
};

// 判断是否已真实配置
CONFIG.isCloudConfigured = function () {
  return CONFIG.CLOUD_ENV
    && CONFIG.CLOUD_ENV.length > 0
    && CONFIG.CLOUD_ENV !== 'your-env-id';
};

module.exports = CONFIG;
