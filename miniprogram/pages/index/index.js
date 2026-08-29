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
    // IELTS 目标级别
    currentIelts: {
      key: 'ielts_5_5',
      shortBand: '5.5-6.0',
      color: '#2980b9',
      displayName: 'IELTS 5.5-6.0',
      displayDesc: ''
    },
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
    // 读取本地存储的雅思目标级别（先读，refreshLocale 需要用它拼装显示名称）
    try {
      const savedKey = wx.getStorageSync('ls_ielts_target');
      if (savedKey) {
        this._ieltsTargetKey = savedKey;
      }
    } catch (e) {}
    this.refreshLocale();
    this.loadProgress();
  },

  // 辅助：根据 key 组装雅思级别展示对象（按当前语言本地化）
  _buildIeltsDisplay: function (key, lang) {
    const meta = (app.globalData.ieltsLevelsMeta || []).find(m => m.key === key);
    if (!meta) {
      // 兜底：进阶级
      return {
        key: 'ielts_5_5',
        shortBand: '5.5-6.0',
        color: '#2980b9',
        displayName: 'IELTS 5.5-6.0',
        displayDesc: ''
      };
    }
    const l10n = meta[lang] || meta.en || {};
    return {
      key: meta.key,
      shortBand: meta.shortBand,
      color: meta.color,
      displayName: l10n.name || meta.en.name,
      displayDesc: l10n.desc || meta.en.desc
    };
  },

  // 刷新语言包
  refreshLocale: function () {
    const locale = i18n.getLocale();
    const currentLang = i18n.getLang();
    const ieltsKey = this._ieltsTargetKey || wx.getStorageSync('ls_ielts_target') || 'ielts_5_5';
    const ieltsDisplay = this._buildIeltsDisplay(ieltsKey, currentLang);
    this.setData({
      locale: locale,
      currentLang: currentLang,
      currentPlanName: i18n.t('home.' + this.data.currentPlanKey, currentLang),
      currentIelts: ieltsDisplay
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

  // 设定雅思目标分级别
  onSetIeltsTarget: function () {
    const currentLang = i18n.getLang();
    const levels = app.globalData.ieltsLevelsMeta || [];
    if (levels.length === 0) {
      wx.showToast({ title: 'IELTS data missing', icon: 'none' });
      return;
    }
    const itemList = levels.map(m => {
      const l10n = m[currentLang] || m.en || {};
      const name = l10n.name || m.en.name;
      return `Band ${m.shortBand} · ${name}`;
    });
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selected = levels[res.tapIndex];
        if (!selected) return;
        // 持久化用户选择
        try {
          wx.setStorageSync('ls_ielts_target', selected.key);
        } catch (e) {}
        this._ieltsTargetKey = selected.key;
        // 刷新显示
        const display = this._buildIeltsDisplay(selected.key, currentLang);
        // 同时把今日训练计划切换为对应的雅思级别句库
        const planName = (selected[currentLang] && selected[currentLang].name)
          || (selected.en && selected.en.name)
          || `IELTS ${selected.shortBand}`;
        this.setData({
          currentIelts: display,
          currentPlanKey: selected.key,
          currentPlanName: planName
        });
        wx.showToast({
          title: `Band ${selected.shortBand} ✓`,
          icon: 'success'
        });
        // 同步到云端 progress.ieltsTarget（异步，不阻塞 UI；失败自动保留本地）
        try {
          app.updateProgress({ ieltsTarget: selected.key });
        } catch (e) {
          console.warn('[index] sync ieltsTarget fail:', e);
        }
      }
    });
  },

  // 开始朗读
  onStartRead: function (e) {
    // 1) 优先从事件 data-plan 取值（雅思目标卡片按钮会显式指定）
    let planKey = e && e.currentTarget && e.currentTarget.dataset
      && e.currentTarget.dataset.plan;
    const currentLang = i18n.getLang();
    // 2) 否则，如果当前语言=en 且用户设置过雅思目标，则默认走雅思级别句库
    if (!planKey) {
      const savedIeltsKey = this._ieltsTargetKey
        || wx.getStorageSync('ls_ielts_target');
      if (currentLang === 'en' && savedIeltsKey) {
        planKey = savedIeltsKey;
      }
    }
    // 3) 兜底：使用训练计划卡片选中的 key
    if (!planKey) {
      planKey = this.data.currentPlanKey;
    }
    const block = app.requireVip();
    if (block && block.blocked) {
      wx.showModal({
        title: block.title,
        content: block.content,
        confirmText: block.confirmText || (currentLang==='zh'?'开通会员':'Upgrade'),
        cancelText: currentLang==='zh'?'稍后':'Later',
        success(res){
          if (res.confirm) wx.navigateTo({ url: '/pages/vip/vip?from=index' });
        }
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/read/read?plan=' + encodeURIComponent(planKey)
    });
  },

  // 多语言切换快捷入口
  onQuickLang: function () {
    wx.navigateTo({
      url: '/pages/settings/settings?lang=1'
    });
  }
});
