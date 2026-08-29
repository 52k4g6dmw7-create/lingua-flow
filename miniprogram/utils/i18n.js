// utils/i18n.js
// 多语言国际化模块 - 支持中文、英语、日语、韩语、法语

const LANG_KEY = 'linguaspeak_lang';

// 语言代码映射
const LANG_MAP = {
  zh: 'zh',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr'
};

// 语言显示名称映射（用于设置页面）
const LANG_DISPLAY = {
  zh: { native: '中文', label: 'Chinese' },
  en: { native: 'English', label: 'English' },
  ja: { native: '日本語', label: 'Japanese' },
  ko: { native: '한국어', label: 'Korean' },
  fr: { native: 'Français', label: 'French' }
};

// 语言包数据
const translations = {
  zh: {
    common: {
      appName: 'LinguaSpeak',
      appDesc: '提升表达能力最好的方法是每天坚持朗读',
      confirm: '确认',
      cancel: '取消',
      submit: '提交',
      back: '返回',
      save: '保存',
      loading: '加载中...',
      noData: '暂无数据',
      retry: '重试',
      success: '操作成功',
      fail: '操作失败',
      delete: '删除',
      edit: '编辑',
      share: '分享'
    },
    tabBar: {
      home: '首页',
      discover: '发现',
      upload: '上传',
      settings: '设置'
    },
    home: {
      aiPlan: 'AI 帮我安排',
      guide: '使用指南',
      addToDesktop: '添加到桌面，下次打开更方便',
      addNow: '立即添加',
      consecutiveDays: '连续',
      day: '天',
      totalDays: '累计',
      totalHours: '时长',
      viewMore: '查看详情',
      trainingPlan: '训练计划',
      week: '第',
      weekLabel: '周',
      currentDay: '第',
      currentDayLabel: '天',
      mastering: '正在掌握',
      progressStart: '起步中',
      progressMid: '进步中',
      progressEnd: '已掌握',
      startRead: '开始朗读',
      interviewIntro: '面试自我介绍',
      conclusionFirst: '结论先行'
    },
    discover: {
      title: '发现精彩内容',
      recommended: '为你推荐',
      hot: '热门课程',
      newArrival: '最新上架',
      categories: '分类浏览',
      difficulty: '难度等级',
      beginner: '入门',
      intermediate: '进阶',
      advanced: '高级',
      enroll: '立即学习',
      students: '学员',
      lessons: '课时'
    },
    read: {
      title: '朗读训练',
      prepare: '准备中',
      recording: '录音中',
      analyzing: '分析中',
      complete: '完成',
      startRecord: '开始录音',
      stopRecord: '停止录音',
      replay: '播放录音',
      nextSentence: '下一句',
      prevSentence: '上一句',
      accuracy: '准确度',
      fluency: '流利度',
      pronunciation: '发音评分',
      suggestion: '改进建议',
      tip1: '请大声清晰地朗读以下内容',
      tip2: '点击麦克风按钮开始录音',
      tip3: '录音完成后系统会自动分析您的发音'
    },
    upload: {
      title: '上传内容',
      subtitle: '上传您的练习文本，开始个性化训练',
      pasteText: '粘贴文本',
      selectFile: '选择文件',
      textPlaceholder: '请输入或粘贴您要练习的文本内容...',
      uploadBtn: '开始训练',
      history: '历史上传',
      clearHistory: '清空历史',
      maxLength: '字数上限',
      currentLength: '当前字数',
      supportTypes: '支持 .txt .docx .pdf 格式'
    },
    settings: {
      title: '设置',
      account: '账号管理',
      language: '语言设置',
      languageDesc: '选择您的界面语言',
      notification: '消息通知',
      notificationDesc: '每日训练提醒',
      theme: '主题设置',
      themeDesc: '浅色/深色模式',
      about: '关于我们',
      aboutDesc: '版本信息、用户协议',
      privacy: '隐私政策',
      feedback: '意见反馈',
      clearCache: '清除缓存',
      cacheSize: '缓存大小',
      logout: '退出登录',
      login: '登录账号',
      selectLang: '选择语言',
      currentLang: '当前语言',
      reminderTime: '提醒时间',
      openReminder: '开启提醒',
      dailyGoal: '每日目标',
      dailyGoalDesc: '设置每日朗读时长目标（分钟）'
    },
    languages: {
      zh: '中文',
      en: '英语',
      ja: '日语',
      ko: '韩语',
      fr: '法语'
    },
    toast: {
      switchLangSuccess: '语言切换成功',
      saveSuccess: '保存成功',
      uploadSuccess: '上传成功',
      cacheCleared: '缓存已清除',
      networkError: '网络错误，请重试',
      permissionDenied: '请授权相关权限'
    }
  },

  en: {
    common: {
      appName: 'LinguaSpeak',
      appDesc: 'The best way to improve expression is to read aloud every day',
      confirm: 'Confirm',
      cancel: 'Cancel',
      submit: 'Submit',
      back: 'Back',
      save: 'Save',
      loading: 'Loading...',
      noData: 'No Data',
      retry: 'Retry',
      success: 'Success',
      fail: 'Failed',
      delete: 'Delete',
      edit: 'Edit',
      share: 'Share'
    },
    tabBar: {
      home: 'Home',
      discover: 'Discover',
      upload: 'Upload',
      settings: 'Settings'
    },
    home: {
      aiPlan: 'AI Plan For Me',
      guide: 'Guide',
      addToDesktop: 'Add to Home Screen for quick access',
      addNow: 'Add Now',
      consecutiveDays: 'Streak',
      day: 'days',
      totalDays: 'Total',
      totalHours: 'Duration',
      viewMore: 'View Details',
      trainingPlan: 'Training Plan',
      week: 'W',
      weekLabel: '',
      currentDay: 'D',
      currentDayLabel: '',
      mastering: 'Currently Mastering',
      progressStart: 'Getting Started',
      progressMid: 'In Progress',
      progressEnd: 'Mastered',
      startRead: 'Start Reading',
      interviewIntro: 'Interview Self-Introduction',
      conclusionFirst: 'Conclusion First'
    },
    discover: {
      title: 'Discover Great Content',
      recommended: 'Recommended For You',
      hot: 'Popular Courses',
      newArrival: 'New Arrivals',
      categories: 'Browse Categories',
      difficulty: 'Difficulty',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      enroll: 'Enroll Now',
      students: 'students',
      lessons: 'lessons'
    },
    read: {
      title: 'Reading Practice',
      prepare: 'Preparing',
      recording: 'Recording',
      analyzing: 'Analyzing',
      complete: 'Complete',
      startRecord: 'Start Recording',
      stopRecord: 'Stop Recording',
      replay: 'Play Recording',
      nextSentence: 'Next',
      prevSentence: 'Previous',
      accuracy: 'Accuracy',
      fluency: 'Fluency',
      pronunciation: 'Pronunciation Score',
      suggestion: 'Suggestions for Improvement',
      tip1: 'Please read the following text aloud clearly',
      tip2: 'Tap the microphone button to start recording',
      tip3: 'After recording, the system will automatically analyze your pronunciation'
    },
    upload: {
      title: 'Upload Content',
      subtitle: 'Upload your practice text and start personalized training',
      pasteText: 'Paste Text',
      selectFile: 'Select File',
      textPlaceholder: 'Enter or paste the text you want to practice...',
      uploadBtn: 'Start Training',
      history: 'Upload History',
      clearHistory: 'Clear History',
      maxLength: 'Max Length',
      currentLength: 'Current Length',
      supportTypes: 'Supports .txt .docx .pdf formats'
    },
    settings: {
      title: 'Settings',
      account: 'Account',
      language: 'Language',
      languageDesc: 'Choose your interface language',
      notification: 'Notifications',
      notificationDesc: 'Daily training reminder',
      theme: 'Theme',
      themeDesc: 'Light / Dark mode',
      about: 'About Us',
      aboutDesc: 'Version info, Terms of service',
      privacy: 'Privacy Policy',
      feedback: 'Feedback',
      clearCache: 'Clear Cache',
      cacheSize: 'Cache Size',
      logout: 'Log Out',
      login: 'Log In',
      selectLang: 'Select Language',
      currentLang: 'Current Language',
      reminderTime: 'Reminder Time',
      openReminder: 'Enable Reminder',
      dailyGoal: 'Daily Goal',
      dailyGoalDesc: 'Set daily reading duration goal (minutes)'
    },
    languages: {
      zh: 'Chinese',
      en: 'English',
      ja: 'Japanese',
      ko: 'Korean',
      fr: 'French'
    },
    toast: {
      switchLangSuccess: 'Language switched successfully',
      saveSuccess: 'Saved successfully',
      uploadSuccess: 'Upload successful',
      cacheCleared: 'Cache cleared',
      networkError: 'Network error, please retry',
      permissionDenied: 'Please grant the required permissions'
    }
  },

  ja: {
    common: {
      appName: 'LinguaSpeak',
      appDesc: '表現力を高める最良の方法は、毎日音読することです',
      confirm: '確認',
      cancel: 'キャンセル',
      submit: '送信',
      back: '戻る',
      save: '保存',
      loading: '読み込み中...',
      noData: 'データなし',
      retry: '再試行',
      success: '成功',
      fail: '失敗',
      delete: '削除',
      edit: '編集',
      share: '共有'
    },
    tabBar: {
      home: 'ホーム',
      discover: '発見',
      upload: 'アップロード',
      settings: '設定'
    },
    home: {
      aiPlan: 'AIが計画',
      guide: '使い方ガイド',
      addToDesktop: 'ホーム画面に追加して簡単アクセス',
      addNow: '今すぐ追加',
      consecutiveDays: '連続',
      day: '日',
      totalDays: '合計',
      totalHours: '時間',
      viewMore: '詳細を見る',
      trainingPlan: 'トレーニング計画',
      week: '第',
      weekLabel: '週',
      currentDay: '第',
      currentDayLabel: '日',
      mastering: '習得中',
      progressStart: 'スタート',
      progressMid: '進行中',
      progressEnd: '習得済み',
      startRead: '音読を開始',
      interviewIntro: '面接自己紹介',
      conclusionFirst: '結論先行'
    },
    discover: {
      title: 'コンテンツを発見',
      recommended: 'あなたへのおすすめ',
      hot: '人気コース',
      newArrival: '新着',
      categories: 'カテゴリー',
      difficulty: '難易度',
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
      enroll: '今すぐ学習',
      students: '人の受講生',
      lessons: 'レッスン'
    },
    read: {
      title: '音読トレーニング',
      prepare: '準備中',
      recording: '録音中',
      analyzing: '分析中',
      complete: '完了',
      startRecord: '録音開始',
      stopRecord: '録音停止',
      replay: '再生',
      nextSentence: '次へ',
      prevSentence: '前へ',
      accuracy: '正確度',
      fluency: '流暢さ',
      pronunciation: '発音スコア',
      suggestion: '改善のヒント',
      tip1: '以下の文章をはっきりと大きな声で読んでください',
      tip2: 'マイクボタンをタップして録音開始',
      tip3: '録音後、システムが自動で発音を分析します'
    },
    upload: {
      title: 'コンテンツをアップロード',
      subtitle: '練習テキストをアップロードして、パーソナライズされたトレーニングを始めましょう',
      pasteText: 'テキストを貼り付け',
      selectFile: 'ファイルを選択',
      textPlaceholder: '練習したいテキストを入力または貼り付けてください...',
      uploadBtn: 'トレーニング開始',
      history: 'アップロード履歴',
      clearHistory: '履歴を消去',
      maxLength: '上限文字数',
      currentLength: '現在の文字数',
      supportTypes: '.txt .docx .pdf 形式に対応'
    },
    settings: {
      title: '設定',
      account: 'アカウント管理',
      language: '言語設定',
      languageDesc: '画面の言語を選択してください',
      notification: '通知設定',
      notificationDesc: '毎日のトレーニングリマインダー',
      theme: 'テーマ設定',
      themeDesc: 'ライト / ダークモード',
      about: 'このアプリについて',
      aboutDesc: 'バージョン情報、利用規約',
      privacy: 'プライバシーポリシー',
      feedback: 'フィードバック',
      clearCache: 'キャッシュを消去',
      cacheSize: 'キャッシュサイズ',
      logout: 'ログアウト',
      login: 'ログイン',
      selectLang: '言語を選択',
      currentLang: '現在の言語',
      reminderTime: 'リマインダー時間',
      openReminder: 'リマインダーをオン',
      dailyGoal: '1日の目標',
      dailyGoalDesc: '1日の音読時間目標を設定（分）'
    },
    languages: {
      zh: '中国語',
      en: '英語',
      ja: '日本語',
      ko: '韓国語',
      fr: 'フランス語'
    },
    toast: {
      switchLangSuccess: '言語を切り替えました',
      saveSuccess: '保存しました',
      uploadSuccess: 'アップロードしました',
      cacheCleared: 'キャッシュを消去しました',
      networkError: 'ネットワークエラー、再試行してください',
      permissionDenied: '必要な権限を許可してください'
    }
  },

  ko: {
    common: {
      appName: 'LinguaSpeak',
      appDesc: '표현력을 높이는 최고의 방법은 매일 큰 소리로 읽는 것입니다',
      confirm: '확인',
      cancel: '취소',
      submit: '제출',
      back: '뒤로',
      save: '저장',
      loading: '로딩 중...',
      noData: '데이터 없음',
      retry: '다시 시도',
      success: '성공',
      fail: '실패',
      delete: '삭제',
      edit: '편집',
      share: '공유'
    },
    tabBar: {
      home: '홈',
      discover: '발견',
      upload: '업로드',
      settings: '설정'
    },
    home: {
      aiPlan: 'AI 플랜',
      guide: '이용 가이드',
      addToDesktop: '홈 화면에 추가하여 빠르게 접근하세요',
      addNow: '지금 추가',
      consecutiveDays: '연속',
      day: '일',
      totalDays: '누적',
      totalHours: '시간',
      viewMore: '자세히 보기',
      trainingPlan: '트레이닝 계획',
      week: 'W',
      weekLabel: '',
      currentDay: 'D',
      currentDayLabel: '',
      mastering: '학습 중',
      progressStart: '시작 단계',
      progressMid: '진행 중',
      progressEnd: '완료',
      startRead: '낭독 시작',
      interviewIntro: '면접 자기소개',
      conclusionFirst: '결론 우선'
    },
    discover: {
      title: '콘텐츠 발견',
      recommended: '당신을 위한 추천',
      hot: '인기 강좌',
      newArrival: '신규 강좌',
      categories: '카테고리',
      difficulty: '난이도',
      beginner: '초급',
      intermediate: '중급',
      advanced: '고급',
      enroll: '지금 학습',
      students: '명의 학생',
      lessons: '강의'
    },
    read: {
      title: '낭독 훈련',
      prepare: '준비 중',
      recording: '녹음 중',
      analyzing: '분석 중',
      complete: '완료',
      startRecord: '녹음 시작',
      stopRecord: '녹음 중지',
      replay: '재생',
      nextSentence: '다음',
      prevSentence: '이전',
      accuracy: '정확도',
      fluency: '유창성',
      pronunciation: '발음 점수',
      suggestion: '개선 제안',
      tip1: '다음 내용을 크고 명확하게 읽어주세요',
      tip2: '마이크 버튼을 눌러 녹음을 시작하세요',
      tip3: '녹음이 완료되면 시스템이 자동으로 발음을 분석합니다'
    },
    upload: {
      title: '콘텐츠 업로드',
      subtitle: '연습 텍스트를 업로드하고 개인 맞춤 트레이닝을 시작하세요',
      pasteText: '텍스트 붙여넣기',
      selectFile: '파일 선택',
      textPlaceholder: '연습하고 싶은 텍스트를 입력하거나 붙여넣으세요...',
      uploadBtn: '훈련 시작',
      history: '업로드 기록',
      clearHistory: '기록 지우기',
      maxLength: '최대 길이',
      currentLength: '현재 길이',
      supportTypes: '.txt .docx .pdf 형식 지원'
    },
    settings: {
      title: '설정',
      account: '계정 관리',
      language: '언어 설정',
      languageDesc: '화면 언어를 선택하세요',
      notification: '알림 설정',
      notificationDesc: '매일 훈련 리마인더',
      theme: '테마 설정',
      themeDesc: '라이트 / 다크 모드',
      about: '소개',
      aboutDesc: '버전 정보, 이용 약관',
      privacy: '개인정보 처리방침',
      feedback: '의견 보내기',
      clearCache: '캐시 지우기',
      cacheSize: '캐시 크기',
      logout: '로그아웃',
      login: '로그인',
      selectLang: '언어 선택',
      currentLang: '현재 언어',
      reminderTime: '리마인더 시간',
      openReminder: '리마인더 켜기',
      dailyGoal: '하루 목표',
      dailyGoalDesc: '하루 낭독 시간 목표 설정 (분)'
    },
    languages: {
      zh: '중국어',
      en: '영어',
      ja: '일본어',
      ko: '한국어',
      fr: '프랑스어'
    },
    toast: {
      switchLangSuccess: '언어가 변경되었습니다',
      saveSuccess: '저장되었습니다',
      uploadSuccess: '업로드되었습니다',
      cacheCleared: '캐시가 지워졌습니다',
      networkError: '네트워크 오류, 다시 시도하세요',
      permissionDenied: '필요한 권한을 허용해 주세요'
    }
  },

  fr: {
    common: {
      appName: 'LinguaSpeak',
      appDesc: 'La meilleure façon d\'améliorer votre expression est de lire à voix haute tous les jours',
      confirm: 'Confirmer',
      cancel: 'Annuler',
      submit: 'Soumettre',
      back: 'Retour',
      save: 'Enregistrer',
      loading: 'Chargement...',
      noData: 'Aucune donnée',
      retry: 'Réessayer',
      success: 'Succès',
      fail: 'Échec',
      delete: 'Supprimer',
      edit: 'Modifier',
      share: 'Partager'
    },
    tabBar: {
      home: 'Accueil',
      discover: 'Découvrir',
      upload: 'Télécharger',
      settings: 'Paramètres'
    },
    home: {
      aiPlan: 'Plan IA',
      guide: 'Guide d\'utilisation',
      addToDesktop: 'Ajouter à l\'écran d\'accueil pour un accès rapide',
      addNow: 'Ajouter',
      consecutiveDays: 'Consécutif',
      day: 'j',
      totalDays: 'Total',
      totalHours: 'Durée',
      viewMore: 'Voir les détails',
      trainingPlan: 'Plan d\'entraînement',
      week: 'S',
      weekLabel: '',
      currentDay: 'J',
      currentDayLabel: '',
      mastering: 'En cours d\'apprentissage',
      progressStart: 'Débutant',
      progressMid: 'En cours',
      progressEnd: 'Maîtrisé',
      startRead: 'Commencer la lecture',
      interviewIntro: 'Présentation d\'entretien',
      conclusionFirst: 'Conclusion d\'abord'
    },
    discover: {
      title: 'Découvrir du contenu',
      recommended: 'Recommandé pour vous',
      hot: 'Cours populaires',
      newArrival: 'Nouveautés',
      categories: 'Catégories',
      difficulty: 'Niveau',
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
      enroll: 'Commencer',
      students: 'étudiants',
      lessons: 'leçons'
    },
    read: {
      title: 'Entraînement de lecture',
      prepare: 'Préparation',
      recording: 'Enregistrement',
      analyzing: 'Analyse',
      complete: 'Terminé',
      startRecord: 'Démarrer l\'enregistrement',
      stopRecord: 'Arrêter',
      replay: 'Écouter',
      nextSentence: 'Suivant',
      prevSentence: 'Précédent',
      accuracy: 'Précision',
      fluency: 'Fluidité',
      pronunciation: 'Score de prononciation',
      suggestion: 'Suggestions d\'amélioration',
      tip1: 'Veuillez lire le texte suivant à voix haute et clairement',
      tip2: 'Appuyez sur le bouton micro pour commencer',
      tip3: 'Après l\'enregistrement, le système analysera automatiquement votre prononciation'
    },
    upload: {
      title: 'Télécharger du contenu',
      subtitle: 'Téléchargez votre texte de pratique et commencez un entraînement personnalisé',
      pasteText: 'Coller le texte',
      selectFile: 'Choisir un fichier',
      textPlaceholder: 'Saisissez ou collez le texte que vous souhaitez pratiquer...',
      uploadBtn: 'Commencer l\'entraînement',
      history: 'Historique',
      clearHistory: 'Effacer l\'historique',
      maxLength: 'Longueur max',
      currentLength: 'Longueur actuelle',
      supportTypes: 'Formats .txt .docx .pdf pris en charge'
    },
    settings: {
      title: 'Paramètres',
      account: 'Compte',
      language: 'Langue',
      languageDesc: 'Choisissez la langue de l\'interface',
      notification: 'Notifications',
      notificationDesc: 'Rappel d\'entraînement quotidien',
      theme: 'Thème',
      themeDesc: 'Mode clair / sombre',
      about: 'À propos',
      aboutDesc: 'Version, Conditions d\'utilisation',
      privacy: 'Politique de confidentialité',
      feedback: 'Retour d\'information',
      clearCache: 'Vider le cache',
      cacheSize: 'Taille du cache',
      logout: 'Déconnexion',
      login: 'Connexion',
      selectLang: 'Choisir la langue',
      currentLang: 'Langue actuelle',
      reminderTime: 'Heure du rappel',
      openReminder: 'Activer le rappel',
      dailyGoal: 'Objectif quotidien',
      dailyGoalDesc: 'Définir l\'objectif de lecture quotidien (minutes)'
    },
    languages: {
      zh: 'Chinois',
      en: 'Anglais',
      ja: 'Japonais',
      ko: 'Coréen',
      fr: 'Français'
    },
    toast: {
      switchLangSuccess: 'Langue changée avec succès',
      saveSuccess: 'Enregistré avec succès',
      uploadSuccess: 'Téléchargement réussi',
      cacheCleared: 'Cache vidé',
      networkError: 'Erreur réseau, veuillez réessayer',
      permissionDenied: 'Veuillez autoriser les permissions nécessaires'
    }
  }
};

