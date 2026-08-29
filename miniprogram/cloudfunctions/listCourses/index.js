// cloudfunctions/listCourses/index.js
// 发现页动态课程：
//  - 如果数据库 courses 集合中有记录（管理员运营录入），则按条件查库返回
//  - 如果集合为空（未初始化），则返回内置静态课程数据（保证小程序不空页面）
// 这样可以：首次无需手动建库就能上线，后续管理员在云控制台录入后自动切换为运营内容。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTION = 'courses';

const STATIC = {
  banners: [
    { id: 1, title: '5-Day Challenge', subtitle: 'Master daily conversations', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🚀' },
    { id: 2, title: 'New Courses', subtitle: '10+ fresh speaking topics', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '✨' },
    { id: 3, title: 'Pronunciation', subtitle: 'AI feedback on every sound', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🎯' }
  ],
  recommended: [
    { id: 'r1', key: 'interview', nameI18nKey: 'c_interview', difficulty: 1, students: 12840, lessons: 15, duration: '5h', category: 'career', color: '#2ecc71' },
    { id: 'r2', key: 'daily', nameI18nKey: 'c_daily', difficulty: 0, students: 23560, lessons: 20, duration: '6h', category: 'daily', color: '#3498db' },
    { id: 'r3', key: 'speech', nameI18nKey: 'c_speech', difficulty: 2, students: 8920, lessons: 12, duration: '8h', category: 'speech', color: '#e67e22' }
  ],
  hot: [
    { id: 'h1', key: 'business', nameI18nKey: 'c_business', difficulty: 2, students: 35120, lessons: 18, duration: '10h', category: 'career', color: '#9b59b6', hot: true },
    { id: 'h2', key: 'debate', nameI18nKey: 'c_debate', difficulty: 2, students: 18340, lessons: 14, duration: '7h', category: 'speech', color: '#e74c3c', hot: true },
    { id: 'h3', key: 'news', nameI18nKey: 'c_news', difficulty: 1, students: 22180, lessons: 30, duration: '12h', category: 'listening', color: '#1abc9c' },
    { id: 'h4', key: 'grammar', nameI18nKey: 'c_grammar', difficulty: 0, students: 45720, lessons: 25, duration: '9h', category: 'basic', color: '#f39c12', hot: true }
  ],
  newCourses: [
    { id: 'n1', key: 'poem', nameI18nKey: 'c_poem', difficulty: 1, students: 2340, lessons: 10, duration: '4h', category: 'culture', color: '#8e44ad', isNew: true },
    { id: 'n2', key: 'accent', nameI18nKey: 'c_accent', difficulty: 2, students: 1280, lessons: 16, duration: '6h', category: 'basic', color: '#16a085', isNew: true },
    { id: 'n3', key: 'story', nameI18nKey: 'c_story', difficulty: 0, students: 4560, lessons: 24, duration: '5h', category: 'kids', color: '#2980b9', isNew: true }
  ]
};

const NAME_I18N = {
  zh: {
    c_business: '商务英语演讲', c_daily: '日常对话实战', c_interview: '面试自我介绍',
    c_debate: '英语辩论技巧', c_story: '儿童英语故事', c_news: '新闻英语听力',
    c_poem: '经典诗歌朗诵', c_speech: 'TED风格演讲', c_grammar: '语法发音纠正',
    c_accent: '口音消除训练'
  },
  en: {
    c_business: 'Business Speech', c_daily: 'Daily Conversation', c_interview: 'Interview Prep',
    c_debate: 'English Debate', c_story: 'Kids Story Time', c_news: 'News English',
    c_poem: 'Poetry Reading', c_speech: 'TED Style Talk', c_grammar: 'Grammar & Pronunciation',
    c_accent: 'Accent Reduction'
  },
  ja: {
    c_business: 'ビジネス英語スピーチ', c_daily: '日常英会話', c_interview: '面接対策',
    c_debate: '英語ディベート', c_story: 'キッズ英語物語', c_news: 'ニュース英語',
    c_poem: '詩の朗読', c_speech: 'TEDスタイルスピーチ', c_grammar: '文法発音矯正',
    c_accent: 'アクセント改善'
  },
  ko: {
    c_business: '비즈니스 영어 스피치', c_daily: '일상 회화', c_interview: '면접 준비',
    c_debate: '영어 토론', c_story: '어린이 영어 동화', c_news: '뉴스 영어',
    c_poem: '시 낭송', c_speech: 'TED 스타일 연설', c_grammar: '문법 발음 교정',
    c_accent: '억양 교정'
  },
  fr: {
    c_business: 'Discours d\'affaires', c_daily: 'Conversation quotidienne', c_interview: 'Préparation entretien',
    c_debate: 'Débat anglais', c_story: 'Histoires pour enfants', c_news: 'Actualités anglaises',
    c_poem: 'Lecture de poèmes', c_speech: 'Discours style TED', c_grammar: 'Grammaire & Prononciation',
    c_accent: 'Réduction d\'accent'
  }
};

const DIFFICULTY = {
  zh: ['入门', '进阶', '高级'],
  en: ['Beginner', 'Intermediate', 'Advanced'],
  ja: ['初級', '中級', '上級'],
  ko: ['초급', '중급', '고급'],
  fr: ['Débutant', 'Intermédiaire', 'Avancé']
};

function localizeList(list, lang) {
  const names = NAME_I18N[lang] || NAME_I18N.en;
  const diff = DIFFICULTY[lang] || DIFFICULTY.en;
  return list.map(c => Object.assign({}, c, {
    name: (c.nameI18nKey && names[c.nameI18nKey]) || c.name || c.key || 'Course',
    difficultyLabel: diff[c.difficulty] || diff[0]
  }));
}

async function tryGetFromDB() {
  try {
    // 检查集合存在 + 有数据
    const r = await db.collection(COLLECTION).limit(1).get();
    return !!(r && r.data && r.data.length);
  } catch (e) {
    return false;
  }
}

exports.main = async (event) => {
  const lang = event.lang || 'zh';
  const category = event.category || 'all';
  const type = event.type || 'recommended'; // recommended / hot / new
  const limit = Math.max(1, Math.min(50, Number(event.limit) || 10));
  const skip = Math.max(0, Number(event.skip) || 0);

  try {
    const hasDB = await tryGetFromDB();
    if (!hasDB) {
      // 集合不存在或无数据：返回内置静态数据 + 标记 _builtIn
      let list;
      if (type === 'hot') list = STATIC.hot;
      else if (type === 'new') list = STATIC.newCourses;
      else list = STATIC.recommended;

      if (category !== 'all') {
        list = list.filter(c => c.category === category);
      }
      const total = list.length;
      const paged = list.slice(skip, skip + limit);

      return {
        errorCode: 0,
        errorMsg: '',
        list: localizeList(paged, lang),
        banners: STATIC.banners,
        hasMore: skip + limit < total,
        total,
        _builtIn: true
      };
    }

    // === 查库 ===
    let where = {};
    if (category !== 'all') where.category = category;

    const collection = db.collection(COLLECTION);
    let query = collection.where(where);

    // 排序：hot -> students desc; new -> createdAt desc; 推荐 -> recommend desc
    if (type === 'hot') query = query.orderBy('students', 'desc');
    else if (type === 'new') query = query.orderBy('createdAt', 'desc');
    else query = query.orderBy('recommend', 'desc');

    const [countRes, pageRes] = await Promise.all([
      collection.where(where).count(),
      query.skip(skip).limit(limit).get()
    ]);

    const raw = (pageRes && pageRes.data) || [];
    const localized = raw.map(c => {
      const names = NAME_I18N[lang] || NAME_I18N.en;
      const diff = DIFFICULTY[lang] || DIFFICULTY.en;
      return Object.assign({}, c, {
        name: (c[`name_${lang}`]) || c.name || (c.nameI18nKey && names[c.nameI18nKey]) || 'Course',
        difficultyLabel: diff[Number(c.difficulty) || 0] || diff[0]
      });
    });

    const total = (countRes && countRes.total) || 0;
    return {
      errorCode: 0,
      errorMsg: '',
      list: localized,
      banners: STATIC.banners,
      hasMore: skip + limit < total,
      total
    };
  } catch (e) {
    console.error('[listCourses]', e && e.errMsg || e);
    // 即使数据库报错，至少返回静态数据保证小程序可用
    let list = STATIC.recommended;
    if (category !== 'all') list = list.filter(c => c.category === category);
    return {
      errorCode: 0,
      errorMsg: '',
      list: localizeList(list.slice(skip, skip + limit), lang),
      banners: STATIC.banners,
      hasMore: false,
      total: list.length,
      _builtIn: true,
      _fallback: true
    };
  }
};
