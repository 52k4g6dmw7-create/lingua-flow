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

    // 是否启用会员系统（1小时免费 + 付费套餐 + 激活码）
    // 设 false 时跳过会员拦截，所有功能免费用（本地开发调试用）
    ENABLE_VIP: true,

    // 是否启用微信虚拟支付（个人号不可用，企业主体需到mp后台开通虚拟支付）
    // 若关了，仍可通过"激活码通道"完成会员开通
    ENABLE_WX_PAY: true,

    // 调试模式：true 时云函数失败会 console.error 并 toast 错误详情
    DEBUG: true
  },

  // ====== 【可选】真实语音评测：腾讯云 SOE / 阿里云 智能语音评测 配置说明 ======
  // 本项目不把密钥放在前端（不安全）。请在云函数的"环境变量"里配置，云函数 evaluateSpeech
  // 会按优先级检测，任一命中就启用真实 API，否则用内置 Levenshtein + 语速基准算法。
  //
  // 路径：微信开发者工具 → cloudfunctions/evaluateSpeech → 右键 → 在终端中打开
  //       → 上传并部署 → 部署完成后 云开发控制台 → 云函数 → evaluateSpeech → 配置 → 环境变量
  //
  // 【腾讯云 SOE（推荐，雅思 4 维度分更准）】— 开通后在 SOE 控制台创建应用：
  //   SOE_SECRET_ID   = 腾讯云 API 密钥 SecretId（console.cloud.tencent.com/cam/capi）
  //   SOE_SECRET_KEY  = 腾讯云 API 密钥 SecretKey
  //   SOE_REGION      = ap-beijing / ap-shanghai / ap-guangzhou（默认 ap-beijing）
  //   SOE_APP_ID      = SOE 控制台创建的业务应用 ID（仅用于日志区分，可留空）
  //
  // 【阿里云智能语音评测】— 开通"智能语音交互 NLS"，控制台创建项目得到 AppKey：
  //   ALIYUN_AK_ID     = 阿里云 AccessKey ID（ram.console.aliyun.com/manage/ak）
  //   ALIYUN_AK_SECRET = 阿里云 AccessKey Secret
  //   ALIYUN_APP_KEY   = NLS 项目 AppKey（nls-portal.console.aliyun.com/applist 创建项目可得，必填）
  //   ALIYUN_REGION    = cn-shanghai（默认）/ cn-hangzhou / cn-beijing
  //
  // 注意事项（真实 API 命中前提）：
  //   1) 微信小程序录音推荐：sampleRate=16000、numberOfChannels=1、encodeBitRate=48000、format=mp3/wav
  //      本项目 read.js 已按 16k/单声道/mp3 配置 wx.getRecorderManager()，符合要求。
  //   2) 只有当 API 调用拿到音频 fileID（云存储 cloud:// 开头的路径）才能真实命中第三方 API，
  //      否则返回带 (fallback)/(no-audio) 标识的增强基准分。
  //   3) 腾讯云 SOE / 阿里云 NLS 均仅支持 中文(zh) + 英文(en) 两种语种的真实音频评测；
  //      日语/韩语/法语训练自动跳过真实 API，使用内置稳定算法（Levenshtein + 语速基准）。
  //
  // 未配置以上任一密钥时：evaluateSpeech 云函数自动使用内置稳定算法（非随机）
  // 前端离线降级同样使用稳定算法，保证可复现评分结果。

  // === 默认目标评分基准（语音流利度，字符/分钟） ===
  FLUENCY_BENCHMARK: {
    zh: 240, // 中文每分钟约240字
    en: 150, // 英文每分钟约150词
    ja: 220,
    ko: 220,
    fr: 160
  },

  // === 会员配置（新用户首登起1小时免费，之后需要开通会员） ===
  VIP: {
    // 免费试用时长，单位：分钟（默认 60 分钟）
    FREE_TRIAL_MINUTES: 60,

    // 套餐定义 —— 前台展示与后端鉴权以 PLAN_KEY 为唯一键，禁止随意改动
    PLANS: [
      {
        planKey: 'pro_2year',
        nameI18nKey: 'vip_plan_2year',
        price: 4980,      // 单位：分，即 49.80 元
        priceLabel: '¥49.8',
        durationType: 'years', // years / forever
        durationValue: 2,      // 2 年
        recommend: false,
        descI18nKey: 'vip_plan_2year_desc',
        badgeI18nKey: 'vip_badge_popular'
      },
      {
        planKey: 'pro_forever',
        nameI18nKey: 'vip_plan_forever',
        price: 9900,      // 单位：分，即 99.00 元
        priceLabel: '¥99',
        durationType: 'forever',
        durationValue: 0,
        recommend: true,
        descI18nKey: 'vip_plan_forever_desc',
        badgeI18nKey: 'vip_badge_best'
      }
    ],

    // 微信虚拟支付商品ID（可选，对应 mp.weixin.qq.com -> 功能 -> 虚拟支付 -> 商品管理里录入的 out_product_id）
    // 若为空则使用 planKey 作为 out_product_id
    WX_PAY_PRODUCT_IDS: {
      pro_2year: 'lingua_pro_2year_498',
      pro_forever: 'lingua_pro_forever_990'
    },

    // 虚拟支付环境：0 = 正式环境，1 = 沙箱环境（开通虚拟支付前建议先用沙箱联调）
    WX_PAY_ENV: 0,

    // 支付成功回调通知 URL（可选，如果后续接了自有服务器通知的话）
    // 使用云开发默认不需要配，直接在云函数里处理支付结果
    PAY_NOTIFY_URL: ''
  }
};

// 判断是否已真实配置
CONFIG.isCloudConfigured = function () {
  return CONFIG.CLOUD_ENV
    && CONFIG.CLOUD_ENV.length > 0
    && CONFIG.CLOUD_ENV !== 'your-env-id';
};

module.exports = CONFIG;
