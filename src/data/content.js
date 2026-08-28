// Multi-language learning platform sample data

export const LANGUAGES = [
  { code: 'en', name: '英语', englishName: 'English', flag: '🇺🇸', color: '#4f46e5', cefr: ['A1', 'A2', 'B1', 'B2', 'C1'] },
  { code: 'ja', name: '日语', englishName: 'Japanese', flag: '🇯🇵', color: '#e11d48', cefr: ['N5', 'N4', 'N3', 'N2', 'N1'] },
  { code: 'ko', name: '韩语', englishName: 'Korean', flag: '🇰🇷', color: '#9333ea', cefr: ['TOPIK 1', 'TOPIK 2', 'TOPIK 3', 'TOPIK 4', 'TOPIK 5'] },
]

export const LEVELS = ['A1 入门', 'A2 初级', 'B1 中级', 'B2 中高级', 'C1 高级']

export const COURSES = [
  {
    id: 'en-b1',
    language: 'en',
    level: 'B1 中级',
    title: '英语口语进阶',
    subtitle: '日常对话与流利表达',
    description: '聚焦真实生活场景，从点餐、旅行到职场沟通，掌握地道英语表达，告别哑巴英语。',
    lessons: 24,
    hours: 18,
    students: 12840,
    rating: 4.9,
    progress: 65,
    skills: ['口语', '听力', '词汇'],
    cover: 'gradient-en',
    lessonsData: [
      { id: 'en-b1-l1', title: '餐厅点餐与服务对话', type: 'speaking', xp: 60, done: true },
      { id: 'en-b1-l2', title: '高频生活动词 Serendipity', type: 'word', xp: 40, done: true },
      { id: 'en-b1-l3', title: '现在完成时 实战练习', type: 'grammar', xp: 50, done: true },
      { id: 'en-b1-l4', title: '机场广播 听力训练', type: 'listening', xp: 55, done: false },
      { id: 'en-b1-l5', title: '职场邮件常用句式', type: 'word', xp: 40, done: false },
      { id: 'en-b1-l6', title: '虚拟语气 入门', type: 'grammar', xp: 60, done: false },
    ],
  },
  {
    id: 'en-a1',
    language: 'en',
    level: 'A1 入门',
    title: '英语零基础起步',
    subtitle: '字母、音标与核心短语',
    description: '从 26 个字母和音标开始，建立英语语音体系，掌握 500 个高频生存词汇。',
    lessons: 30,
    hours: 22,
    students: 23110,
    rating: 4.8,
    progress: 100,
    skills: ['词汇', '发音', '语法'],
    cover: 'gradient-en',
    lessonsData: [],
  },
  {
    id: 'ja-n3',
    language: 'ja',
    level: 'B1 中级',
    title: '日语 N3 冲刺',
    subtitle: 'JLPT N3 全题型突破',
    description: '针对 JLPT N3 考试，覆盖文字词汇、文法、读解、听解四大题型，含真题模拟。',
    lessons: 28,
    hours: 26,
    students: 8970,
    rating: 4.9,
    progress: 40,
    skills: ['词汇', '语法', '听力'],
    cover: 'gradient-ja',
    lessonsData: [
      { id: 'ja-n3-l1', title: 'N3 核心动词 50 选', type: 'word', xp: 50, done: true },
      { id: 'ja-n3-l2', title: '授受动词 あげる/くれる/もらう', type: 'grammar', xp: 60, done: true },
      { id: 'ja-n3-l3', title: '日常会话 听写训练', type: 'listening', xp: 55, done: false },
      { id: 'ja-n3-l4', title: '敬语入门 跟读练习', type: 'speaking', xp: 55, done: false },
    ],
  },
  {
    id: 'ko-1',
    language: 'ko',
    level: 'A2 初级',
    title: '韩语初级会话',
    subtitle: 'TOPIK 2 基础夯实',
    description: '掌握韩语基本音变规则与初级语法，能用韩语完成自我介绍、购物、问路等场景对话。',
    lessons: 26,
    hours: 20,
    students: 6430,
    rating: 4.7,
    progress: 80,
    skills: ['口语', '词汇', '语法'],
    cover: 'gradient-ko',
    lessonsData: [
      { id: 'ko-1-l1', title: '自我介绍 안녕하세요', type: 'speaking', xp: 50, done: true },
      { id: 'ko-1-l2', title: '食物词汇 50 词', type: 'word', xp: 40, done: true },
      { id: 'ko-1-l3', title: '는/가 助词用法', type: 'grammar', xp: 50, done: true },
      { id: 'ko-1-l4', title: '咖啡店点单 听力', type: 'listening', xp: 55, done: false },
    ],
  },
  {
    id: 'en-c1',
    language: 'en',
    level: 'C1 高级',
    title: '英语商务高阶写作',
    subtitle: '邮件 · 报告 · 演讲',
    description: '系统训练商务英语写作逻辑，覆盖正式邮件、数据分析报告与演讲稿，提升职场竞争力。',
    lessons: 20,
    hours: 16,
    students: 5210,
    rating: 4.9,
    progress: 0,
    skills: ['写作', '词汇', '语法'],
    cover: 'gradient-en',
    lessonsData: [],
  },
  {
    id: 'ja-n1',
    language: 'ja',
    level: 'C1 高级',
    title: '日语 N1 读解精讲',
    subtitle: '长难句与高阶表达',
    description: '攻克 N1 读解长难句，掌握论文、社论类文本的结构与高阶表达，冲刺满分。',
    lessons: 22,
    hours: 24,
    students: 3180,
    rating: 4.8,
    progress: 0,
    skills: ['阅读', '语法', '词汇'],
    cover: 'gradient-ja',
    lessonsData: [],
  },
]

