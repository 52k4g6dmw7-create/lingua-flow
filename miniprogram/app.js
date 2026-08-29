// app.js
const i18n = require('./utils/i18n.js');
const cloud = require('./utils/cloud.js');
const api = require('./utils/api.js');
const CONFIG = require('./config.js');

App({
  onLaunch: function () {
    // ====== 云开发初始化（最先执行） ======
    this.initCloud();

    // ====== 初始化多语言 ======
    this.globalData.currentLang = i18n.getLang();
    this.globalData.locale = i18n.getLocale();

    // ====== 获取系统信息 ======
    try {
      const sysInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = sysInfo;
      this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        this.globalData.navBarHeight = (menuButton.top - this.globalData.statusBarHeight) * 2 + menuButton.height;
        this.globalData.menuButton = menuButton;
      }
    } catch (e) {
      console.warn('获取系统信息失败', e);
      this.globalData.statusBarHeight = 20;
      this.globalData.navBarHeight = 44;
    }

    // ====== 恢复本地登录态 ======
    try {
      const savedOpenid = wx.getStorageSync('ls_openid');
      const savedUser = wx.getStorageSync('ls_user');
      if (savedOpenid) this.globalData.openid = savedOpenid;
      if (savedUser) this.globalData.user = savedUser;
    } catch (e) {}

    // ====== 静默尝试登录（非阻塞） ======
    this.silentLogin();

    // ====== 进度数据 ======
    this.initProgressData();

    // ====== 会员状态异步刷新（不阻塞启动，在用到 requireVip 时会再次确保） ======
    setTimeout(() => { this.refreshVipStatus().catch(() => {}); }, 800);
  },

  onShow: function () {
    // 每次进入前台刷新语言包
    this.refreshLocale();
    this.updateTabBarTexts();
    // 尝试刷新用户活跃时间
    if (this.globalData.openid) {
      api.updateUser({ lastActiveAt: Date.now() }).catch(() => {});
    }
    // 回到前台也刷新会员状态（判断免费时间是否到期）
    setTimeout(() => { this.refreshVipStatus().catch(() => {}); }, 300);
  },

  // ===== 云开发初始化 =====
  initCloud: function () {
    const that = this;
    cloud.init().then((ready) => {
      that.globalData.cloudReady = ready;
      if (!ready) {
        if (CONFIG.FEATURES.DEBUG) {
          console.warn('[app] 云开发未就绪，本地降级模式');
        }
        // 只在首次启动未配置时弹窗提醒（发布给客户前很重要）
        try {
          const alerted = wx.getStorageSync('ls_cloud_alerted');
          if (!alerted && !CONFIG.isCloudConfigured()) {
            wx.setStorageSync('ls_cloud_alerted', true);
            setTimeout(() => {
              wx.showModal({
                title: '⚠️ 尚未配置云开发',
                content: '为保证真实登录、评分同步、进度保存等功能可用，请在 config.js 填写您的云开发环境 CLOUD_ENV。\n\n详细步骤请查看 miniprogram/DEPLOY_CHECKLIST.md',
                confirmText: '我知道了',
                showCancel: false
              });
            }, 600);
          }
        } catch (e) {}
      } else {
        // 检查同声传译插件
        try {
          const p = requirePlugin && requirePlugin('WechatSI');
          that.globalData.wechatSIAvailable = !!p;
          if (!p && CONFIG.FEATURES.ENABLE_SPEECH_EVAL) {
            console.warn('[app] 同声传译插件不可用，请在公众平台添加');
          }
        } catch (e) {
          that.globalData.wechatSIAvailable = false;
        }
      }
    });
  },

  // ===== 静默登录：拿 openid + 同步用户（不弹窗，失败不阻塞） =====
  silentLogin: function () {
    const that = this;
    api.login().then((res) => {
      if (res && res.success) {
        that.setLoginSession(res.openid, res.user);
      }
    }).catch((err) => {
      console.warn('[app] 静默登录失败，使用降级模式', err && err.errMsg);
    });
  },

  // ===== 对外：显式登录（点按钮时调用，会提示加载中） =====
  doLogin: function () {
    const that = this;
    wx.showLoading({ title: '登录中...', mask: true });
    return api.login().then((res) => {
      wx.hideLoading();
      if (res && res.success) {
        that.setLoginSession(res.openid, res.user);
        wx.showToast({ title: res._fallback ? '本地模式登录' : '登录成功', icon: 'success' });
        return res;
      }
      throw new Error('login fail');
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: i18n.t('common.fail'), icon: 'error' });
      throw err;
    });
  },

  // ===== 写登录态到全局 + 本地 =====
  setLoginSession: function (openid, user) {
    this.globalData.openid = openid || '';
    this.globalData.user = user || null;
    try {
      if (openid) wx.setStorageSync('ls_openid', openid);
      if (user) wx.setStorageSync('ls_user', user);
    } catch (e) {}
  },

  // ===== 登出 =====
  logout: function () {
    this.globalData.openid = '';
    this.globalData.user = null;
    try {
      wx.removeStorageSync('ls_openid');
      wx.removeStorageSync('ls_user');
    } catch (e) {}
  },

  // ===== 是否已登录（有真实 openid） =====
  isLoggedIn: function () {
    return !!(this.globalData.openid && this.globalData.openid.length > 0);
  },

  // 刷新语言包
  refreshLocale: function () {
    this.globalData.currentLang = i18n.getLang();
    this.globalData.locale = i18n.getLocale();
  },

  // 切换语言
  switchLanguage: function (langCode) {
    const success = i18n.setLang(langCode);
    if (success) {
      this.refreshLocale();
      this.updateTabBarTexts(langCode);
      // 同步用户偏好语言
      if (this.isLoggedIn()) {
        api.updateUser({ lang: langCode }).catch(() => {});
      }
    }
    return success;
  },

  // 更新TabBar文案
  updateTabBarTexts: function (lang) {
    const useLang = lang || this.globalData.currentLang;
    const locale = i18n.getLocale(useLang);
    if (!locale || !locale.tabBar) return;
    try {
      wx.setTabBarItem({ index: 0, text: locale.tabBar.home });
      wx.setTabBarItem({ index: 1, text: locale.tabBar.discover });
      wx.setTabBarItem({ index: 2, text: locale.tabBar.upload });
      wx.setTabBarItem({ index: 3, text: locale.tabBar.settings });
    } catch (e) {
      // tabBar 未渲染时会报，忽略
    }
  },

  // 初始化进度数据：先云优先，失败再本地
  initProgressData: function () {
    const that = this;
    const progressKey = 'linguaspeak_progress';
    const defaultProgress = {
      consecutiveDays: 2,
      totalDays: 17,
      totalMinutes: 66,
      currentWeek: 1,
      currentDayOfWeek: 17,
      currentPlan: '',
      masteringSkills: [
        { id: 1, nameKey: 'conclusionFirst', progress: 15, status: 'start' }
      ],
      lastActiveDate: this.getTodayStr()
    };

    // 先用同步本地兜底（保证立即显示）
    try {
      const local = wx.getStorageSync(progressKey);
      if (local && typeof local === 'object') {
        that.globalData.progress = Object.assign({}, defaultProgress, local);
      } else {
        wx.setStorageSync(progressKey, defaultProgress);
        that.globalData.progress = defaultProgress;
      }
    } catch (e) {
      that.globalData.progress = defaultProgress;
    }

    // 异步：尝试从云库拉取覆盖（如果有登录态）
    if (CONFIG.isCloudConfigured()) {
      setTimeout(() => {
        api.getProgress().then((cloudProgress) => {
          if (cloudProgress && typeof cloudProgress === 'object' && cloudProgress.totalDays !== undefined) {
            that.globalData.progress = cloudProgress;
            try { wx.setStorageSync(progressKey, cloudProgress); } catch (e) {}
          }
        }).catch(() => {
          // 忽略云端失败，保留本地
        });
      }, 500);
    }
  },

  // 获取进度数据（返回本地兜底，若云端返回更新会在下一次刷新）
  getProgress: function () {
    try {
      return wx.getStorageSync('linguaspeak_progress') || this.globalData.progress;
    } catch (e) {
      return this.globalData.progress;
    }
  },

  // 更新进度：写云 + 本地
  updateProgress: function (updates) {
    const progressKey = 'linguaspeak_progress';
    const current = this.getProgress() || {};
    const updated = Object.assign({}, current, updates);
    try {
      wx.setStorageSync(progressKey, updated);
      this.globalData.progress = updated;
    } catch (e) {}

    if (CONFIG.isCloudConfigured()) {
      // 异步写云，不阻塞
      api.updateProgress(updates).then((cloudRes) => {
        if (cloudRes && typeof cloudRes === 'object') {
          this.globalData.progress = cloudRes;
          try { wx.setStorageSync(progressKey, cloudRes); } catch (e) {}
        }
      }).catch((e) => {
        console.warn('[app] 云端更新进度失败', e);
      });
    }
    return updated;
  },

  // 获取今日日期字符串
  getTodayStr: function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // ============================================================
  // 会员系统：全局状态 + 刷新 + 拦截
  // ============================================================

  /**
   * 刷新会员状态（静默，失败不阻塞）
   * 调用后：
   *   - globalData.vipStatus = { canUseCore, freeTrial, vip, _ui, ... }
   *   - 本地存到 ls_vip_status（下次启动先显示本地再异步刷新）
   */
  refreshVipStatus: function () {
    const that = this;
    // 开关关了直接放行（本地开发调试）
    if (CONFIG.FEATURES && CONFIG.FEATURES.ENABLE_VIP === false) {
      const allPass = {
        canUseCore: true, _bypass: true,
        freeTrial: { active: true, remainingMinutes: 9999 },
        vip: { active: true, planKey: 'bypass', isForever: true, daysLeft: Infinity },
        _ui: { needUpgrade: false, freeAlmostGone: false, expiredVip: false }
      };
      that.globalData.vipStatus = allPass;
      try { wx.setStorageSync('ls_vip_status', allPass); } catch (e) {}
      return Promise.resolve(allPass);
    }

    // 先读本地，UI 不闪
    try {
      const local = wx.getStorageSync('ls_vip_status');
      if (local && typeof local === 'object') that.globalData.vipStatus = local;
    } catch (e) {}

    return api.checkVipStatus().then((st) => {
      if (st && typeof st === 'object') {
        that.globalData.vipStatus = st;
        try { wx.setStorageSync('ls_vip_status', st); } catch (e) {}
      }
      return st || that.globalData.vipStatus || {};
    }).catch(() => {
      return that.globalData.vipStatus || { canUseCore: true, _fallback: true };
    });
  },

  /**
   * 同步读取会员状态（优先用已缓存的）
   */
  getVipStatus: function () {
    try {
      return this.globalData.vipStatus || wx.getStorageSync('ls_vip_status') || { canUseCore: true };
    } catch (e) {
      return { canUseCore: true };
    }
  },

  /**
   * 会员拦截：在进入朗读训练、上传等核心功能前调用
   * @param {string} from  来源页面标识，用于跳转回退
   * @param {object} opts  { silent: false, allowRetry: true }
   * @returns Promise<{pass: boolean, status}>  pass=true 表示可以放行
   */
  requireVip: function (from, opts) {
    opts = opts || {};
    const that = this;
    return that.refreshVipStatus().then((st) => {
      const status = st || {};
      if (status.canUseCore) return { pass: true, status: status };

      // 未通过 → 跳会员中心，同时带 redirect 参数（此处用全局 redirect 标记简化）
      if (opts.silent !== true) {
        try {
          wx.showModal({
            title: that._vipTitle(),
            content: that._vipContent(status),
            confirmText: that._vipConfirmText(status),
            cancelText: '稍后再说',
            confirmColor: '#2ecc71',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: '/pages/vip/vip?from=' + encodeURIComponent(from || '')
                });
              }
            }
          });
        } catch (e) {
          wx.navigateTo({ url: '/pages/vip/vip' });
        }
      }
      return { pass: false, status: status };
    });
  },

  _vipTitle: function () {
    const lang = i18n.getLang();
    if (lang === 'zh') return '免费体验已结束';
    if (lang === 'en') return 'Free Trial Ended';
    if (lang === 'ja') return '無料体験終了';
    if (lang === 'ko') return '무료 체험 종료';
    if (lang === 'fr') return 'Essai gratuit terminé';
    return 'Free Trial Ended';
  },
  _vipContent: function (st) {
    const lang = i18n.getLang();
    const expired = st && st._ui && st._ui.expiredVip;
    if (lang === 'zh') return expired ? '您的会员已过期，请续费继续使用完整功能。' : '1小时免费体验已结束，升级Pro继续训练～';
    if (lang === 'en') return expired ? 'Your membership has expired. Renew to continue.' : 'Your 1-hour trial has ended. Upgrade to Pro!';
    if (lang === 'ja') return expired ? '有効期限が切れました。更新して続けましょう。' : '1時間の無料体験が終了しました。Proへアップグレード！';
    if (lang === 'ko') return expired ? '회원권이 만료되었습니다. 갱신하고 계속하세요.' : '1시간 무료 체험이 종료되었습니다. Pro로 업그레이드!';
    if (lang === 'fr') return expired ? 'Votre abonnement a expiré. Renouvelez pour continuer.' : 'Votre essai d\'1 heure est terminé. Passez à Pro !';
    return 'Upgrade to continue.';
  },
  _vipConfirmText: function (st) {
    const lang = i18n.getLang();
    const expired = st && st._ui && st._ui.expiredVip;
    if (lang === 'zh') return expired ? '立即续费' : '立即开通';
    if (lang === 'en') return expired ? 'Renew Now' : 'Upgrade Now';
    if (lang === 'ja') return expired ? '更新する' : 'アップグレード';
    if (lang === 'ko') return expired ? '지금 갱신' : '지금 업그레이드';
    if (lang === 'fr') return expired ? 'Renouveler' : 'Passer à Pro';
    return 'Upgrade';
  },

  globalData: {
    // 云 & 登录
    cloudReady: false,
    wechatSIAvailable: false,
    openid: '',
    user: null,
    // 多语言
    currentLang: 'zh',
    locale: null,
    // 系统
    systemInfo: null,
    statusBarHeight: 20,
    navBarHeight: 44,
    menuButton: null,
    // 进度
    progress: null,
    // 会员状态
    vipStatus: null,
    // 训练内容库
    trainingLibrary: {
      interview: {
        zh: [
          '您好，我叫张三，毕业于北京大学计算机专业。',
          '我有三年的前端开发经验，熟悉React和Vue框架。',
          '我认为沟通能力和团队协作是项目成功的关键。',
          '在之前的工作中，我主导过两个大型项目的开发。',
          '我对新技术充满热情，并持续保持学习的态度。'
        ],
        en: [
          'Hello, my name is Zhang San. I graduated from Peking University with a degree in Computer Science.',
          'I have three years of front-end development experience and am proficient in React and Vue frameworks.',
          'I believe communication skills and teamwork are the keys to project success.',
          'In my previous role, I led the development of two large-scale projects.',
          'I am passionate about new technologies and maintain a continuous learning attitude.'
        ],
        ja: [
          'はじめまして、张三と申します。北京大学コンピューター学科を卒業しました。',
          'フロントエンド開発の経験が3年あり、ReactとVueに精通しています。',
          'コミュニケーション能力とチームワークがプロジェクト成功の鍵だと考えています。',
          '前職では、2つの大規模プロジェクトの開発をリードしました。',
          '新しい技術に情熱を持ち、常に学び続ける姿勢を大切にしています。'
        ],
        ko: [
          '안녕하세요, 저는 장산입니다. 북경대학교 컴퓨터공학과를 졸업했습니다.',
          '프론트엔드 개발 경력이 3년이며, React와 Vue 프레임워크에 능숙합니다.',
          '의사소통 능력과 팀워크가 프로젝트 성공의 열쇠라고 생각합니다.',
          '이전 직장에서 두 개의 대규모 프로젝트 개발을 주도했습니다.',
          '새로운 기술에 열정을 갖고 있으며, 지속적으로 배우는 자세를 유지하고 있습니다.'
        ],
        fr: [
          'Bonjour, je m\'appelle Zhang San. Je suis diplômé de l\'Université de Pékin en informatique.',
          'J\'ai trois ans d\'expérience en développement front-end et je maîtrise les frameworks React et Vue.',
          'Je pense que la communication et le travail d\'équipe sont la clé du succès d\'un projet.',
          'Dans mon précédent poste, j\'ai dirigé le développement de deux projets à grande échelle.',
          'Je suis passionné par les nouvelles technologies et j\'ai une attitude d\'apprentissage continu.'
        ]
      }
    },
    // 用户自定义句子缓存（上传页→朗读页跳转用）
    customSentences: null,
    customLang: 'en'
  }
});
