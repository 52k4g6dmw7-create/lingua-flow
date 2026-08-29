// pages/discover/discover.js
const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    // 推荐课程
    recommendedCourses: [],
    // 热门课程
    hotCourses: [],
    // 新上架课程
    newCourses: [],
    // 分类
    categories: [],
    // 当前筛选分类
    activeCategory: 'all',
    // 搜索关键词
    searchKeyword: '',
    // 轮播图
    banners: []
  },

  onLoad: function () {
    this.initData();
  },

  onShow: function () {
    this.refreshLocale();
  },

  initData: function () {
    this.refreshLocale();
    this.loadContent();
  },

  refreshLocale: function () {
    const locale = i18n.getLocale();
    const lang = i18n.getLang();
    this.setData({
      locale: locale,
      currentLang: lang
    });
    wx.setNavigationBarTitle({
      title: i18n.t('tabBar.discover', lang)
    });
  },

  // 加载内容
  loadContent: function () {
    const lang = this.data.currentLang;

    // 多语言课程名称映射
    const courseNames = {
      zh: {
        'business': '商务英语演讲',
        'daily': '日常对话实战',
        'interview': '面试自我介绍',
        'debate': '英语辩论技巧',
        'story': '儿童英语故事',
        'news': '新闻英语听力',
        'poem': '经典诗歌朗诵',
        'speech': 'TED风格演讲',
        'grammar': '语法发音纠正',
        'accent': '口音消除训练'
      },
      en: {
        'business': 'Business Speech',
        'daily': 'Daily Conversation',
        'interview': 'Interview Prep',
        'debate': 'English Debate',
        'story': 'Kids Story Time',
        'news': 'News English',
        'poem': 'Poetry Reading',
        'speech': 'TED Style Talk',
        'grammar': 'Grammar & Pronunciation',
        'accent': 'Accent Reduction'
      },
      ja: {
        'business': 'ビジネス英語スピーチ',
        'daily': '日常英会話',
        'interview': '面接対策',
        'debate': '英語ディベート',
        'story': 'キッズ英語物語',
        'news': 'ニュース英語',
        'poem': '詩の朗読',
        'speech': 'TEDスタイルスピーチ',
        'grammar': '文法発音矯正',
        'accent': 'アクセント改善'
      },
      ko: {
        'business': '비즈니스 영어 스피치',
        'daily': '일상 회화',
        'interview': '면접 준비',
        'debate': '영어 토론',
        'story': '어린이 영어 동화',
        'news': '뉴스 영어',
        'poem': '시 낭송',
        'speech': 'TED 스타일 연설',
        'grammar': '문법 발음 교정',
        'accent': '억양 교정'
      },
      fr: {
        'business': 'Discours d\'affaires',
        'daily': 'Conversation quotidienne',
        'interview': 'Préparation entretien',
        'debate': 'Débat anglais',
        'story': 'Histoires pour enfants',
        'news': 'Actualités anglaises',
        'poem': 'Lecture de poèmes',
        'speech': 'Discours style TED',
        'grammar': 'Grammaire & Prononciation',
        'accent': 'Réduction d\'accent'
      }
    };

    const names = courseNames[lang] || courseNames.en;
    const difficultyLabels = {
      zh: ['入门', '进阶', '高级'],
      en: ['Beginner', 'Intermediate', 'Advanced'],
      ja: ['初級', '中級', '上級'],
      ko: ['초급', '중급', '고급'],
      fr: ['Débutant', 'Intermédiaire', 'Avancé']
    };
    const diff = difficultyLabels[lang] || difficultyLabels.en;

    const banners = [
      { id: 1, title: '5-Day Challenge', subtitle: 'Master daily conversations', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🚀' },
      { id: 2, title: 'New Courses', subtitle: '10+ fresh speaking topics', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '✨' },
      { id: 3, title: 'Pronunciation', subtitle: 'AI feedback on every sound', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🎯' }
    ];

    const recommendedCourses = [
      { id: 1, key: 'interview', name: names['interview'] || 'Interview Prep', difficulty: 1, difficultyLabel: diff[0], students: 12840, lessons: 15, duration: '5h', category: 'career', color: '#2ecc71' },
      { id: 2, key: 'daily', name: names['daily'] || 'Daily Conversation', difficulty: 0, difficultyLabel: diff[0], students: 23560, lessons: 20, duration: '6h', category: 'daily', color: '#3498db' },
      { id: 3, key: 'speech', name: names['speech'] || 'TED Style Talk', difficulty: 2, difficultyLabel: diff[2], students: 8920, lessons: 12, duration: '8h', category: 'speech', color: '#e67e22' }
    ];

    const hotCourses = [
      { id: 4, key: 'business', name: names['business'], difficulty: 2, difficultyLabel: diff[2], students: 35120, lessons: 18, duration: '10h', category: 'career', color: '#9b59b6', hot: true },
      { id: 5, key: 'debate', name: names['debate'], difficulty: 2, difficultyLabel: diff[2], students: 18340, lessons: 14, duration: '7h', category: 'speech', color: '#e74c3c', hot: true },
      { id: 6, key: 'news', name: names['news'], difficulty: 1, difficultyLabel: diff[1], students: 22180, lessons: 30, duration: '12h', category: 'listening', color: '#1abc9c', hot: false },
      { id: 7, key: 'grammar', name: names['grammar'], difficulty: 0, difficultyLabel: diff[0], students: 45720, lessons: 25, duration: '9h', category: 'basic', color: '#f39c12', hot: true }
    ];

    const newCourses = [
      { id: 8, key: 'poem', name: names['poem'], difficulty: 1, difficultyLabel: diff[1], students: 2340, lessons: 10, duration: '4h', category: 'culture', color: '#8e44ad', isNew: true },
      { id: 9, key: 'accent', name: names['accent'], difficulty: 2, difficultyLabel: diff[2], students: 1280, lessons: 16, duration: '6h', category: 'basic', color: '#16a085', isNew: true },
      { id: 10, key: 'story', name: names['story'], difficulty: 0, difficultyLabel: diff[0], students: 4560, lessons: 24, duration: '5h', category: 'kids', color: '#2980b9', isNew: true }
    ];

    const categories = [
      { key: 'all', label: lang === 'zh' ? '全部' : lang === 'en' ? 'All' : lang === 'ja' ? 'すべて' : lang === 'ko' ? '전체' : 'Tout', icon: '🌟' },
      { key: 'daily', label: lang === 'zh' ? '日常' : lang === 'en' ? 'Daily' : lang === 'ja' ? '日常' : lang === 'ko' ? '일상' : 'Quotidien', icon: '☕' },
      { key: 'career', label: lang === 'zh' ? '职场' : lang === 'en' ? 'Career' : lang === 'ja' ? '仕事' : lang === 'ko' ? '직장' : 'Carrière', icon: '💼' },
      { key: 'speech', label: lang === 'zh' ? '演讲' : lang === 'en' ? 'Speech' : lang === 'ja' ? 'スピーチ' : lang === 'ko' ? '연설' : 'Discours', icon: '🎤' },
      { key: 'listening', label: lang === 'zh' ? '听力' : lang === 'en' ? 'Listening' : lang === 'ja' ? 'リスニング' : lang === 'ko' ? '듣기' : 'Écoute', icon: '🎧' },
      { key: 'kids', label: lang === 'zh' ? '少儿' : lang === 'en' ? 'Kids' : lang === 'ja' ? 'キッズ' : lang === 'ko' ? '키즈' : 'Enfants', icon: '🧒' }
    ];

    this.setData({
      banners: banners,
      recommendedCourses: recommendedCourses,
      hotCourses: hotCourses,
      newCourses: newCourses,
      categories: categories
    });
  },

  // 搜索输入
  onSearchInput: function (e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearchConfirm: function () {
    wx.showToast({
      title: 'Search: ' + this.data.searchKeyword,
      icon: 'none'
    });
  },

  // 分类选择
  onSelectCategory: function (e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeCategory: key });
    wx.showToast({
      title: this.data.categories.find(c => c.key === key).label,
      icon: 'none'
    });
  },

  // Banner点击
  onBannerTap: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: 'Banner ' + id, icon: 'none' });
  },

  // 课程点击
  onCourseTap: function (e) {
    const courseId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/read/read?plan=course_' + courseId
    });
  },

  // 参加课程
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
          wx.showToast({
            title: this.data.locale.common.success,
            icon: 'success'
          });
        }
      }
    });
  },

  // FAB跳转到朗读
  onGoRead: function () {
    wx.navigateTo({
      url: '/pages/read/read?plan=discover'
    });
  }
});
