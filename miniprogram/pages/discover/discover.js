// pages/discover/discover.js
// 动态课程版本：优先调用 listCourses 云函数从数据库/内置数据返回课程，
// 失败时保留原静态数据兜底，保证页面不会空。

const app = getApp();
const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

// 静态兜底（云函数内部也有，但前端再保留一层最稳）
const STATIC_FALLBACK = (lang) => {
  const courseNames = {
    zh: { business:'商务英语演讲', daily:'日常对话实战', interview:'面试自我介绍',
          debate:'英语辩论技巧', story:'儿童英语故事', news:'新闻英语听力',
          poem:'经典诗歌朗诵', speech:'TED风格演讲', grammar:'语法发音纠正', accent:'口音消除训练' },
    en: { business:'Business Speech', daily:'Daily Conversation', interview:'Interview Prep',
          debate:'English Debate', story:'Kids Story Time', news:'News English',
          poem:'Poetry Reading', speech:'TED Style Talk', grammar:'Grammar & Pronunciation', accent:'Accent Reduction' },
    ja: { business:'ビジネス英語スピーチ', daily:'日常英会話', interview:'面接対策',
          debate:'英語ディベート', story:'キッズ英語物語', news:'ニュース英語',
          poem:'詩の朗読', speech:'TEDスタイルスピーチ', grammar:'文法発音矯正', accent:'アクセント改善' },
    ko: { business:'비즈니스 영어 스피치', daily:'일상 회화', interview:'면접 준비',
          debate:'영어 토론', story:'어린이 영어 동화', news:'뉴스 영어',
          poem:'시 낭송', speech:'TED 스타일 연설', grammar:'문법 발음 교정', accent:'억양 교정' },
    fr: { business:'Discours d\'affaires', daily:'Conversation quotidienne', interview:'Préparation entretien',
          debate:'Débat anglais', story:'Histoires pour enfants', news:'Actualités anglaises',
          poem:'Lecture de poèmes', speech:'Discours style TED', grammar:'Grammaire & Prononciation', accent:'Réduction d\'accent' }
  };
  const names = courseNames[lang] || courseNames.en;
  const diff = {
    zh: ['入门','进阶','高级'], en: ['Beginner','Intermediate','Advanced'],
    ja: ['初級','中級','上級'], ko: ['초급','중급','고급'], fr: ['Débutant','Intermédiaire','Avancé']
  }[lang] || ['Beginner','Intermediate','Advanced'];

  return {
    banners: [
      { id: 'ielts', title: 'IELTS Speaking Zone', subtitle: '4.5 → 7.5+ band-by-band training', gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 60%, #6a82fb 100%)', icon: '🏅', jumpIelts: true },
      { id: 2, title: 'New Courses', subtitle: '10+ fresh speaking topics', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '✨' },
      { id: 3, title: 'Pronunciation', subtitle: 'AI feedback on every sound', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🎯' }
    ],
    recommended: [
      { id: 'ielts_6_5_r',  key: 'ielts_6_5', name: (lang==='zh'?'雅思高分冲刺 6.5-7.0':'IELTS 6.5-7.0 High Scorer'), difficulty: 2, difficultyLabel: diff[2], students: 15420, lessons: 48, duration: '24h', category: 'ielts', color: '#8e44ad', ielts: true },
      { id: 1, key: 'interview', name: names.interview, difficulty: 1, difficultyLabel: diff[1], students: 12840, lessons: 15, duration: '5h', category: 'career', color: '#2ecc71' },
      { id: 2, key: 'daily',     name: names.daily,     difficulty: 0, difficultyLabel: diff[0], students: 23560, lessons: 20, duration: '6h', category: 'daily',  color: '#3498db' },
      { id: 3, key: 'speech',    name: names.speech,    difficulty: 2, difficultyLabel: diff[2], students: 8920,  lessons: 12, duration: '8h', category: 'speech', color: '#e67e22' }
    ],
    hot: [
      { id: 'ielts_5_5_h',  key: 'ielts_5_5', name: (lang==='zh'?'雅思进阶 5.5-6.0 提分营':'IELTS 5.5-6.0 Bootcamp'), difficulty: 1, difficultyLabel: diff[1], students: 48260, lessons: 42, duration: '20h', category: 'ielts', color: '#2980b9', hot: true, ielts: true },
      { id: 4, key: 'business', name: names.business, difficulty: 2, difficultyLabel: diff[2], students: 35120, lessons: 18, duration: '10h', category: 'career', color: '#9b59b6', hot: true },
      { id: 5, key: 'debate',   name: names.debate,   difficulty: 2, difficultyLabel: diff[2], students: 18340, lessons: 14, duration: '7h',  category: 'speech', color: '#e74c3c', hot: true },
      { id: 6, key: 'news',     name: names.news,     difficulty: 1, difficultyLabel: diff[1], students: 22180, lessons: 30, duration: '12h', category: 'listening', color: '#1abc9c' },
      { id: 7, key: 'grammar',  name: names.grammar,  difficulty: 0, difficultyLabel: diff[0], students: 45720, lessons: 25, duration: '9h',  category: 'basic', color: '#f39c12', hot: true }
    ],
    newCourses: [
      { id: 'ielts_7_5_n',  key: 'ielts_7_5', name: (lang==='zh'?'雅思冲刺 7.5+ 高分专项':'IELTS 7.5+ Masterclass'), difficulty: 2, difficultyLabel: diff[2], students: 3120, lessons: 36, duration: '18h', category: 'ielts', color: '#c0392b', isNew: true, ielts: true },
      { id: 8,  key: 'poem',   name: names.poem,   difficulty: 1, difficultyLabel: diff[1], students: 2340, lessons: 10, duration: '4h', category: 'culture', color: '#8e44ad', isNew: true },
      { id: 9,  key: 'accent', name: names.accent, difficulty: 2, difficultyLabel: diff[2], students: 1280, lessons: 16, duration: '6h', category: 'basic',   color: '#16a085', isNew: true },
      { id: 10, key: 'story',  name: names.story,  difficulty: 0, difficultyLabel: diff[0], students: 4560, lessons: 24, duration: '5h', category: 'kids',    color: '#2980b9', isNew: true }
    ],
    categories: [
      { key: 'all',       label: lang==='zh'?'全部':lang==='en'?'All':lang==='ja'?'すべて':lang==='ko'?'전체':'Tout',      icon: '🌟' },
      { key: 'ielts',     label: lang==='zh'?'雅思':lang==='en'?'IELTS':lang==='ja'?'IELTS':lang==='ko'?'IELTS':'IELTS',   icon: '🏅' },
      { key: 'daily',     label: lang==='zh'?'日常':lang==='en'?'Daily':lang==='ja'?'日常':lang==='ko'?'일상':'Quotidien', icon: '☕' },
      { key: 'career',    label: lang==='zh'?'职场':lang==='en'?'Career':lang==='ja'?'仕事':lang==='ko'?'직장':'Carrière', icon: '💼' },
      { key: 'speech',    label: lang==='zh'?'演讲':lang==='en'?'Speech':lang==='ja'?'スピーチ':lang==='ko'?'연설':'Discours', icon: '🎤' },
      { key: 'listening', label: lang==='zh'?'听力':lang==='en'?'Listening':lang==='ja'?'リスニング':lang==='ko'?'듣기':'Écoute', icon: '🎧' },
      { key: 'kids',      label: lang==='zh'?'少儿':lang==='en'?'Kids':lang==='ja'?'キッズ':lang==='ko'?'키즈':'Enfants',   icon: '🧒' }
    ]
  };
};

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    recommendedCourses: [],
    hotCourses: [],
    newCourses: [],
    categories: [],
    activeCategory: 'all',
    searchKeyword: '',
    banners: [],
    loading: true,
    // 雅思 4 个级别
    ieltsLevels: []
  },

  onLoad: function () { this.initData(); },
  onShow: function () { this.refreshLocale(); this.refreshIeltsLevels(); },

  initData: function () {
    this.refreshLocale();
    this.refreshIeltsLevels();
    this.loadContent();
  },

  refreshLocale: function () {
    const locale = i18n.getLocale();
    const lang = i18n.getLang();
    this.setData({ locale: locale, currentLang: lang });
    wx.setNavigationBarTitle({ title: i18n.t('tabBar.discover', lang) });
  },

  // 把 app.globalData.ieltsLevelsMeta 按当前语言翻译成视图层
  refreshIeltsLevels: function () {
    const lang = i18n.getLang();
    const meta = (app.globalData && app.globalData.ieltsLevelsMeta) || [];
    const list = meta.map(m => {
      const dict = (m[lang] || m.en || m.zh || {});
      return Object.assign({}, m, {
        displayName: dict.name || m.key,
        displayDesc: dict.desc || m.targetScenario || ''
      });
    });
    this.setData({ ieltsLevels: list });
  },

  onOpenIeltsZone: function () {
    const meta = (app.globalData && app.globalData.ieltsLevelsMeta) || [];
    const lang = i18n.getLang();
    const names = meta.map(m => {
      const d = (m[lang] || m.en || m.zh || {});
      return `🎯 Band ${m.band} — ${d.name || m.key}`;
    });
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const m = meta[res.tapIndex];
        if (m) this.onIeltsLevelTap({ currentTarget: { dataset: { key: m.key } } });
      }
    });
  },

  onIeltsLevelTap: function (e) {
    // 直接跳 read 页加载对应雅思级别题库
    const key = e.currentTarget.dataset.key;
    const block = app.requireVip();
    if (block && block.blocked) {
      wx.showModal({
        title: block.title,
        content: block.content,
        confirmText: block.confirmText || (i18n.getLang()==='zh'?'开通会员':'Upgrade'),
        cancelText: i18n.getLang()==='zh'?'稍后':'Later',
        success(res){
          if (res.confirm) wx.navigateTo({ url: '/pages/vip/vip?from=ielts' });
        }
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/read/read?plan=' + encodeURIComponent(key) + '&lang=en'
    });
  },

  // 真实动态加载：分别加载 recommended、hot、new
  loadContent: function () {
    const that = this;
    const lang = this.data.currentLang;
    this.setData({ loading: true });

    const fb = STATIC_FALLBACK(lang);

    const loadType = (type, fallback) => {
      return api.listCourses({
        lang: lang,
        category: 'all',
        type: type,
        limit: 10,
        fallback: { list: fallback, banners: [], hasMore: false, total: fallback.length }
      }).then(res => {
        const list = (res && res.list) || fallback;
        const banners = (res && res.banners) || [];
        return { list, banners };
      }).catch(() => ({ list: fallback, banners: [] }));
    };

    Promise.all([
      loadType('recommended', fb.recommended),
      loadType('hot', fb.hot),
      loadType('new', fb.newCourses)
    ]).then(([rec, hot, nlist]) => {
      that.setData({
        banners: (rec.banners && rec.banners.length) ? rec.banners : fb.banners,
        recommendedCourses: rec.list || fb.recommended,
        hotCourses: hot.list || fb.hot,
        newCourses: nlist.list || fb.newCourses,
        categories: fb.categories,
        loading: false
      });
    }).catch(() => {
      // 终极兜底
      that.setData({
        banners: fb.banners,
        recommendedCourses: fb.recommended,
        hotCourses: fb.hot,
        newCourses: fb.newCourses,
        categories: fb.categories,
        loading: false
      });
    });
  },

  onSearchInput: function (e) { this.setData({ searchKeyword: e.detail.value }); },
  onSearchConfirm: function () {
    const kw = (this.data.searchKeyword || '').trim();
    if (!kw) { wx.showToast({ title: '请输入关键词', icon: 'none' }); return; }
    wx.showToast({ title: 'Search: ' + kw, icon: 'none' });
  },

  onSelectCategory: function (e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeCategory: key });
    const label = (this.data.categories.find(c => c.key === key) || {}).label || key;
    wx.showToast({ title: label, icon: 'none' });
  },

  onBannerTap: function (e) {
    const id = e.currentTarget.dataset.id;
    const banners = this.data.banners || [];
    const item = banners.find(b => String(b.id) === String(id)) || {};
    if (item.jumpIelts) {
      this.onOpenIeltsZone();
      return;
    }
    wx.showToast({ title: 'Banner ' + id, icon: 'none' });
  },

  onCourseTap: function (e) {
    const that = this;
    const courseId = e.currentTarget.dataset.id;
    const courseKey = e.currentTarget.dataset.key;
    // 会员拦截：进入朗读训练
    const block = app.requireVip();
    if (block && block.blocked) {
      wx.showModal({
        title: block.title,
        content: block.content,
        confirmText: block.confirmText || (i18n.getLang()==='zh'?'开通会员':'Upgrade'),
        cancelText: i18n.getLang()==='zh'?'稍后':'Later',
        success(res){
          if (res.confirm) wx.navigateTo({ url: '/pages/vip/vip?from=discover' });
        }
      });
      return;
    }
    // 先尝试通过 key 在 trainingLibrary 里找对应语言的例句
    const pageLang = this.data.currentLang;
    const lib = app.globalData.trainingLibrary;
    // 简单映射：如果 key === interview，跳到 interview；其他 key 先给一个通用的 interview 兜底
    const planKey = (lib && lib[courseKey]) ? courseKey : 'interview';
    if (!lib[planKey] || !lib[planKey][pageLang]) {
      // 没对应语种的内置内容，也允许跳，read页会回退到 en/zh
    }
    wx.navigateTo({
      url: '/pages/read/read?plan=' + encodeURIComponent(courseKey || ('course_' + courseId))
    });
  },

  onEnroll: function (e) {
    e.stopPropagation && e.stopPropagation();
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: this.data.locale.discover.enroll,
      content: `Enroll in "${name}"?`,
      confirmText: this.data.locale.common.confirm,
      cancelText: this.data.locale.common.cancel,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: this.data.locale.common.success, icon: 'success' });
        }
      }
    });
  },

  onGoRead: function () {
    const block = app.requireVip();
    if (block && block.blocked) {
      wx.showModal({
        title: block.title,
        content: block.content,
        confirmText: block.confirmText || (i18n.getLang()==='zh'?'开通会员':'Upgrade'),
        cancelText: i18n.getLang()==='zh'?'稍后':'Later',
        success(res){
          if (res.confirm) wx.navigateTo({ url: '/pages/vip/vip?from=discover' });
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/read/read?plan=discover' });
  }
});
