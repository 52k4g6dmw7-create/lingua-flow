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
  },

  onShow: function () {
    // 每次进入前台刷新语言包
    this.refreshLocale();
    this.updateTabBarTexts();
    // 尝试刷新用户活跃时间
    if (this.globalData.openid) {
      api.updateUser({ lastActiveAt: Date.now() }).catch(() => {});
    }
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