// Vocabulary words for the word memorization module
export const WORDS = {
  en: [
    { word: 'Serendipity', phon: '/ˌserənˈdɪpəti/', pos: 'n.', meaning: '意外发现美好事物的能力', example: 'Finding that little cafe was pure serendipity.', trans: '发现那家小咖啡馆纯属意外之喜。' },
    { word: 'Resilient', phon: '/rɪˈzɪliənt/', pos: 'adj.', meaning: '有韧性的；能快速恢复的', example: 'Children are often more resilient than adults.', trans: '孩子们往往比成年人更有韧性。' },
    { word: 'Eloquent', phon: '/ˈeləkwənt/', pos: 'adj.', meaning: '雄辩的；有口才的', example: 'She gave an eloquent speech at the ceremony.', trans: '她在典礼上发表了一篇雄辩的演讲。' },
    { word: 'Ubiquitous', phon: '/juːˈbɪkwɪtəs/', pos: 'adj.', meaning: '无处不在的', example: 'Smartphones have become ubiquitous in modern life.', trans: '智能手机已成为现代生活无处不在的物品。' },
    { word: 'Pragmatic', phon: '/præɡˈmætɪk/', pos: 'adj.', meaning: '务实的；实用的', example: 'We need a pragmatic approach to this problem.', trans: '我们需要用务实的方法解决这个问题。' },
    { word: 'Meticulous', phon: '/məˈtɪkjələs/', pos: 'adj.', meaning: '一丝不苟的；细致的', example: 'He kept meticulous records of every expense.', trans: '他一丝不苟地记录了每一笔开支。' },
  ],
  ja: [
    { word: '我慢', phon: '/がまん/', pos: '名・他動詞', meaning: '忍耐；忍受', example: '痛みを我慢する。', trans: '忍受疼痛。' },
    { word: '工夫', phon: '/くふう/', pos: '名・他動詞', meaning: '想办法；下功夫', example: '料理の工夫をする。', trans: '在烹饪上下功夫。' },
    { word: '木枯らし', phon: '/こがらし/', pos: '名', meaning: '秋风；冷风', example: '木枯らしが吹く季節。', trans: '刮秋风的季节。' },
    { word: '傾向', phon: '/けいこう/', pos: '名', meaning: '倾向；趋势', example: '消費の傾向が変わる。', trans: '消费趋势发生变化。' },
  ],
  ko: [
    { word: '안녕하세요', phon: '/an-nyeong-ha-se-yo/', pos: '인사', meaning: '你好', example: '처음 뵙겠습니다, 안녕하세요.', trans: '初次见面，你好。' },
    { word: '감사합니다', phon: '/gam-sa-ham-ni-da/', pos: '표현', meaning: '谢谢', example: '도와주셔서 감사합니다.', trans: '感谢您的帮助。' },
    { word: '맛있다', phon: '/ma-sit-da/', pos: '형용사', meaning: '好吃', example: '이 음식 정말 맛있어요.', trans: '这食物真好吃。' },
    { word: '사랑하다', phon: '/sa-rang-ha-da/', pos: '동사', meaning: '爱', example: '나는 너를 사랑해.', trans: '我爱你。' },
  ],
}

