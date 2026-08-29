// app.js
const i18n = require('./utils/i18n.js');

App({
  onLaunch: function () {
    // 初始化多语言
    this.globalData.currentLang = i18n.getLang();
    this.globalData.locale = i18n.getLocale();

    // 获取系统信息
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

    // 初始化用户进度数据
    this.initProgressData();
  },

  onShow: function () {
    // 每次进入前台刷新语言包
    this.refreshLocale();
    // 同时刷新tabBar文案
    this.updateTabBarTexts();
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
    }
    return success;
  },

  // 更新TabBar文案
  updateTabBarTexts: function (lang) {
    const useLang = lang || this.globalData.currentLang;
    const locale = i18n.getLocale(useLang);
    if (!locale || !locale.tabBar) return;
    try {
      // tabBar共4项：0=首页, 1=发现, 2=上传, 3=设置
      wx.setTabBarItem({ index: 0, text: locale.tabBar.home });
      wx.setTabBarItem({ index: 1, text: locale.tabBar.discover });
      wx.setTabBarItem({ index: 2, text: locale.tabBar.upload });
      wx.setTabBarItem({ index: 3, text: locale.tabBar.settings });
    } catch (e) {
      // 忽略，tabBar可能还没准备好
    }
  },

  // 初始化进度数据
  initProgressData: function () {
    const progressKey = 'linguaspeak_progress';
    try {
      let progress = wx.getStorageSync(progressKey);
      if (!progress) {
        progress = {
          consecutiveDays: 2,
          totalDays: 17,
          totalMinutes: 66,
          currentWeek: 1,
          currentDayOfWeek: 17,
          currentPlan: '',
          masteringSkills: [
            {
              id: 1,
              nameKey: 'conclusionFirst',
              progress: 15,
              status: 'start'
            }
          ],
          lastActiveDate: this.getTodayStr()
        };
        wx.setStorageSync(progressKey, progress);
      }
      this.globalData.progress = progress;
    } catch (e) {
      console.warn('初始化进度数据失败', e);
    }
  },

  // 获取进度数据
  getProgress: function () {
    const progressKey = 'linguaspeak_progress';
    try {
      return wx.getStorageSync(progressKey) || this.globalData.progress;
    } catch (e) {
      return this.globalData.progress;
    }
  },

  // 更新进度数据
  updateProgress: function (updates) {
    const progressKey = 'linguaspeak_progress';
    try {
      const current = this.getProgress() || {};
      const updated = Object.assign({}, current, updates);
      wx.setStorageSync(progressKey, updated);
      this.globalData.progress = updated;
      return updated;
    } catch (e) {
      console.warn('更新进度数据失败', e);
      return null;
    }
  },

  // 获取今日日期字符串
  getTodayStr: function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  globalData: {
    currentLang: 'zh',
    locale: null,
    systemInfo: null,
    statusBarHeight: 20,
    navBarHeight: 44,
    menuButton: null,
    progress: null,
    userInfo: null,
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
    }
  }
});
