// pages/read/read.js
const app = getApp();
const i18n = require('../../utils/i18n.js');

// 录音管理器
let recorderManager = null;
let innerAudioContext = null;

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    // 训练内容语言（可独立于界面语言）
    contentLang: 'zh',
    contentLangs: [
      { code: 'zh', native: '中文', flag: '🇨🇳' },
      { code: 'en', native: 'English', flag: '🇺🇸' },
      { code: 'ja', native: '日本語', flag: '🇯🇵' },
      { code: 'ko', native: '한국어', flag: '🇰🇷' },
      { code: 'fr', native: 'Français', flag: '🇫🇷' }
    ],
    // 训练内容
    sentences: [],
    currentSentenceIndex: 0,
    currentSentence: '',
    // 录音状态
    status: 'prepare', // prepare / recording / analyzing / complete
    statusText: '',
    // 录音计时
    recordTimer: null,
    recordSeconds: 0,
    recordTimeDisplay: '00:00',
    // 录音文件路径
    recordFilePath: '',
    // 评分结果
    result: null,
    // 录音波形动画
    waveAnimation: false,
    // 自定义导航栏
    statusBarHeight: 20,
    planKey: ''
  },

  onLoad: function (options) {
    this.initData(options);
    this.initRecorder();
  },

  onUnload: function () {
    // 清理定时器和录音管理器
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer);
    }
    if (recorderManager) {
      try { recorderManager.stop(); } catch (e) {}
    }
    if (innerAudioContext) {
      try { innerAudioContext.destroy(); } catch (e) {}
    }
  },

  initData: function (options) {
    const lang = i18n.getLang();
    const locale = i18n.getLocale();
    const planKey = (options && options.plan) || 'interviewIntro';

    // 内容语言默认跟随界面语言
    const contentLang = lang;

    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      currentLang: lang,
      locale: locale,
      contentLang: contentLang,
      planKey: planKey
    });

    this.loadSentences(contentLang);
    this.updateStatusText('prepare');
    wx.setNavigationBarTitle({
      title: i18n.t('read.title', lang)
    });
  },

  // 加载句子内容
  loadSentences: function (langCode) {
    let sentences = [];
    const planKey = this.data.planKey || '';

    // 优先使用用户自定义内容（从上传页面来的）
    if (app.globalData.customSentences && app.globalData.customSentences.length > 0
        && planKey.indexOf('custom_') === 0) {
      sentences = app.globalData.customSentences.slice();
      // 自定义内容使用目标语言设置
      const useLang = app.globalData.customLang || langCode;
      if (this.data.contentLang !== useLang) {
        this.setData({ contentLang: useLang });
      }
    } else {
      // 使用内置内容库
      const library = app.globalData.trainingLibrary.interview || {};
      sentences = library[langCode] || [];

      // 如果对应的语种没内容，回退英语或中文
      if (sentences.length === 0) {
        sentences = library.en || library.zh || [
          'Please read this sentence aloud clearly.',
          'Practice makes perfect, keep going!'
        ];
      }
    }

    this.setData({
      sentences: sentences,
      currentSentenceIndex: 0,
      currentSentence: sentences[0] || ''
    });
  },

  // 初始化录音管理器
  initRecorder: function () {
    try {
      recorderManager = wx.getRecorderManager();
      innerAudioContext = wx.createInnerAudioContext();

      // 录音开始
      recorderManager.onStart(() => {
        console.log('录音开始');
        this.setData({
          status: 'recording',
          waveAnimation: true
        });
        this.updateStatusText('recording');
        this.startRecordTimer();
      });

      // 录音结束
      recorderManager.onStop((res) => {
        console.log('录音结束', res);
        this.stopRecordTimer();
        this.setData({
          recordFilePath: res.tempFilePath,
          waveAnimation: false
        });
        // 模拟分析中
        this.setData({ status: 'analyzing' });
        this.updateStatusText('analyzing');
        setTimeout(() => {
          this.analyzeResult();
        }, 1800);
      });

      // 录音错误
      recorderManager.onError((err) => {
        console.error('录音错误', err);
        this.stopRecordTimer();
        this.setData({
          status: 'prepare',
          waveAnimation: false
        });
        this.updateStatusText('prepare');
        wx.showToast({
          title: i18n.t('toast.permissionDenied', i18n.getLang()),
          icon: 'none'
        });
      });

      // 音频播放结束
      innerAudioContext.onEnded(() => {
        console.log('播放结束');
      });
    } catch (e) {
      console.error('初始化录音管理器失败', e);
    }
  },

  // 开始录音计时
  startRecordTimer: function () {
    this.setData({ recordSeconds: 0, recordTimeDisplay: '00:00' });
    const timer = setInterval(() => {
      const seconds = this.data.recordSeconds + 1;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.setData({
        recordSeconds: seconds,
        recordTimeDisplay: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      });
    }, 1000);
    this.setData({ recordTimer: timer });
  },

  // 停止录音计时
  stopRecordTimer: function () {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer);
      this.setData({ recordTimer: null });
    }
  },

  // 更新状态文字
  updateStatusText: function (status) {
    const lang = this.data.currentLang;
    const textMap = {
      prepare: i18n.t('read.prepare', lang),
      recording: i18n.t('read.recording', lang),
      analyzing: i18n.t('read.analyzing', lang),
      complete: i18n.t('read.complete', lang)
    };
    this.setData({ statusText: textMap[status] || '' });
  },

  // ===== 录音操作 =====
  onStartRecord: function () {
    if (!recorderManager) {
      this.initRecorder();
    }
    this.setData({ result: null });
    // 请求授权
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        try {
          recorderManager.start({
            duration: 60000,
            sampleRate: 44100,
            numberOfChannels: 1,
            encodeBitRate: 192000,
            format: 'mp3'
          });
        } catch (e) {
          console.error('启动录音失败', e);
        }
      },
      fail: () => {
        wx.showToast({
          title: i18n.t('toast.permissionDenied', i18n.getLang()),
          icon: 'none'
        });
      }
    });
  },

  onStopRecord: function () {
    if (recorderManager && this.data.status === 'recording') {
      try {
        recorderManager.stop();
      } catch (e) {
        console.error('停止录音失败', e);
      }
    }
  },

  // 播放录音回放
  onReplayRecord: function () {
    if (!this.data.recordFilePath) {
      wx.showToast({ title: 'No recording', icon: 'none' });
      return;
    }
    if (innerAudioContext) {
      innerAudioContext.src = this.data.recordFilePath;
      innerAudioContext.play();
    }
  },

  // ===== 分析结果（模拟） =====
  analyzeResult: function () {
    // 根据录音时长生成随机但可信的评分
    const seconds = Math.max(this.data.recordSeconds, 3);
    const baseScore = Math.min(95, 60 + seconds * 0.8 + Math.random() * 20);

    const accuracy = Math.round(Math.min(100, baseScore + Math.random() * 10 - 5));
    const fluency = Math.round(Math.min(100, baseScore - 5 + Math.random() * 10));
    const pronunciation = Math.round((accuracy + fluency) / 2);

    // 改进建议
    const lang = this.data.currentLang;
    const suggestions = {
      zh: [
        '注意平翘舌音的区分，发音可以更饱满。',
        '语速控制得不错，建议停顿处再自然一些。',
        '语调可以更有起伏，表达会更生动。'
      ],
      en: [
        'Pay attention to stress syllables for better rhythm.',
        'Great pace! Try to connect words more smoothly.',
        'Intonation rises on questions - practice makes natural!'
      ],
      ja: [
        'イントネーションを意識すると、より自然に聞こえます。',
        '母音の長さを意識して、リズムを整えましょう。',
        'スピードは良好です。適度な間を取るとさらに良いです。'
      ],
      ko: [
        '받침 발음을 조금 더 또렷하게 하면 좋습니다.',
        '말하기 속도가 좋습니다. 억양에 변화를 주어 보세요.',
        '어미의 높낮이를 의식하면 더 자연스러워요.'
      ],
      fr: [
        'Faites attention aux liaisons entre les mots.',
        'Bonne cadence ! Travaillez l\'accentuation des syllabes.',
        'L\'intonation monte en fin de question, continuez !'
      ]
    };

    const suggestionList = suggestions[lang] || suggestions.en;

    this.setData({
      status: 'complete',
      result: {
        accuracy: accuracy,
        fluency: fluency,
        pronunciation: pronunciation,
        suggestion: suggestionList[Math.floor(Math.random() * suggestionList.length)],
        recordSeconds: seconds
      }
    });
    this.updateStatusText('complete');
  },

  // ===== 句子切换 =====
  onPrevSentence: function () {
    const idx = Math.max(0, this.data.currentSentenceIndex - 1);
    this.setData({
      currentSentenceIndex: idx,
      currentSentence: this.data.sentences[idx],
      result: null,
      status: 'prepare',
      recordFilePath: ''
    });
    this.updateStatusText('prepare');
  },

  onNextSentence: function () {
    const idx = Math.min(this.data.sentences.length - 1, this.data.currentSentenceIndex + 1);
    this.setData({
      currentSentenceIndex: idx,
      currentSentence: this.data.sentences[idx],
      result: null,
      status: 'prepare',
      recordFilePath: ''
    });
    this.updateStatusText('prepare');
  },

  // ===== 内容语言切换 =====
  onChangeContentLang: function (e) {
    const langCode = e.currentTarget.dataset.code;
    if (langCode === this.data.contentLang) return;
    this.setData({
      contentLang: langCode,
      result: null,
      status: 'prepare',
      recordFilePath: ''
    });
    this.loadSentences(langCode);
    this.updateStatusText('prepare');
    wx.showToast({
      title: this.data.contentLangs.find(l => l.code === langCode).native,
      icon: 'none'
    });
  },

  // ===== 自定义导航栏 =====
  onBack: function () {
    wx.navigateBack({ fail: () => {
      wx.switchTab({ url: '/pages/index/index' });
    }});
  },

  // 返回首页
  onGoHome: function () {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 完成所有训练
  onFinishAll: function () {
    // 更新进度
    const progress = app.getProgress() || {};
    const today = app.getTodayStr();
    const lastDate = progress.lastActiveDate;
    const consecutiveDays = (lastDate && lastDate !== today)
      ? progress.consecutiveDays + 1
      : progress.consecutiveDays || 1;
    const addedMinutes = 5 + this.data.recordSeconds / 60;

    app.updateProgress({
      consecutiveDays: consecutiveDays,
      totalDays: (progress.totalDays || 0) + (lastDate !== today ? 1 : 0),
      totalMinutes: Math.round((progress.totalMinutes || 0) + addedMinutes),
      lastActiveDate: today
    });

    wx.showToast({
      title: '🎉 Great Job!',
      icon: 'success',
      duration: 2000
    });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 2000);
  },

  // 分享
  onShare: function () {
    return {
      title: 'LinguaSpeak - 多语言朗读训练',
      path: '/pages/index/index'
    };
  }
});
