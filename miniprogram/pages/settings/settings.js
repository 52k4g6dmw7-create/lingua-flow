// pages/settings/settings.js
const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    currentLangDisplay: '',
    supportedLangs: [],
    showLangModal: false,
    notificationEnabled: true,
    reminderTime: '08:00',
    dailyGoal: 30,
    cacheSize: '12.5 MB',
    themeMode: 'light',
    isLoggedIn: false,
    userInfo: null
  },

  onLoad: function (options) {
    this.initData();
    // 如果从快捷入口跳转，直接打开语言选择
    if (options && options.lang === '1') {
      setTimeout(() => {
        this.setData({ showLangModal: true });
      }, 300);
    }
  },

  onShow: function () {
    this.refreshLocale();
  },

  initData: function () {
    const lang = i18n.getLang();
    const langs = i18n.getSupportedLangs();
    const currentLangObj = langs.find(l => l.code === lang) || langs[0];

    this.setData({
      currentLang: lang,
      currentLangDisplay: currentLangObj.native,
      supportedLangs: langs,
      notificationEnabled: wx.getStorageSync('ls_notification') !== false,
      reminderTime: wx.getStorageSync('ls_reminder_time') || '08:00',
      dailyGoal: wx.getStorageSync('ls_daily_goal') || 30,
      themeMode: wx.getStorageSync('ls_theme') || 'light',
      isLoggedIn: !!wx.getStorageSync('ls_user')
    });
    this.refreshLocale();
  },

  refreshLocale: function () {
    const locale = i18n.getLocale();
    const lang = i18n.getLang();
    const langs = i18n.getSupportedLangs();
    const currentLangObj = langs.find(l => l.code === lang) || langs[0];
    this.setData({
      locale: locale,
      currentLang: lang,
      currentLangDisplay: currentLangObj.native
    });
    wx.setNavigationBarTitle({
      title: i18n.t('settings.title', lang)
    });
  },

  // ===== 语言切换 =====
  onOpenLangModal: function () {
    this.setData({ showLangModal: true });
  },

  onCloseLangModal: function () {
    this.setData({ showLangModal: false });
  },

  onSelectLang: function (e) {
    const langCode = e.currentTarget.dataset.code;
    if (langCode === this.data.currentLang) {
      this.setData({ showLangModal: false });
      return;
    }
    // 切换语言
    const success = app.switchLanguage(langCode);
    if (success) {
      const langs = i18n.getSupportedLangs();
      const currentLangObj = langs.find(l => l.code === langCode) || langs[0];
      this.setData({
        showLangModal: false,
        currentLang: langCode,
        currentLangDisplay: currentLangObj.native
      });
      wx.showToast({
        title: i18n.t('toast.switchLangSuccess', langCode),
        icon: 'success',
        duration: 2000
      });
      // 通知其他tab页刷新语言
      const pages = getCurrentPages();
      pages.forEach(p => {
        if (p && typeof p.refreshLocale === 'function' && p !== this) {
          p.refreshLocale();
        }
      });
    } else {
      wx.showToast({
        title: i18n.t('common.fail'),
        icon: 'error'
      });
    }
  },

  // ===== 通知开关 =====
  onToggleNotification: function (e) {
    const value = e.detail.value;
    this.setData({ notificationEnabled: value });
    wx.setStorageSync('ls_notification', value);
    wx.showToast({
      title: value ? 'Reminder ON' : 'Reminder OFF',
      icon: 'none'
    });
  },

  // ===== 提醒时间 =====
  onChangeReminderTime: function (e) {
    const value = e.detail.value;
    this.setData({ reminderTime: value });
    wx.setStorageSync('ls_reminder_time', value);
    wx.showToast({
      title: value,
      icon: 'none'
    });
  },

  // ===== 每日目标 =====
  onChangeDailyGoal: function (e) {
    const value = e.detail.value;
    this.setData({ dailyGoal: value });
    wx.setStorageSync('ls_daily_goal', value);
  },

  // ===== 主题切换 =====
  onToggleTheme: function () {
    const modes = ['light', 'dark'];
    const currentIdx = modes.indexOf(this.data.themeMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    const nextMode = modes[nextIdx];
    this.setData({ themeMode: nextMode });
    wx.setStorageSync('ls_theme', nextMode);
    wx.showToast({
      title: 'Theme: ' + nextMode,
      icon: 'none'
    });
  },

  // ===== 清除缓存 =====
  onClearCache: function () {
    const that = this;
    wx.showModal({
      title: i18n.t('settings.clearCache', i18n.getLang()),
      content: '确定要清除缓存吗？',
      confirmText: i18n.t('common.confirm'),
      cancelText: i18n.t('common.cancel'),
      success: function (res) {
        if (res.confirm) {
          // 模拟清除缓存
          setTimeout(() => {
            that.setData({ cacheSize: '0 MB' });
            wx.showToast({
              title: i18n.t('toast.cacheCleared'),
              icon: 'success'
            });
          }, 500);
        }
      }
    });
  },

  // ===== 账号相关 =====
  onLogin: function () {
    wx.showModal({
      title: i18n.t('settings.login', i18n.getLang()),
      content: '登录后可同步学习进度到云端',
      confirmText: i18n.t('common.confirm'),
      cancelText: i18n.t('common.cancel'),
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('ls_user', { nickName: 'User' });
          this.setData({
            isLoggedIn: true,
            userInfo: { nickName: 'User', avatar: '👤' }
          });
          wx.showToast({
            title: i18n.t('common.success'),
            icon: 'success'
          });
        }
      }
    });
  },

  onLogout: function () {
    wx.showModal({
      title: i18n.t('settings.logout', i18n.getLang()),
      content: '确定退出登录吗？',
      confirmText: i18n.t('common.confirm'),
      cancelText: i18n.t('common.cancel'),
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('ls_user');
          this.setData({ isLoggedIn: false, userInfo: null });
          wx.showToast({
            title: 'Logged out',
            icon: 'none'
          });
        }
      }
    });
  },

  // ===== 关于 / 隐私 / 反馈 =====
  onAbout: function () {
    wx.showModal({
      title: 'About LinguaSpeak',
      content: 'Version: 1.0.0\n\nLinguaSpeak 多语言朗读训练小程序\n\n© 2025 LinguaSpeak Team',
      showCancel: false,
      confirmText: i18n.t('common.confirm')
    });
  },

  onPrivacy: function () {
    wx.showModal({
      title: i18n.t('settings.privacy', i18n.getLang()),
      content: '我们重视您的隐私。\n您的语音和学习数据仅用于提供训练服务，不会泄露给第三方。',
      showCancel: false
    });
  },

  onFeedback: function () {
    wx.showModal({
      title: i18n.t('settings.feedback', i18n.getLang()),
      content: '请通过邮件发送您的反馈：\nfeedback@linguaspeak.com',
      showCancel: false
    });
  },

  // 阻止模态层内部点击冒泡
  noop: function () {},

  // FAB跳转到朗读
  onGoRead: function () {
    wx.navigateTo({
      url: '/pages/read/read?plan=settings'
    });
  }
});
