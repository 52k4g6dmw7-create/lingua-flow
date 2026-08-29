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
    // 若传入了强制 lang=en 参数（雅思级别）则切换训练语种为英语
    let contentLang = lang;
    if (options && options.lang) {
      contentLang = options.lang;
    }
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
      // 1) 先匹配 planKey 精确对应的题库（ielts_4_5 / ielts_5_5 / ielts_6_5 / ielts_7_5 / interview / dailyLife 等）
      const lib = app.globalData.trainingLibrary || {};
      let matched = lib[planKey];
      // 2) 兼容旧 planKey 命名：interviewIntro → interview；business/daily/debate/speech/ted 直接命中对应库
      if (!matched) {
        const aliasMap = {
          interviewIntro: 'interview',
          business: 'business',
          daily: 'dailyLife',
          debate: 'debate',
          speech: 'speech',
          ted: 'ted'
        };
        const alias = aliasMap[planKey];
        if (alias && lib[alias]) matched = lib[alias];
      }
      // 3) 默认兜底 interview
      const library = matched || lib.interview || {};
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
  // 1. 上传录音文件到云存储 + 写 records 集合（拿到真实 fileID 给云函数据用）
  // 2. 调用 evaluateSpeech 云函数：includeIelts 按是否英语训练决定
  //    → 云函数若命中腾讯云 SOE/阿里云 或 内置 Levenshtein 算法，返回稳定非随机分
  //    → 英语训练时返回 ieltsReport（Band + 四维度 + 提分建议）
  // 3. 优先云返回的 ieltsReport，前端 calcIeltsReport 仅兜底
  analyzeResult: function (filePath) {
    const that = this;
    const targetText = this.data.currentSentence || '';
    const duration = Math.max(this.data.recordSeconds, 1);
    const contentLang = this.data.contentLang;
    const planKey = this.data.planKey || '';
    const isEnglish = contentLang === 'en';
    const isIeltsPlan = isEnglish && /^ielts_/.test(planKey);

    if (!targetText) {
      that.showFallbackScore('No target text');
      return;
    }

    const recognizedText = (this.data.recognizedText || '').trim();

    // Step A: 上传录音并拿到云端 fileID（等上传完成再评分，保证有真实 fileID）
    const uploadPromise = (async () => {
      if (!filePath) return { fileID: '' };
      try {
        const res = await api.uploadRecord(filePath, {
          duration, targetText, contentLang,
          sentenceId: that.data.currentSentenceKey,
          planKey,
          filename: `${that.data.currentSentenceKey}.mp3`
        });
        // res 包含 fileID（cloud://...） + recordId
        return { fileID: (res && res.fileID) || '' };
      } catch (e) {
        console.warn('[read] uploadRecord fail:', e);
        return { fileID: '' };
      }
    })();

    // Step B: 评分 —— 上传完成后拿真实 fileID 调云函数
    uploadPromise.then((uploadRes) => {
      return api.evaluateSpeech({
        fileID: (uploadRes && uploadRes.fileID) || that.data.recordFilePath || '',
        targetText,
        recognizedText,
        duration,
        lang: contentLang,
        // 英语内容直接传 includeIelts=true，云函数会自己在 lang=en 时返回 ieltsReport
        includeIelts: isEnglish,
        uiLang: i18n.getLang(),
        planKey
      });
    }).then((evalRes) => {
      const result = evalRes && (typeof evalRes === 'object') ? evalRes : {
        accuracy: 65, fluency: 65, pronunciation: 65, suggestion: 'Fallback result', recognizedText
      };
      const accuracy = result.accuracy != null ? result.accuracy : 65;
      const fluency  = result.fluency  != null ? result.fluency  : 65;
      const pronunc  = result.pronunciation != null ? result.pronunciation : 65;

      // 雅思报告：优先云返回的 ieltsReport，前端 calcIeltsReport 兜底
      let ielts = null;
      if (isEnglish) {
        ielts = result.ieltsReport && typeof result.ieltsReport === 'object'
          ? result.ieltsReport
          : that.calcIeltsReport({ accuracy, fluency, pronunciation: pronunc, targetText, recognizedText });
      }

      // 保存本次最后一次评分快照，用于 onFinishAll 写雅思训练历史
      if (ielts && ielts.bandLabel) {
        that._lastIeltsSnapshot = {
          ts: Date.now(),
          date: app.getTodayStr(),
          levelKey: isIeltsPlan ? planKey : (ielts.bandKey || ''),
          bandLabel: ielts.bandLabel,
          avgScore: ielts.avgScore || Math.round(0.45 * pronunc + 0.3 * fluency + 0.25 * accuracy),
          planKey,
          sentenceCount: 1,
          durationSec: duration
        };
      } else if (!that._lastIeltsSnapshot && isEnglish) {
        // 即使没有明确 ielts 报告，也留一次平均分快照
        const avg = Math.round(0.45 * pronunc + 0.3 * fluency + 0.25 * accuracy);
        that._lastIeltsSnapshot = {
          ts: Date.now(),
          date: app.getTodayStr(),
          levelKey: isIeltsPlan ? planKey : '',
          bandLabel: '',
          avgScore: avg,
          planKey,
          sentenceCount: 1,
          durationSec: duration
        };
      }

      const who = result.evaluatedBy
        ? result.evaluatedBy
        : (result.serverEvaluated ? 'cloud' : (that.data.siAvailable ? 'plugin+local' : 'local'));

      that.setData({
        status: 'complete',
        result: {
          accuracy, fluency, pronunciation: pronunc,
          suggestion: result.suggestion || '',
          recognizedText: result.recognizedText || recognizedText || '',
          recordSeconds: duration,
          evaluatedBy: who,
          ielts
        }
      });
      that.updateStatusText('complete');
    }).catch((err) => {
      console.warn('[read] evaluate catch, using fallback:', err && err.errMsg || err);
      that.showFallbackScore(recognizedText);
    });
  },

  // ============ 雅思口语四维度分段报告（英语内容专属） ============
  calcIeltsReport: function (input) {
    const that = this;
    const { accuracy, fluency, pronunciation, targetText, recognizedText } = input || {};
    const lang = i18n.getLang();

    // ① 根据综合加权总分映射雅思分段（权重对齐评分：发音>流利度>准确度）
    const avg = Math.round(0.45 * pronunciation + 0.30 * fluency + 0.25 * accuracy);
    const levels = [
      { band: '4.5-5.0', threshold: 0,   color: '#27ae60', key: 'ielts_4_5',
        title_zh: '基础级 · 可进行简单日常问答',
        title_en: 'Foundation. Simple Q&A on daily topics.' },
      { band: '5.5-6.0', threshold: 60,  color: '#2980b9', key: 'ielts_5_5',
        title_zh: '进阶级 · 可扩展回答并有基本逻辑',
        title_en: 'Intermediate. Extended answers with basic logic.' },
      { band: '6.5-7.0', threshold: 75,  color: '#8e44ad', key: 'ielts_6_5',
        title_zh: '高分级 · 表达自然，能进行抽象讨论',
        title_en: 'Competent. Natural speech & abstract discussion.' },
      { band: '7.5-8.0', threshold: 88,  color: '#c0392b', key: 'ielts_7_5',
        title_zh: '冲刺级 · 地道表达 + 强论证 + 微瑕不影响理解',
        title_en: 'Advanced. Idiomatic, coherent & near-native fluency.' },
      { band: '8.5+',    threshold: 96,  color: '#2c3e50', key: 'ielts_7_5',
        title_zh: '准母语级 · 考官级表现，几乎无任何错误',
        title_en: 'Expert. Examiner-level. Virtually no errors.' }
    ];
    let chosen = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (avg >= levels[i].threshold) { chosen = levels[i]; break; }
    }
    const bandLabel = chosen.band;
    const bandTitle = lang === 'zh' ? chosen.title_zh : chosen.title_en;
    const bandColor = chosen.color;

    // ② 计算四项得分：Fluency / Lexical / Grammar / Pronunciation
    // - Fluency: 由 base fluency 结合"句子长度/录音时长"推算"犹豫/停顿"程度
    const chars = String(targetText || '').length;
    const seconds = Math.max(that.data.recordSeconds || 1, 1);
    const cpm = Math.round(chars / seconds * 60);   // chars per minute
    const speedBonus = cpm >= 130 ? 12 : cpm >= 100 ? 6 : cpm >= 70 ? 0 : -6;
    let fScore = Math.max(30, Math.min(100, Math.round(0.75 * fluency + 0.15 * accuracy + speedBonus)));
    // - Lexical: 基于文本难度（平均词长+标点复杂度）+ accuracy
    const words = String(targetText || '').split(/\s+/).filter(Boolean);
    const avgWordLen = words.length ? (String(targetText || '').replace(/[^a-zA-Z]/g, '').length / words.length) : 3.5;
    const lexRichness = Math.min(16, Math.max(0, Math.round((avgWordLen - 3.5) * 10))); // 词长每多1字母+10分
    let lScore = Math.max(30, Math.min(100, Math.round(0.55 * accuracy + 0.25 * pronunciation + 20 + lexRichness)));
    // - Grammar: 目标句包含从句/连接词(however/furthermore/although/which/that 等)即提分
    const advancedMarkers = /(however|therefore|furthermore|nevertheless|although|because|which|who|whose|that|where|when|consequently|moreover|in addition|by contrast|admittedly|that being said)/gi;
    const markerCount = (String(targetText || '').match(advancedMarkers) || []).length;
    const gramBonus = Math.min(18, markerCount * 5);
    let gScore = Math.max(30, Math.min(100, Math.round(0.5 * accuracy + 0.3 * fluency + 15 + gramBonus)));
    // - Pronunciation: 直接取 pronunciation
    let pScore = Math.max(30, Math.min(100, Math.round(pronunciation)));

    const levelOf = (s) => {
      if (s >= 88) return lang === 'zh' ? '(Band 7-8)' : '(Band 7-8)';
      if (s >= 75) return lang === 'zh' ? '(Band 6-7)' : '(Band 6-7)';
      if (s >= 60) return lang === 'zh' ? '(Band 5-6)' : '(Band 5-6)';
      return lang === 'zh' ? '(Band 4-5)' : '(Band 4-5)';
    };

    // ③ Next-step 提分建议（按最弱项 + 目标雅思级别）
    const nextStep = (() => {
      const pairs = [
        { k: 'f', s: fScore, label_zh: '流利性与连贯性', label_en: 'Fluency & Coherence',
          tip_zh: '① 把 Part 2 Cue Card 先按 4 段写提纲：背景-经过-感受-总结；② 用 "as a matter of fact / more importantly / consequently" 等连接词串联；③ 每天跟读本级别 10 句并录音，对比自己和标准句的停顿节奏。',
          tip_en: '1) Outline Part 2 cue cards in 4 blocks: background → story → feelings → conclusion. 2) Chain ideas with markers like "as a matter of fact / more importantly / consequently". 3) Shadow 10 band-level sentences daily and compare pause rhythm.' },
        { k: 'l', s: lScore, label_zh: '词汇多样性', label_en: 'Lexical Resource',
          tip_zh: '① 每学一个高频词（如 important）记 2 个同义替换（crucial / significant / essential）；② 每天强制自己在回答中用 3 个"话题搭配"（如 apply for a scholarship / conduct an experiment）；③ 训练完成后回到句子，标出可以升级的单词并重新朗读 1 遍。',
          tip_en: '1) For every高频词 like "important", memorise 2 collocation-level synonyms (crucial / significant / essential). 2) Force 3 topic collocations per answer (e.g. "apply for a scholarship / conduct an experiment"). 3) After each drill, re-read once after upgrading weak words.' },
        { k: 'g', s: gScore, label_zh: '语法范围与准确性', label_en: 'Grammatical Range & Accuracy',
          tip_zh: '① 每段回答至少写一个让步状语从句（Although…）和一个定语从句（which / who）；② 有意识混合时态：背景用过去时、观点用现在时、展望用将来时/would；③ 录音后回听，圈出被吞掉的 "the / -ed / s" 并单独跟读 5 遍。',
          tip_en: '1) Force at least one "Although…" concession clause + one relative clause (which / who) per answer. 2) Mix tenses deliberately: past for stories, present for opinions, future/would for projections. 3) Replay and shadow the swallowed "the / -ed / s" endings 5 times each.' },
        { k: 'p', s: pScore, label_zh: '发音', label_en: 'Pronunciation',
          tip_zh: '① 每天花 5 分钟做"最小对立体"训练：ship/sheep, bit/beat, can/cam；② 重点练 3 个中国考生高频难点：/θ/（think→咬舌）、/ð/（this→咬舌浊化）、/v/ vs /w/（very / well）；③ 录音后用 App 对比波形，确保重音落在句子重音词上。',
          tip_en: '1) 5 minutes / day of minimal pairs: ship/sheep, bit/beat, can/cam. 2) Drill the 3 trouble sounds for Chinese learners: /θ/ (think → tongue between teeth), /ð/ (this → voiced), /v/ vs /w/ (very / well). 3) After recording, match sentence stress to the model and avoid flat intonation.' }
      ];
      const sorted = pairs.slice().sort((a,b) => a.s - b.s);
      const weakest = sorted[0];
      const secondWeak = sorted[1];
      // 根据 band 级别追加一段建议
      let bandTip = '';
      if (chosen.key === 'ielts_4_5') {
        bandTip = lang === 'zh'
          ? '\n\n【当前级别建议】你目前在 Band 4.5-5.0：下一步把 Part 1 每个高频问题都扩展为 3 句话（直接回答+一个原因+一个个人例子），不要只说 Yes/No + 1 句。'
          : '\n\n【Level tip】You are around Band 4.5-5.0. Turn every Part 1 answer into 3 sentences: direct answer + one reason + one personal example. Stop at one-word / Yes-No answers.';
      } else if (chosen.key === 'ielts_5_5') {
        bandTip = lang === 'zh'
          ? '\n\n【当前级别建议】你在 Band 5.5-6.0：下一步专攻 Part 2 Cue Card，严格按 2 分钟答题，每段必须包含 1 个连接词 + 1 个具体例子（日期/金额/地名），避免空泛话。'
          : '\n\n【Level tip】You are around Band 5.5-6.0. Drill Part 2 cue cards strictly for 2 minutes. Each paragraph needs at least one discourse marker + one concrete detail (date / number / place) — no empty statements.';
      } else if (chosen.key === 'ielts_6_5') {
        bandTip = lang === 'zh'
          ? '\n\n【当前级别建议】你在 Band 6.5-7.0：现在要补地道性（idiomaticity）—— 每次回答至少加 1 个自然习语或比喻表达（如 "a steep learning curve / it hit me that…"），同时在 Part 3 训练"让步 + 反驳"结构（Admittedly… That being said…）。'
          : '\n\n【Level tip】You are around Band 6.5-7.0. Push idiomaticity: drop 1 natural idiom/metaphor per answer (e.g. "a steep learning curve / it hit me that…") and master Part 3 concession → rebuttal structure (Admittedly… That being said…).';
      } else {
        bandTip = lang === 'zh'
          ? '\n\n【当前级别建议】你在 Band 7.5+：冲刺点在于"精确度（precision）"——录音后逐句回听，把被吞掉的冠词、时态词尾、弱读都逐个抠掉；Part 3 训练"双层次论证"：先让步再反证最后上升到社会维度（policy / education / future of work）。'
          : '\n\n【Level tip】You are around Band 7.5+. Focus on precision. After recording, hunt each swallowed article / tense ending / weak-form. For Part 3, train two-layer arguments: concession → rebuttal → lift to a social dimension (policy / education / future of work).';
      }
      const tip = (lang === 'zh'
        ? `【最弱项：${weakest.label_zh}】` + weakest.tip_zh
          + `\n\n【次弱项：${secondWeak.label_zh}】` + secondWeak.tip_zh
        : `【Weakest: ${weakest.label_en}】` + weakest.tip_en
          + `\n\n【2nd weakest: ${secondWeak.label_en}】` + secondWeak.tip_en
      ) + bandTip;
      return tip;
    })();

    return {
      bandLabel,
      bandTitle,
      bandColor,
      bandKey: chosen.key,
      avgScore: avg,
      fluencyScore: fScore,
      lexicalScore: lScore,
      grammarScore: gScore,
      pronunciationScore: pScore,
      fluencyLevel: levelOf(fScore),
      lexicalLevel: levelOf(lScore),
      grammarLevel: levelOf(gScore),
      pronunciationLevel: levelOf(pScore),
      nextStepText: nextStep
    };
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

  // 完成所有训练 - 真实更新进度到云端 progress 集合
  onFinishAll: function () {
    const that = this;
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
      lastActiveDate: today,
      currentPlan: this.data.planKey
    };

    // 如果是英语训练，追加本次雅思训练历史并更新最后 Band
    const contentLang = this.data.contentLang;
    if (contentLang === 'en' && that._lastIeltsSnapshot) {
      const snap = that._lastIeltsSnapshot;
      // 累计本次训练的总时长（使用所有句子的 recordSeconds 汇总，如果有的话，没有就用单句快照的 durationSec）
      const totalSec = Math.max(snap.durationSec, Math.max(this.data.recordSeconds || 0, 0));
      snap.sentenceCount = Math.max(1, this.data.sentences ? this.data.sentences.length : 1);
      snap.durationSec = totalSec;

      updates.ieltsBandHistory = [snap];  // 数组，云函数 syncProgress 会 append + 去重
      if (snap.bandLabel) {
        updates.lastIeltsBand = snap.bandLabel;
      }
      // 若 planKey 本身为雅思级别，顺便更新用户的最近雅思训练级别（辅助首页展示）
      if (/^ielts_/.test(this.data.planKey)) {
        updates.ieltsTarget = updates.ieltsTarget || progress.ieltsTarget || this.data.planKey;
      }
    }

    // 内部会写本地+云端，云端异步不阻塞UI
    app.updateProgress(updates);

    wx.showToast({ title: '🎉 Great Job!', icon: 'success', duration: 2000 });
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 2000);
  },

  onShare: function () {
    return { title: 'LinguaSpeak - 多语言朗读训练', path: '/pages/index/index' };
  }
});
