// pages/index/index.js
const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    // 进度数据
    consecutiveDays: 2,
    totalDays: 17,
    totalMinutes: 66,
    currentWeek: 1,
    currentDayOfWeek: 17,
    currentPlanKey: 'interviewIntro',
    currentPlanName: '',
    // 正在掌握的技能
    masteringSkills: [],
    // 提示横幅
    showBanner: true,
    // 状态栏和导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44
  },

  onLoad: function () {
    this.initData();
  },

  onShow: function () {
    // 每次显示刷新语言包
    this.refreshLocale();
    this.loadProgress();
  },

  onPullDownRefresh: function () {
    this.loadProgress();
    wx.stopPullDownRefresh();
  },

  // 初始化数据
  initData: function () {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      navBarHeight: app.globalData.navBarHeight || 44
    });
    this.refreshLocale();
    this.loadProgress();
  },

  // 刷新语言包
  refreshLocale: function () {
    const locale = i18n.getLocale();
    const currentLang = i18n.getLang();
    this.setData({
      locale: locale,
      currentLang: currentLang,
      currentPlanName: i18n.t('home.' + this.data.currentPlanKey, currentLang)
    });
    // 更新导航栏标题
    wx.setNavigationBarTitle({
      title: i18n.t('common.appName', currentLang)
    });
  },

  // 加载进度数据
  loadProgress: function () {
    const progress = app.getProgress() || {};
    const currentLang = i18n.getLang();
    const masteringSkills = (progress.masteringSkills || []).map(skill => {
      const progressText = skill.progress >= 100
        ? i18n.t('home.progressEnd', currentLang)
        : skill.progress >= 50
          ? i18n.t('home.progressMid', currentLang)
          : i18n.t('home.progressStart', currentLang);
      return Object.assign({}, skill, {
        name: i18n.t('home.' + skill.nameKey, currentLang),
        statusText: progressText
      });
    });

    this.setData({
      consecutiveDays: progress.consecutiveDays || 0,
      totalDays: progress.totalDays || 0,
      totalMinutes: progress.totalMinutes || 0,
      currentWeek: progress.currentWeek || 1,
      currentDayOfWeek: progress.currentDayOfWeek || 1,
      masteringSkills: masteringSkills
    });
  },

  // 关闭添加到桌面横幅
  onCloseBanner: function () {
    this.setData({ showBanner: false });
  },

  // 立即添加到桌面
  onAddToDesktop: function () {
    // 微信小程序添加到桌面的引导
    wx.showToast({
      title: i18n.t('home.addNow', i18n.getLang()),
      icon: 'none'
    });
  },

  // AI帮我安排
  onAIPlan: function () {
    wx.showActionSheet({
      itemList: [
        i18n.t('home.interviewIntro', i18n.getLang()),
        'Business Speech',
        'Daily Conversation',
        'TED Style Talk'
      ],
      success: (res) => {
        this.setData({
          currentPlanKey: ['interviewIntro', 'business', 'daily', 'ted'][res.tapIndex],
          currentPlanName: [
            i18n.t('home.interviewIntro', i18n.getLang()),
            'Business Speech',
            'Daily Conversation',
            'TED Style Talk'
          ][res.tapIndex]
        });
        wx.showToast({
          title: 'AI Plan Applied',
          icon: 'success'
        });
      }
    });
  },

  // 使用指南
  onGuide: function () {
    wx.showModal({
      title: i18n.t('home.guide', i18n.getLang()),
      content: '1. Select your training plan\n2. Tap "Start Reading"\n3. Read aloud and record\n4. Review pronunciation feedback\n\n坚持每天朗读，持续提升表达能力！',
      showCancel: false,
      confirmText: i18n.t('common.confirm', i18n.getLang())
    });
  },

  // 左侧菜单
  onMenu: function () {
    wx.showActionSheet({
      itemList: [
        '🏆 ' + 'Achievements',
        '📊 ' + 'Statistics',
        '🎯 ' + 'Goals',
        '📖 ' + 'History'
      ],
      success: (res) => {
        console.log('选中了：', res.tapIndex);
      }
    });
  },

  // 查看统计详情
  onViewStats: function () {
    wx.showModal({
      title: '📊 Statistics',
      content: `连续天数: ${this.data.consecutiveDays}天\n累计天数: ${this.data.totalDays}天\n累计时长: ${Math.floor(this.data.totalMinutes / 60)}.${this.data.totalMinutes % 60}h`,
      showCancel: false
    });
  },

  // 训练计划下拉
  onTogglePlan: function () {
    // 可以展开更多计划选项
    wx.showActionSheet({
      itemList: [
        i18n.t('home.interviewIntro', i18n.getLang()),
        'Business Presentation',
        'English Debate',
        'Speech Writing'
      ],
      success: (res) => {
        const plans = ['interviewIntro', 'business', 'debate', 'speech'];
        const names = [
          i18n.t('home.interviewIntro', i18n.getLang()),
          'Business Presentation',
          'English Debate',
          'Speech Writing'
        ];
        this.setData({
          currentPlanKey: plans[res.tapIndex],
          currentPlanName: names[res.tapIndex]
        });
      }
    });
  },

  // 开始朗读
  onStartRead: function () {
    wx.navigateTo({
      url: '/pages/read/read?plan=' + encodeURIComponent(this.data.currentPlanKey)
    });
  },

  // 多语言切换快捷入口
  onQuickLang: function () {
    wx.navigateTo({
      url: '/pages/settings/settings?lang=1'
    });
  }
});
