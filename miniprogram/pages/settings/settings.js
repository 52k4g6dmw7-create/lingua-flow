// pages/settings/settings.js
// 真实登录版本：
//   - 点"登录"调用 app.doLogin() -> wx.login + cloud.login + syncUser，拿到真实 openid
//   - 头像：使用 button type="avatar" 的新能力（基础库 2.21.2+），不强制弹窗授权
//   - 昵称：使用 input type="nickname" 组件，支持微信昵称一键填入
//   - 手机号：button open-type="getPhoneNumber"（仅企业/个体主体可用，可开关）
//   - 登出：清本地 + globalData

const app = getApp();
const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const CONFIG = require('../../config.js');

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    currentLangDisplay: '',
    supportedLangs: [],
    showLangModal: false,
    // 资料编辑弹窗
    showProfileModal: false,
    // 通知等设置
    notificationEnabled: true,
    reminderTime: '08:00',
    dailyGoal: 30,
    cacheSize: '0 MB',
    themeMode: 'light',
    // 登录相关
    isLoggedIn: false,
    userInfo: null,        // { nickName, avatarUrl, phone, _id, openid }
    // 表单字段（头像昵称编辑）
    editNickName: '',
    editAvatarUrl: '',
    // 功能开关
    enablePhoneAuth: true,
    // 云就绪状态
    cloudReady: false,
    // 会员入口显示
    vipActive: false,
    vipFreeActive: false,
    vipStatusText: ''
  },

  onLoad: function (options) {
    this.setData({
      enablePhoneAuth: !!CONFIG.FEATURES.ENABLE_PHONE_AUTH,
      cloudReady: !!CONFIG.isCloudConfigured()
    });
    this.initData();
    this.refreshUserInfo();
    this.calcCacheSize();
    this.refreshVipUI();

    if (options && options.lang === '1') {
      setTimeout(() => this.setData({ showLangModal: true }), 300);
    }
  },

  onShow: function () {
    this.refreshLocale();
    this.refreshUserInfo();
    this.setData({
      cloudReady: !!CONFIG.isCloudConfigured()
    });
    this.refreshVipUI();
  },

  // ===== 会员入口 UI 刷新 =====
  refreshVipUI: function () {
    const that = this;
    const lang = i18n.getLang();
    const VIP_DISABLED = CONFIG.FEATURES && CONFIG.FEATURES.ENABLE_VIP === false;
    if (VIP_DISABLED) {
      that.setData({ vipActive: true, vipFreeActive: false, vipStatusText: lang === 'zh' ? '会员系统已关闭（开发模式）' : 'VIP disabled (dev mode)' });
      return;
    }
    app.refreshVipStatus().then((st) => {
      const s = st || {};
      const freeTrial = s.freeTrial || {};
      const vip = s.vip || {};
      let text = '';
      if (vip.active) {
        if (vip.isForever) {
          text = lang === 'zh' ? '永久Pro · 终身使用' : 'Lifetime Pro · Forever valid';
        } else {
          const d = Number(vip.daysLeft) || 0;
          text = lang === 'zh' ? `剩余 ${d} 天 · 到期自动续费可延长` : `${d} days left · Extend anytime`;
        }
      } else if (freeTrial.active) {
        const m = Number(freeTrial.remainingMinutes) || 0;
        const sec = Number(freeTrial.remainingSeconds) || 0;
        text = lang === 'zh'
          ? `免费试用还剩 ${m}:${String(sec).padStart(2,'0')}，结束后需开通Pro`
          : `${m}:${String(sec).padStart(2,'0')} free trial left. Upgrade after.`;
      } else {
        text = lang === 'zh'
          ? '免费试用已结束，立即开通Pro继续训练'
          : 'Free trial ended. Upgrade to Pro to continue.';
      }
      that.setData({
        vipActive: !!vip.active,
        vipFreeActive: !vip.active && !!freeTrial.active,
        vipStatusText: text
      });
    }).catch(() => {});
  },

  onOpenVip: function () {
    wx.navigateTo({ url: '/pages/vip/vip?from=settings' });
  },

  // ===== 初始化基础数据 =====
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
      themeMode: wx.getStorageSync('ls_theme') || 'light'
    });
    this.refreshLocale();
  },

  // 从 app.globalData / storage 刷新用户信息到视图
  refreshUserInfo: function () {
    const user = app.globalData.user || wx.getStorageSync('ls_user') || null;
    const openid = app.globalData.openid || wx.getStorageSync('ls_openid') || '';
    const loggedIn = !!(openid && openid.length > 0);
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: loggedIn ? (user || { nickName: '', avatarUrl: '', phone: '' }) : null
    });
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

  calcCacheSize: function () {
    // 粗略估算本地缓存大小
    try {
      const info = wx.getStorageInfoSync();
      const kb = info && info.currentSize ? info.currentSize : 0;
      this.setData({ cacheSize: (kb / 1024).toFixed(1) + ' MB' });
    } catch (e) {
      this.setData({ cacheSize: '0 MB' });
    }
  },

  // ========================== 登录 ==========================

  // 点击用户卡片：已登录→打开资料编辑；未登录→发起真实登录
  onTapUserCard: function () {
    if (this.data.isLoggedIn) {
      const u = this.data.userInfo || {};
      this.setData({
        showProfileModal: true,
        editNickName: u.nickName || '',
        editAvatarUrl: u.avatarUrl || ''
      });
    } else {
      this.onRealLogin();
    }
  },

  // 真实登录：不使用废弃的 getUserProfile，直接调用 app.doLogin()
  // doLogin() 内部：wx.login -> cloud.login(openid) -> cloud.syncUser(init)
  onRealLogin: function () {
    const that = this;
    app.doLogin().then((res) => {
      that.refreshUserInfo();
    }).catch((err) => {
      console.warn('[settings] 登录失败:', err);
      // 即使失败也尝试刷新（可能已经用了降级模式）
      that.refreshUserInfo();
    });
  },

  // 兼容旧函数名（settings.wxml 原 bindtap="onLogin"）
  onLogin: function () {
    if (this.data.isLoggedIn) {
      this.onTapUserCard();
    } else {
      this.onRealLogin();
    }
  },

  // ========================== 资料编辑弹窗 ==========================

  onCloseProfileModal: function () {
    this.setData({ showProfileModal: false });
  },

  // 头像选择回调（需 wxml 中使用 <button class="avatar-wrapper" open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">）
  onChooseAvatar: function (e) {
    const url = e.detail && e.detail.avatarUrl;
    if (url) {
      this.setData({ editAvatarUrl: url });
    }
  },

  // 昵称输入回调：使用 type="nickname" 的 input，bindblur 或 bindinput
  onNickNameInput: function (e) {
    const v = (e.detail && e.detail.value) || '';
    this.setData({ editNickName: v });
  },

  // 保存资料
  onSaveProfile: function () {
    const that = this;
    const nick = (this.data.editNickName || '').trim();
    const avatar = this.data.editAvatarUrl || '';

    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const patch = {};
    if (nick.length > 0) patch.nickName = nick.substring(0, 20);
    if (avatar) patch.avatarUrl = avatar;

    if (Object.keys(patch).length === 0) {
      this.setData({ showProfileModal: false });
      return;
    }

    api.updateUser(patch).then((user) => {
      app.setLoginSession(app.globalData.openid, user || patch);
      that.setData({ showProfileModal: false });
      that.refreshUserInfo();
      wx.showToast({ title: i18n.t('common.success'), icon: 'success' });
    }).catch(() => {
      // 降级：至少本地更新
      const current = app.globalData.user || {};
      const merged = Object.assign({}, current, patch);
      app.setLoginSession(app.globalData.openid, merged);
      that.setData({ showProfileModal: false });
      that.refreshUserInfo();
      wx.showToast({ title: '已保存本地', icon: 'none' });
    });
  },

  // ========================== 手机号授权 ==========================

  // 需要：<button open-type="getPhoneNumber" bindgetphonenumber="onGetPhone">
  onGetPhone: function (e) {
    const that = this;
    const detail = e.detail || {};
    if (detail.errMsg && detail.errMsg.indexOf('ok') === -1) {
      wx.showToast({ title: '您取消了授权', icon: 'none' });
      return;
    }
    const code = detail.code;
    if (!code) {
      wx.showToast({ title: '授权无效，请重试', icon: 'none' });
      return;
    }
    api.bindPhoneNumber(code).then((res) => {
      if (res && res.phone) {
        // 本地也同步
        const current = app.globalData.user || {};
        const merged = Object.assign({}, current, { phone: res.phone });
        app.setLoginSession(app.globalData.openid, merged);
        that.refreshUserInfo();
        wx.showToast({ title: '已绑定手机号', icon: 'success' });
      } else if (res && res._mock) {
        wx.showToast({ title: '本地模式：手机号已模拟绑定', icon: 'none' });
      } else {
        wx.showToast({ title: (res && res.errorMsg) || '绑定失败', icon: 'none' });
      }
    }).catch((err) => {
      console.warn('[settings] bindPhone err:', err);
    });
  },

  // ========================== 登出 ==========================

  onLogout: function () {
    const that = this;
    wx.showModal({
      title: i18n.t('settings.logout', i18n.getLang()),
      content: '确定退出登录吗？进度数据在云端不会丢失，下次登录后会自动同步。',
      confirmText: i18n.t('common.confirm'),
      cancelText: i18n.t('common.cancel'),
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          that.refreshUserInfo();
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  },

  // ========================== 语言切换 ==========================

  onOpenLangModal: function () { this.setData({ showLangModal: true }); },
  onCloseLangModal: function () { this.setData({ showLangModal: false }); },

  onSelectLang: function (e) {
    const langCode = e.currentTarget.dataset.code;
    if (langCode === this.data.currentLang) {
      this.setData({ showLangModal: false });
      return;
    }
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
      const pages = getCurrentPages();
      pages.forEach(p => {
        if (p && typeof p.refreshLocale === 'function' && p !== this) p.refreshLocale();
      });
    } else {
      wx.showToast({ title: i18n.t('common.fail'), icon: 'error' });
    }
  },

  // ===== 其他设置 =====
  onToggleNotification: function (e) {
    const value = e.detail.value;
    this.setData({ notificationEnabled: value });
    wx.setStorageSync('ls_notification', value);
    wx.showToast({ title: value ? 'Reminder ON' : 'Reminder OFF', icon: 'none' });
  },

  onChangeReminderTime: function (e) {
    const value = e.detail.value;
    this.setData({ reminderTime: value });
    wx.setStorageSync('ls_reminder_time', value);
  },

  onChangeDailyGoal: function (e) {
    const value = e.detail.value;
    this.setData({ dailyGoal: value });
    wx.setStorageSync('ls_daily_goal', value);
  },

  onToggleTheme: function () {
    const modes = ['light', 'dark'];
    const nextMode = modes[(modes.indexOf(this.data.themeMode) + 1) % modes.length];
    this.setData({ themeMode: nextMode });
    wx.setStorageSync('ls_theme', nextMode);
    wx.showToast({ title: 'Theme: ' + nextMode, icon: 'none' });
  },

  // 真实清除缓存
  onClearCache: function () {
    const that = this;
    wx.showModal({
      title: i18n.t('settings.clearCache', i18n.getLang()),
      content: '将清除本地缓存（不影响云端数据，包括登录态、进度、录音等）',
      confirmText: i18n.t('common.confirm'),
      cancelText: i18n.t('common.cancel'),
      success: function (res) {
        if (res.confirm) {
          try { wx.clearStorageSync(); } catch (e) {}
          setTimeout(() => {
            that.calcCacheSize();
            that.initData();
            that.refreshUserInfo();
            wx.showToast({
              title: i18n.t('toast.cacheCleared'),
              icon: 'success'
            });
          }, 400);
        }
      }
    });
  },

  // ===== 关于 / 隐私 / 反馈 =====
  onAbout: function () {
    const openid = app.globalData.openid || wx.getStorageSync('ls_openid') || '未登录';
    const env = CONFIG.isCloudConfigured() ? '已配置' : '未配置(降级模式)';
    wx.showModal({
      title: 'LinguaSpeak',
      content: `版本: 1.0.0\n云环境: ${env}\n用户ID: ${openid.substring(0, 12)}${openid.length > 12 ? '...' : ''}\n\n© 2025 LinguaSpeak`,
      showCancel: false,
      confirmText: i18n.t('common.confirm')
    });
  },

  onPrivacy: function () {
    wx.showModal({
      title: i18n.t('settings.privacy', i18n.getLang()),
      content: '我们重视您的隐私。\n- 语音文件仅用于发音评分，不对外公开。\n- 学习数据仅用于您个人的进度同步。\n- 不会将您的信息分享给任何第三方。',
      showCancel: false
    });
  },

  onFeedback: function () {
    wx.showModal({
      title: i18n.t('settings.feedback', i18n.getLang()),
      content: '反馈邮箱：feedback@linguaspeak.com\n在微信小程序后台也可直接留言。',
      showCancel: false
    });
  },

  noop: function () {},

  onGoRead: function () {
    wx.navigateTo({ url: '/pages/read/read?plan=settings' });
  }
});