// 获取当前语言
function getLang() {
  try {
    const lang = wx.getStorageSync(LANG_KEY);
    if (lang && translations[lang]) {
      return lang;
    }
  } catch (e) {
    console.warn('获取语言设置失败', e);
  }
  // 默认使用微信系统语言，如果不在支持列表中则回退到中文
  try {
    const sysInfo = wx.getSystemInfoSync();
    const sysLang = sysInfo.language || 'zh_CN';
    if (sysLang.indexOf('zh') !== -1) return 'zh';
    if (sysLang.indexOf('en') !== -1) return 'en';
    if (sysLang.indexOf('ja') !== -1) return 'ja';
    if (sysLang.indexOf('ko') !== -1) return 'ko';
    if (sysLang.indexOf('fr') !== -1) return 'fr';
  } catch (e) {
    // ignore
  }
  return 'zh';
}

// 设置语言
function setLang(lang) {
  if (translations[lang]) {
    try {
      wx.setStorageSync(LANG_KEY, lang);
    } catch (e) {
      console.warn('保存语言设置失败', e);
    }
    return true;
  }
  return false;
}

// 获取多语言文案
function t(key, lang) {
  const currentLang = lang || getLang();
  const trans = translations[currentLang] || translations.zh;
  const keys = key.split('.');
  let result = trans;
  for (let i = 0; i < keys.length; i++) {
    if (result && typeof result === 'object' && result[keys[i]] !== undefined) {
      result = result[keys[i]];
    } else {
      // 回退到英语
      const fallback = translations.en;
      let fb = fallback;
      for (let j = 0; j < keys.length; j++) {
        if (fb && typeof fb === 'object' && fb[keys[j]] !== undefined) {
          fb = fb[keys[j]];
        } else {
          return key; // 最终回退返回key本身
        }
      }
      return fb;
    }
  }
  return result;
}

// 获取整个语言包（用于页面data绑定）
function getLocale(lang) {
  const currentLang = lang || getLang();
  return translations[currentLang] || translations.zh;
}

// 获取支持的语言列表
function getSupportedLangs() {
  return Object.keys(LANG_DISPLAY).map(code => ({
    code,
    native: LANG_DISPLAY[code].native,
    label: LANG_DISPLAY[code].label
  }));
}

module.exports = {
  LANG_KEY,
  LANG_MAP,
  LANG_DISPLAY,
  getLang,
  setLang,
  t,
  getLocale,
  getSupportedLangs
};
