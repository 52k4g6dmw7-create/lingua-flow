// pages/upload/upload.js
// 真实上传版本：
//   - 文本：api.createTextContent() -> 云函数 uploadContent type=text -> 写 contents 集合 + 分句
//   - 文件：先 cloud.upload 上传到云存储 -> 云函数 uploadContent type=file 下载解析分句
//   - 历史：api.listContentHistory() 拉云端历史，失败用本地兜底

const app = getApp();
const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const cloud = require('../../utils/cloud.js');

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    inputText: '',
    textLength: 0,
    maxLength: 5000,
    history: [],
    selectedFile: null,
    targetLang: 'en',
    targetLangs: [
      { code: 'zh', native: '中文', flag: '🇨🇳' },
      { code: 'en', native: 'English', flag: '🇺🇸' },
      { code: 'ja', native: '日本語', flag: '🇯🇵' },
      { code: 'ko', native: '한국어', flag: '🇰🇷' },
      { code: 'fr', native: 'Français', flag: '🇫🇷' }
    ],
    submitting: false
  },

  onLoad: function () { this.initData(); },

  onShow: function () {
    this.refreshLocale();
    this.loadHistory();
  },

  initData: function () {
    this.refreshLocale();
    this.loadHistory();
  },

  refreshLocale: function () {
    const locale = i18n.getLocale();
    const lang = i18n.getLang();
    this.setData({
      locale: locale,
      currentLang: lang,
      targetLang: this.data.targetLang || lang
    });
    wx.setNavigationBarTitle({ title: i18n.t('tabBar.upload', lang) });
  },

  // 加载历史：优先云端，失败本地
  loadHistory: function () {
    const that = this;
    api.listContentHistory().then((list) => {
      // 云端记录格式适配
      const mapped = Array.isArray(list) ? list.map(item => ({
        id: item._id || item.contentId || ('c' + Math.random()),
        content: (item.title || item.text || '').substring(0, 100),
        contentFull: item.text || '',
        sentences: item.sentences || [],
        targetLang: item.lang || that.data.targetLang,
        type: item.type || 'text',
        size: (item.text && item.text.length) || 0,
        time: that.formatDate(new Date(item.createdAt || Date.now()))
      })) : [];
      if (mapped.length > 0) {
        that.setData({ history: mapped });
        that.saveLocalHistory(mapped);
      } else {
        that.setData({ history: that.getLocalHistory() });
      }
    }).catch(() => {
      that.setData({ history: that.getLocalHistory() });
    });
  },

  getLocalHistory: function () {
    try { return wx.getStorageSync('ls_upload_history') || []; } catch (e) { return []; }
  },

  saveLocalHistory: function (list) {
    try {
      const trimmed = (list || []).slice(0, 20);
      wx.setStorageSync('ls_upload_history', trimmed);
    } catch (e) {}
  },

  // 兼容旧接口
  saveHistory: function (item) {
    const all = [item].concat(this.getLocalHistory()).slice(0, 20);
    this.saveLocalHistory(all);
    this.setData({ history: all });
  },

  onTextInput: function (e) {
    const value = e.detail.value || '';
    this.setData({
      inputText: value,
      textLength: value.length
    });
  },

  onPasteText: function () {
    const that = this;
    wx.getClipboardData({
      success: function (res) {
        if (res.data) {
          const clipped = res.data.substring(0, that.data.maxLength);
          that.setData({ inputText: clipped, textLength: clipped.length });
          wx.showToast({ title: that.data.locale.common.success, icon: 'success' });
        } else {
          wx.showToast({ title: 'Clipboard empty', icon: 'none' });
        }
      },
      fail: function () { wx.showToast({ title: 'Paste failed', icon: 'none' }); }
    });
  },

  onClearText: function () {
    this.setData({ inputText: '', textLength: 0 });
  },

  onSelectFile: function () {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'docx', 'pdf'],
      success: function (res) {
        const file = res.tempFiles[0];
        that.setData({
          selectedFile: {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            path: file.path
          }
        });
        wx.showToast({ title: that.data.locale.common.success, icon: 'success' });
      },
      fail: function () { wx.showToast({ title: 'Select cancelled', icon: 'none' }); }
    });
  },

  onRemoveFile: function () { this.setData({ selectedFile: null }); },

  onSelectTargetLang: function (e) {
    this.setData({ targetLang: e.currentTarget.dataset.code });
  },

  // 真实提交
  onStartTraining: function () {
    const that = this;
    // 会员拦截：上传解析属于核心训练能力
    const block = app.requireVip();
    if (block && block.blocked) {
      wx.showModal({
        title: block.title,
        content: block.content,
        confirmText: block.confirmText || (i18n.getLang()==='zh'?'开通会员':'Upgrade'),
        cancelText: i18n.getLang()==='zh'?'稍后':'Later',
        success(res){
          if (res.confirm) wx.navigateTo({ url: '/pages/vip/vip?from=upload' });
        }
      });
      return;
    }
    const text = this.data.inputText;
    const file = this.data.selectedFile;

    if (!text && !file) {
      wx.showToast({ title: 'Please enter text or select file', icon: 'none' });
      return;
    }

    if (text && text.trim().length < 5) {
      wx.showToast({ title: 'At least 5 characters', icon: 'none' });
      return;
    }

    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: this.data.locale.common.loading, mask: true });

    const targetLang = this.data.targetLang;

    const handleResult = (res) => {
      wx.hideLoading();
      that.setData({ submitting: false });
      if (!res || !res.sentences || res.sentences.length === 0) {
        wx.showToast({ title: (res && res.errorMsg) || '解析失败', icon: 'none' });
        return;
      }

      // 插入到历史
      const item = {
        id: res.contentId || Date.now(),
        content: (res.title || text || (file && file.name) || '').substring(0, 100),
        contentFull: text,
        sentences: res.sentences,
        targetLang: res.lang || targetLang,
        type: file ? 'file' : 'text',
        size: file ? file.size : text.length,
        time: that.formatDate(new Date())
      };
      that.saveHistory(item);

      // 跳朗读页
      app.globalData.customSentences = res.sentences;
      app.globalData.customLang = res.lang || targetLang;
      that.setData({
        inputText: '', textLength: 0, selectedFile: null
      });
      wx.navigateTo({ url: '/pages/read/read?plan=custom_' + item.id });
    };

    const handleError = (err) => {
      wx.hideLoading();
      that.setData({ submitting: false });
      console.warn('[upload] submit err:', err && err.errMsg || err);
      // 本地兜底：至少还能跳转
      const fallback = text
        ? that.splitIntoSentences(text)
        : ['Uploaded content parsed locally.', 'Please start reading.'];
      handleResult({
        contentId: 'local_' + Date.now(),
        sentences: fallback,
        lang: targetLang
      });
      wx.showToast({ title: '本地解析模式', icon: 'none' });
    };

    if (text) {
      // 文本路径
      api.createTextContent({ text, lang: targetLang })
        .then(handleResult)
        .catch(handleError);
    } else if (file) {
      // 文件路径：先上传文件到云存储，再让云函数解析
      cloud.upload(file.path, `uploads/${Date.now()}_${file.name}`, {
        loadingText: '上传文件...'
      }).then((uploadRes) => {
        return api.parseFileContent(uploadRes.fileID, targetLang);
      }).then(handleResult).catch(handleError);
    }
  },

  splitIntoSentences: function (text) {
    if (!text) return [];
    const sentences = text.split(/[\n。！？!?；;]/).map(s => s.trim()).filter(s => s.length > 0);
    if (sentences.length === 0) return [text];
    return sentences.slice(0, 20);
  },

  onClearHistory: function () {
    const that = this;
    wx.showModal({
      title: that.data.locale.upload.clearHistory,
      content: 'Clear all upload history?',
      confirmText: that.data.locale.common.confirm,
      cancelText: that.data.locale.common.cancel,
      confirmColor: '#e74c3c',
      success: function (res) {
        if (res.confirm) {
          try { wx.removeStorageSync('ls_upload_history'); } catch (e) {}
          that.setData({ history: [] });
          wx.showToast({ title: that.data.locale.toast.cacheCleared, icon: 'success' });
        }
      }
    });
  },

  onUseHistory: function (e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.history.find(h => h.id === id);
    if (!item) return;

    // 如果有 sentences，直接跳转朗读；否则填回文本框
    if (item.sentences && item.sentences.length > 0) {
      app.globalData.customSentences = item.sentences;
      app.globalData.customLang = item.targetLang || this.data.targetLang;
      wx.navigateTo({ url: '/pages/read/read?plan=custom_' + item.id });
    } else if (item.contentFull) {
      this.setData({
        inputText: item.contentFull,
        textLength: item.contentFull.length,
        targetLang: item.targetLang || this.data.targetLang
      });
      wx.pageScrollTo({ scrollTop: 0, duration: 300 });
      wx.showToast({ title: this.data.locale.common.success, icon: 'success' });
    } else {
      wx.showToast({ title: '内容不可用', icon: 'none' });
    }
  },

  onDeleteHistory: function (e) {
    const id = e.currentTarget.dataset.id;
    const history = this.data.history.filter(h => h.id !== id);
    this.setData({ history: history });
    this.saveLocalHistory(history);
  },

  formatDate: function (d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  },

  onGoRead: function () {
    wx.navigateTo({ url: '/pages/read/read?plan=upload' });
  }
});
