// pages/read/read.js
// 真实功能版本：
//   - 录音：依然使用 wx.getRecorderManager()（真实）
//   - 实时语音识别：优先用微信"同声传译"插件（真实ASR）
//   - 录音结束：上传到云存储（真实云存储）+ 写 records 集合
//   - 评分：调用 evaluateSpeech 云函数（基于识别文本 vs 目标文本的稳定算法，非随机）
//   - 完成训练：app.updateProgress 同步到云端 progress 集合

const app = getApp();
const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const cloud = require('../../utils/cloud.js');
const CONFIG = require('../../config.js');

// 组件级单例
let recorderManager = null;
let innerAudioContext = null;
let wechatSIRecognizer = null;  // 同声传译插件识别管理器

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
    // 识别中的实时文本（同声传译插件返回）
    recognizedText: '',
    recognizing: false,
    // 自定义导航栏
    statusBarHeight: 20,
    planKey: '',
    // 插件可用性
    siAvailable: false,
    // 当前句子的ID（用于写records关联）
    currentSentenceKey: ''
  },

  onLoad: function (options) {
    this.initData(options);
    this.initRecorder();
    this.initWechatSI();
  },

  onUnload: function () {
    if (this.data.recordTimer) clearInterval(this.data.recordTimer);
    if (recorderManager) { try { recorderManager.stop(); } catch (e) {} }
    if (innerAudioContext) { try { innerAudioContext.destroy(); } catch (e) {} }
    if (wechatSIRecognizer) {
      try {
        wechatSIRecognizer.stop && wechatSIRecognizer.stop();
        wechatSIRecognizer.onStart = null;
        wechatSIRecognizer.onRecognize = null;
        wechatSIRecognizer.onStop = null;
        wechatSIRecognizer.onError = null;
      } catch (e) {}
    }
  },

  initData: function (options) {
    const lang = i18n.getLang();
    const locale = i18n.getLocale();
    const planKey = (options && options.plan) || 'interviewIntro';
    const contentLang = lang;
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      currentLang: lang,
      locale: locale,
      contentLang: contentLang,
      planKey: planKey,
      siAvailable: !!app.globalData.wechatSIAvailable
    });
    this.loadSentences(contentLang);
    this.updateStatusText('prepare');
    wx.setNavigationBarTitle({ title: i18n.t('read.title', lang) });
  },

  // 加载句子内容
  loadSentences: function (langCode) {
    let sentences = [];
    const planKey = this.data.planKey || '';
    if (app.globalData.customSentences && app.globalData.customSentences.length > 0
        && planKey.indexOf('custom_') === 0) {
      sentences = app.globalData.customSentences.slice();
      const useLang = app.globalData.customLang || langCode;
      if (this.data.contentLang !== useLang) this.setData({ contentLang: useLang });
    } else {
      const library = app.globalData.trainingLibrary.interview || {};
      sentences = library[langCode] || [];
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
      currentSentence: sentences[0] || '',
      currentSentenceKey: this.buildSentenceKey(0)
    });
  },

  buildSentenceKey: function (idx) {
    return `${this.data.planKey || 'plan'}_s${idx}_${Date.now() % 100000}`;
  },

  // ============ 初始化同声传译插件 ============
  initWechatSI: function () {
    const that = this;
    try {
      if (!CONFIG.FEATURES.ENABLE_SPEECH_EVAL) {
        console.warn('[read] 用户关闭了 ENABLE_SPEECH_EVAL，不启用插件');
        return;
      }
      const manager = api.getWechatSIRecognizer();
      if (!manager) {
        console.warn('[read] 同声传译插件不可用，降级到仅上传后评分');
        this.setData({ siAvailable: false });
        return;
      }
      wechatSIRecognizer = manager;
      this.setData({ siAvailable: true });

      manager.onStart && manager.onStart(() => {
        if (CONFIG.FEATURES.DEBUG) console.log('[WechatSI] ASR started');
        that.setData({ recognizing: true, recognizedText: '' });
      });

      manager.onRecognize && manager.onRecognize((res) => {
        // 实时识别结果，res.result 为当前识别到的文本
        const text = (res && res.result) || '';
        if (CONFIG.FEATURES.DEBUG) console.log('[WechatSI] onRecognize:', text);
        that.setData({ recognizedText: text });
      });

      manager.onStop && manager.onStop((res) => {
        const text = (res && res.result) || that.data.recognizedText || '';
        if (CONFIG.FEATURES.DEBUG) console.log('[WechatSI] onStop final:', text);
        that.setData({ recognizing: false, recognizedText: text });
      });

      manager.onError && manager.onError((err) => {
        console.warn('[WechatSI] ASR error:', err);
        that.setData({ recognizing: false });
      });
    } catch (e) {
      console.warn('[read] initWechatSI failed:', e);
      this.setData({ siAvailable: false });
    }
  },

  // ============ 初始化录音管理器 ============
  initRecorder: function () {
    const that = this;
    try {
      recorderManager = wx.getRecorderManager();
      innerAudioContext = wx.createInnerAudioContext();

      recorderManager.onStart(() => {
        console.log('[recorder] started');
        that.setData({ status: 'recording', waveAnimation: true });
        that.updateStatusText('recording');
        that.startRecordTimer();
        // 同步启动同声传译识别（如果可用）
        if (wechatSIRecognizer && that.data.siAvailable) {
          try {
            // 插件的 lang 需要标准化 en-US, zh_CN, ja_JP, ko_KR, fr_FR
            const contentLang = that.data.contentLang;
            const langMap = { zh: 'zh_CN', en: 'en_US', ja: 'ja_JP', ko: 'ko_KR', fr: 'fr_FR' };
            wechatSIRecognizer.start({
              lang: langMap[contentLang] || 'en_US',
              duration: 60000
            });
          } catch (e) {
            console.warn('[recorder] SI start fail:', e);
          }
        }
      });

      recorderManager.onStop((res) => {
        console.log('[recorder] stopped, size:', res.fileSize);
        that.stopRecordTimer();
        that.setData({ recordFilePath: res.tempFilePath, waveAnimation: false });

        // 停止ASR识别
        if (wechatSIRecognizer && that.data.siAvailable) {
          try { wechatSIRecognizer.stop(); } catch (e) {}
        }
        // 稍微延时等 onStop 把 final 结果塞到 recognizedText
        that.setData({ status: 'analyzing' });
        that.updateStatusText('analyzing');
        setTimeout(() => that.analyzeResult(res.tempFilePath), 600);
      });

      recorderManager.onError((err) => {
        console.error('[recorder] error:', err);
        that.stopRecordTimer();
        that.setData({ status: 'prepare', waveAnimation: false, recognizing: false });
        that.updateStatusText('prepare');
        wx.showToast({
          title: i18n.t('toast.permissionDenied', i18n.getLang()),
          icon: 'none'
        });
      });

      innerAudioContext.onEnded(() => {});
    } catch (e) {
      console.error('[read] initRecorder failed:', e);
    }
  },

  startRecordTimer: function () {
    this.setData({ recordSeconds: 0, recordTimeDisplay: '00:00' });
    const timer = setInterval(() => {
      const seconds = this.data.recordSeconds + 1;
      this.setData({
        recordSeconds: seconds,
        recordTimeDisplay: `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`
      });
    }, 1000);
    this.setData({ recordTimer: timer });
  },

  stopRecordTimer: function () {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer);
      this.setData({ recordTimer: null });
    }
  },

  updateStatusText: function (status) {
    const lang = this.data.currentLang;
    const map = {
      prepare: i18n.t('read.prepare', lang),
      recording: i18n.t('read.recording', lang),
      analyzing: i18n.t('read.analyzing', lang),
      complete: i18n.t('read.complete', lang)
    };
    this.setData({ statusText: map[status] || '' });
  },

  // ============ 录音操作 ============
  onStartRecord: function () {
    const that = this;
    // 会员拦截：录音属于核心训练能力
    const block = app.requireVip();
    if (block && block.blocked) {
      wx.showModal({
        title: block.title,
        content: block.content,
        confirmText: block.confirmText || (i18n.getLang()==='zh'?'开通会员':'Upgrade'),
        cancelText: i18n.getLang()==='zh'?'稍后':'Later',
        success(res){
          if (res.confirm) wx.navigateTo({ url: '/pages/vip/vip?from=read' });
        }
      });
      return;
    }
    if (!recorderManager) this.initRecorder();
    this.setData({ result: null, recognizedText: '' });
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
          console.error('[read] start fail:', e);
          wx.showToast({ title: 'Start failed', icon: 'none' });
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
      try { recorderManager.stop(); } catch (e) {}
    }
  },

  // 播放录音回放：如果有云端URL优先用云URL（临时），否则用本地路径
  onReplayRecord: function () {
    if (!this.data.recordFilePath) {
      wx.showToast({ title: 'No recording', icon: 'none' });
      return;
    }
    const that = this;
    cloud.getTempURL(this.data.recordFilePath).then(url => {
      if (innerAudioContext) {
        innerAudioContext.src = url;
        innerAudioContext.play();
      }
    });
  },

  // ============ 真实评分流程 ============
  // 1. 上传录音文件到云存储 + 写 records 集合
  // 2. 调用 evaluateSpeech 云函数（目标句+识别文本+时长）做稳定评分
  // 3. 将结果显示在 UI，不再使用 Math.random
  analyzeResult: function (filePath) {
    const that = this;
    const targetText = this.data.currentSentence || '';
    const duration = Math.max(this.data.recordSeconds, 1);
    const contentLang = this.data.contentLang;

    if (!targetText) {
      that.showFallbackScore('No target text');
      return;
    }

    let recognizedText = (this.data.recognizedText || '').trim();

    // Step A: 上传录音（异步，不阻塞评分）
    const uploadPromise = (async () => {
      if (!filePath) return null;
      try {
        return await api.uploadRecord(filePath, {
          duration,
          targetText,
          contentLang,
          sentenceId: that.data.currentSentenceKey,
          planKey: that.data.planKey,
          filename: `${that.data.currentSentenceKey}.mp3`
        });
      } catch (e) {
        console.warn('[read] uploadRecord fail:', e);
        return null;
      }
    })();

    // Step B: 评分 - 如果有 recognizedText 直接本地+云端一起评，否则仍走云端稳定算法
    uploadPromise.then(() => {
      return api.evaluateSpeech({
        fileID: that.data.recordFilePath || '',
        targetText,
        recognizedText,
        duration,
        lang: contentLang
      });
    }).then((evalRes) => {
      const result = evalRes && (typeof evalRes === 'object') ? evalRes : {
        accuracy: 65, fluency: 65, pronunciation: 65, suggestion: 'Fallback result', recognizedText
      };
      that.setData({
        status: 'complete',
        result: {
          accuracy: result.accuracy != null ? result.accuracy : 65,
          fluency: result.fluency != null ? result.fluency : 65,
          pronunciation: result.pronunciation != null ? result.pronunciation : 65,
          suggestion: result.suggestion || '',
          recognizedText: result.recognizedText || recognizedText || '',
          recordSeconds: duration,
          evaluatedBy: result.serverEvaluated ? 'cloud' : (that.data.siAvailable ? 'plugin+local' : 'local')
        }
      });
      that.updateStatusText('complete');
    }).catch((err) => {
      console.warn('[read] evaluate catch, using fallback:', err && err.errMsg || err);
      that.showFallbackScore(recognizedText);
    });
  },

  // 最差情况下的兜底评分（仍走 api.evaluateFallback，它的算法是稳定的基于时长+文本的非随机版本）
  showFallbackScore: function (recognizedText) {
    const res = api.evaluateFallback({
      targetText: this.data.currentSentence,
      recognizedText: recognizedText || this.data.recognizedText,
      duration: Math.max(this.data.recordSeconds, 1),
      lang: this.data.contentLang
    });
    this.setData({
      status: 'complete',
      result: Object.assign({ recordSeconds: this.data.recordSeconds, evaluatedBy: 'fallback' }, res)
    });
    this.updateStatusText('complete');
  },

  // ============ 句子切换 ============
  onPrevSentence: function () {
    const idx = Math.max(0, this.data.currentSentenceIndex - 1);
    this.setData({
      currentSentenceIndex: idx,
      currentSentence: this.data.sentences[idx],
      currentSentenceKey: this.buildSentenceKey(idx),
      result: null,
      recognizedText: '',
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
      currentSentenceKey: this.buildSentenceKey(idx),
      result: null,
      recognizedText: '',
      status: 'prepare',
      recordFilePath: ''
    });
    this.updateStatusText('prepare');
  },

  onChangeContentLang: function (e) {
    const langCode = e.currentTarget.dataset.code;
    if (langCode === this.data.contentLang) return;
    this.setData({
      contentLang: langCode,
      result: null,
      recognizedText: '',
      status: 'prepare',
      recordFilePath: ''
    });
    this.loadSentences(langCode);
    this.updateStatusText('prepare');
  },

  // ============ 导航栏 ============
  onBack: function () {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  onGoHome: function () {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 完成所有训练 - 真实更新进度到云端
  onFinishAll: function () {
    const progress = app.getProgress() || {};
    const today = app.getTodayStr();
    const lastDate = progress.lastActiveDate;
    const consecutiveDays = (lastDate && lastDate !== today)
      ? (progress.consecutiveDays || 0) + 1
      : (progress.consecutiveDays || 1);
    const addedMinutes = 5 + Math.floor(this.data.recordSeconds / 60);

    const updates = {
      consecutiveDays: consecutiveDays,
      totalDays: (progress.totalDays || 0) + (lastDate !== today ? 1 : 0),
      totalMinutes: Math.round((progress.totalMinutes || 0) + addedMinutes),
      lastActiveDate: today
    };

    // 内部会写本地+云端，云端异步不阻塞UI
    app.updateProgress(updates);

    wx.showToast({ title: '🎉 Great Job!', icon: 'success', duration: 2000 });
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 2000);
  },

  onShare: function () {
    return { title: 'LinguaSpeak - 多语言朗读训练', path: '/pages/index/index' };
  }
});