// Grammar exercises
export const GRAMMAR = {
  en: [
    {
      q: 'Choose the correct form: "By the time we arrive, the movie ____ already started."',
      options: ['has', 'will have', 'had', 'have'],
      answer: 1,
      explain: '将来完成时 "will have + 过去分词" 表示在将来某一时间点前已完成的动作。',
    },
    {
      q: 'Fill in the blank: "If I ____ richer, I would travel the world."',
      options: ['am', 'was', 'were', 'be'],
      answer: 2,
      explain: '虚拟语气第二类：与现在事实相反，if 从句用一般过去时（be 动词一律用 were）。',
    },
    {
      q: 'Pick the correct preposition: "She is good ___ math but bad ___ sports."',
      options: ['at / at', 'in / in', 'at / in', 'in / at'],
      answer: 0,
      explain: '"be good at" 与 "be bad at" 为固定搭配，表示"擅长/不擅长"。',
    },
  ],
  ja: [
    {
      q: '选择正确的助词：先生（　）本をもらいました。',
      options: ['に', 'が', 'を', 'で'],
      answer: 0,
      explain: '授受动词 もらう 的动作授予者用 「に」 标记，表示"从老师那里得到书"。',
    },
    {
      q: '选择正确形式：雨が降っている（　）、出かけません。',
      options: ['ので', 'のに', 'たら', 'と'],
      answer: 0,
      explain: '「ので」表示客观原因，前项是后项的理由，语气较为正式。',
    },
  ],
  ko: [
    {
      q: '빈칸에 알맞은 조사를 고르세요: 저（　） 학생입니다.',
      options: ['는', '를', '에', '와'],
      answer: 0,
      explain: '저（我）以元音结尾，主语助词用 는，表示"我是学生"。',
    },
    {
      q: '알맞은 동사 형태를 고르세요: 밥을 （　）.',
      options: ['먹어요', '가요', '와요', '봐요'],
      answer: 0,
      explain: '밥을 먹어요 意为"吃饭"，动词 먹다 + 아/어요 构成 해요 体。',
    },
  ],
}

// Speaking shadowing sentences
export const SPEAKING = {
  en: [
    { text: 'I would like to book a table for two at seven this evening.', trans: '我想预订今晚七点两位的桌位。', focus: '连读 I would / table for' },
    { text: 'Could you tell me how to get to the nearest subway station?', trans: '请问最近的地铁站怎么走？', focus: '弱读 could you / nearest' },
    { text: 'I am really looking forward to our collaboration next quarter.', trans: '我非常期待下个季度我们的合作。', focus: '连读 looking forward to' },
  ],
  ja: [
    { text: 'すみません、この近くに駅はありますか。', trans: '请问，这附近有车站吗？', focus: '语调上扬 ありますか' },
    { text: '明日の会議は何時から始まりますか。', trans: '明天的会议几点开始？', focus: '促音 しょって' },
  ],
  ko: [
    { text: '안녕하세요, 만나서 반갑습니다.', trans: '你好，很高兴见到你。', focus: '连读 만나서' },
    { text: '이거 얼마예요?', trans: '这个多少钱？', focus: '语调 얼마예요' },
  ],
}

