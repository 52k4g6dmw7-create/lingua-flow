// pages/upload/upload.js
const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    locale: {},
    currentLang: 'zh',
    // 文本内容
    inputText: '',
    textLength: 0,
    maxLength: 5000,
    // 上传历史
    history: [],
    // 选择的文件
    selectedFile: null,
    // 目标语言选择
    targetLang: 'en',
    targetLangs: [
      { code: 'zh', native: '中文', flag: '🇨🇳' },
      { code: 'en', native: 'English', flag: '🇺🇸' },
      { code: 'ja', native: '日本語', flag: '🇯🇵' },
      { code: 'ko', native: '한국어', flag: '🇰🇷' },
      { code: 'fr', native: 'Français', flag: '🇫🇷' }
    ]
  },

  onLoad: function () {
    this.initData();
  },

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
    wx.setNavigationBarTitle({
      title: i18n.t('tabBar.upload', lang)
    });
  },

  // 加载历史
  loadHistory: function () {
    try {
      const history = wx.getStorageSync('ls_upload_history') || [];
      this.setData({ history: history });
    } catch (e) {
      console.warn('加载上传历史失败', e);
    }
  },

  // 保存历史
  saveHistory: function (item) {
    try {
      let history = wx.getStorageSync('ls_upload_history') || [];
      history.unshift(item);
      if (history.length > 20) history = history.slice(0, 20);
      wx.setStorageSync('ls_upload_history', history);
      this.setData({ history: history });
    } catch (e) {
      console.warn('保存上传历史失败', e);
    }
  },

  // 文本输入
  onTextInput: function (e) {
    const value = e.detail.value || '';
    this.setData({
      inputText: value,
      textLength: value.length
    });
  },

  // 粘贴文本
  onPasteText: function () {
    const that = this;
    wx.getClipboardData({
      success: function (res) {
        if (res.data) {
          const clipped = res.data.substring(0, that.data.maxLength);
          that.setData({
            inputText: clipped,
            textLength: clipped.length
          });
          wx.showToast({
            title: that.data.locale.common.success,
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: 'Clipboard empty',
            icon: 'none'
          });
        }
      },
      fail: function () {
        wx.showToast({
          title: 'Paste failed',
          icon: 'none'
        });
      }
    });
  },

  // 清空输入
  onClearText: function () {
    this.setData({
      inputText: '',
      textLength: 0
    });
  },

  // 选择文件
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
        wx.showToast({
          title: that.data.locale.common.success,
          icon: 'success'
        });
      },
      fail: function () {
        wx.showToast({
          title: 'Select cancelled',
          icon: 'none'
        });
      }
    });
  },

  // 移除已选文件
  onRemoveFile: function () {
    this.setData({ selectedFile: null });
  },

  // 选择目标语言
  onSelectTargetLang: function (e) {
    const code = e.currentTarget.dataset.code;
    this.setData({ targetLang: code });
  },

  // 开始训练（提交）
  onStartTraining: function () {
    const text = this.data.inputText;
    const file = this.data.selectedFile;

    if (!text && !file) {
      wx.showToast({
        title: 'Please enter text or select file',
        icon: 'none'
      });
      return;
    }

    if (text && text.trim().length < 10) {
      wx.showToast({
        title: 'At least 10 characters',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: this.data.locale.common.loading,
      mask: true
    });

    setTimeout(() => {
      wx.hideLoading();
      // 保存到历史
      const historyItem = {
        id: Date.now(),
        content: (text || file.name).substring(0, 100),
        contentFull: text,
        targetLang: this.data.targetLang,
        type: file ? 'file' : 'text',
        size: file ? file.size : text.length,
        time: this.formatDate(new Date())
      };
      this.saveHistory(historyItem);

      // 跳转到朗读页面，携带自定义内容
      const sentences = this.splitIntoSentences(text || 'Custom content uploaded. Start practicing!');
      app.globalData.customSentences = sentences;
      app.globalData.customLang = this.data.targetLang;

      this.setData({
        inputText: '',
        textLength: 0,
        selectedFile: null
      });

      wx.navigateTo({
        url: '/pages/read/read?plan=custom_' + historyItem.id
      });
    }, 800);
  },

  // 分句处理
  splitIntoSentences: function (text) {
    if (!text) return [];
    // 按句号、感叹号、问号、换行等分割
    const sentences = text.split(/[\n。！？!?；;]/).map(s => s.trim()).filter(s => s.length > 0);
    if (sentences.length === 0) return [text];
    return sentences.slice(0, 10);
  },

  // 清空历史
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
          wx.removeStorageSync('ls_upload_history');
          that.setData({ history: [] });
          wx.showToast({
            title: that.data.locale.toast.cacheCleared,
            icon: 'success'
          });
        }
      }
    });
  },

  // 使用历史内容
  onUseHistory: function (e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.history.find(h => h.id === id);
    if (!item) return;

    if (item.contentFull) {
      this.setData({
        inputText: item.contentFull,
        textLength: item.contentFull.length,
        targetLang: item.targetLang || this.data.targetLang
      });
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
      wx.showToast({
        title: this.data.locale.common.success,
        icon: 'success'
      });
    }
  },

  // 删除历史单条
  onDeleteHistory: function (e) {
    const id = e.currentTarget.dataset.id;
    const history = this.data.history.filter(h => h.id !== id);
    this.setData({ history: history });
    wx.setStorageSync('ls_upload_history', history);
  },

  formatDate: function (d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  },

  // FAB跳转到朗读
  onGoRead: function () {
    wx.navigateTo({
      url: '/pages/read/read?plan=upload'
    });
  }
});