// Listening training passages
export const LISTENING = {
  en: [
    {
      title: 'Airport Announcement',
      audioText: 'Attention passengers. The 9:45 flight to Tokyo has been delayed by approximately 30 minutes due to weather conditions. Please proceed to gate B12 for boarding. We apologize for any inconvenience.',
      trans: '各位旅客请注意。由于天气原因，飞往东京的 9:45 航班延误约 30 分钟。请前往 B12 登机口登机。对您的不便我们深表歉意。',
      questions: [
        { q: '航班目的地是？', options: ['东京', '首尔', '纽约', '伦敦'], answer: 0 },
        { q: '延误时间约为？', options: ['15 分钟', '30 分钟', '1 小时', '2 小时'], answer: 1 },
        { q: '登机口是？', options: ['A5', 'B12', 'C3', 'D8'], answer: 1 },
      ],
    },
  ],
  ja: [
    {
      title: '駅のアナウンス',
      audioText: '電車がまいります。次は新宿、新宿です。お出口は左側です。新宿から各駅停車と快速がご利用いただけます。',
      trans: '电车即将进站。下一站是新宿，新宿站。出口在左侧。从新宿可乘坐各站停车与快速列车。',
      questions: [
        { q: '次の駅は？', options: ['新宿', '渋谷', '池袋', '東京'], answer: 0 },
        { q: '出口はどちら側？', options: ['右側', '左側', '前側', '後ろ側'], answer: 1 },
      ],
    },
  ],
  ko: [
    {
      title: '카페 주문',
      audioText: '안녕하세요, 주문 도와드릴까요? 아메리카노 한 잔과 카페라떼 한 잔 주세요. 총 8천원입니다.',
      trans: '您好，需要帮您点单吗？请给我一杯美式和一杯拿铁。一共 8000 韩元。',
      questions: [
        { q: '주문한 음료 수는?', options: ['1잔', '2잔', '3잔', '4잔'], answer: 1 },
        { q: '총 금액은?', options: ['5천원', '8천원', '1만원', '1만2천원'], answer: 1 },
      ],
    },
  ],
}

export const ACHIEVEMENTS = [
  { id: 'first-step', icon: '🎯', title: '初次启程', desc: '完成第一节课程', unlocked: true, progress: 100 },
  { id: 'streak-7', icon: '🔥', title: '一周坚持', desc: '连续学习 7 天', unlocked: true, progress: 100 },
  { id: 'streak-30', icon: '⚡', title: '月度学霸', desc: '连续学习 30 天', unlocked: false, progress: 40 },
  { id: 'words-100', icon: '📚', title: '词汇达人', desc: '掌握 100 个单词', unlocked: true, progress: 100 },
  { id: 'words-1000', icon: '🏆', title: '词汇大师', desc: '掌握 1000 个单词', unlocked: false, progress: 142, total: 1000 },
  { id: 'speaking-10', icon: '🎤', title: '口语新秀', desc: '完成 10 次口语跟读', unlocked: true, progress: 100 },
  { id: 'polyglot', icon: '🌍', title: '多语种学者', desc: '同时学习 3 种语言', unlocked: true, progress: 100 },
  { id: 'community', icon: '💬', title: '社区活跃', desc: '在社区发表 5 条动态', unlocked: false, progress: 60, total: 5 },
  { id: 'night-owl', icon: '🌙', title: '夜猫学子', desc: '在 22 点后完成学习', unlocked: false, progress: 0 },
  { id: 'early-bird', icon: '☀️', title: '晨读先锋', desc: '在 7 点前完成学习', unlocked: true, progress: 100 },
  { id: 'grammar-pro', icon: '🧠', title: '语法能手', desc: '语法正确率达 95%', unlocked: false, progress: 88, total: 95 },
  { id: 'course-done', icon: '🎓', title: '课程毕业', desc: '完整学完一门课程', unlocked: true, progress: 100 },
]

export const COMMUNITY_POSTS = [
  {
    id: 1,
    author: '林小染',
    avatar: '🦊',
    badge: 'ja',
    time: '2 小时前',
    content: '分享我的日语 N2 备考心得：每天坚持听写 30 分钟 NHK 新闻，三个月下来听力提升超明显！坚持就是胜利 💪',
    likes: 248,
    comments: 32,
    shares: 18,
    image: 'study-desk',
    tag: 'JLPT备考',
  },
  {
    id: 2,
    author: 'Alex Chen',
    avatar: '🐼',
    badge: 'en',
    time: '5 小时前',
    content: 'Day 30 韩语打卡完成 🎉 从零基础到能看懂简单的韩剧台词，LinguaFlow 的分级课程真的太友好了！',
    likes: 512,
    comments: 67,
    shares: 24,
    tag: '韩语打卡',
  },
  {
    id: 3,
    author: '佐藤美咲',
    avatar: '🐰',
    badge: 'en',
    time: '8 小时前',
    content: 'Just finished my first English presentation at work! 🎤 三个月的口语跟读训练没白费，同事们说我的发音清晰多了。感恩这个平台！',
    likes: 893,
    comments: 104,
    shares: 56,
    tag: '英语口语',
  },
  {
    id: 4,
    author: '김민준',
    avatar: '🐯',
    badge: 'ja',
    time: '1 天前',
    content: '日语敬语真的太难了 😭 但是用了「授受动词」那节语法课的讲解，突然就豁然开朗了。推荐给大家！',
    likes: 176,
    comments: 28,
    shares: 9,
    tag: '日语语法',
  },
  {
    id: 5,
    author: '王思琪',
    avatar: '🐱',
    badge: 'ko',
    time: '1 天前',
    content: '今天解锁了「多语种学者」徽章 🌍 同时学英语、日语、韩语半年了，每天 1 小时，时间管理真的很重要。下个目标：N1 和 TOPIK 5 级！',
    likes: 634,
    comments: 89,
    shares: 41,
    image: 'badges',
    tag: '成就分享',
  },
]

export const TRENDING_TOPICS = [
  { name: 'JLPT考试', posts: 2340, trend: 'hot' },
  { name: '韩语入门', posts: 1870, trend: 'up' },
  { name: '英语口语练习', posts: 3210, trend: 'hot' },
  { name: 'TOPIK备考', posts: 980, trend: 'up' },
  { name: '商务英语', posts: 1450, trend: 'new' },
]

export const ACTIVE_LEARNERS = [
  { name: '佐藤美咲', avatar: '🐰', badge: 'en', level: 18 },
  { name: '김민준', avatar: '🐯', badge: 'ja', level: 15 },
  { name: '林小染', avatar: '🦊', badge: 'ja', level: 22 },
  { name: 'Alex Chen', avatar: '🐼', badge: 'ko', level: 12 },
  { name: '王思琪', avatar: '🐱', badge: 'ko', level: 9 },
]

// Personalized learning path quiz questions
export const PATH_QUIZ = [
  {
    q: '你学习语言的主要目标是什么？',
    options: [
      { label: '旅行交流', path: 'speaking', weight: 2 },
      { label: '考试认证 (JLPT/TOPIK/雅思)', path: 'exam', weight: 2 },
      { label: '职场提升', path: 'business', weight: 2 },
      { label: '追剧看番无障碍', path: 'media', weight: 2 },
    ],
  },
  {
    q: '你每天能投入多少学习时间？',
    options: [
      { label: '15-30 分钟', path: 'light', weight: 1 },
      { label: '30-60 分钟', path: 'medium', weight: 2 },
      { label: '1-2 小时', path: 'heavy', weight: 3 },
    ],
  },
  {
    q: '你最想提升哪项能力？',
    options: [
      { label: '口语表达', path: 'speaking', weight: 3 },
      { label: '听力理解', path: 'listening', weight: 3 },
      { label: '词汇积累', path: 'word', weight: 3 },
      { label: '语法结构', path: 'grammar', weight: 3 },
    ],
  },
  {
    q: '你偏好的学习节奏是？',
    options: [
      { label: '游戏化闯关', path: 'gamified', weight: 2 },
      { label: '系统化循序渐进', path: 'systematic', weight: 2 },
      { label: '情境沉浸式', path: 'immersive', weight: 2 },
    ],
  },
]
