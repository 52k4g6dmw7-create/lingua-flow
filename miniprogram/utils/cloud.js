// miniprogram/utils/cloud.js
// 云开发能力统一封装

const CONFIG = require('../config.js');
const i18n = require('./i18n.js');

// 内部状态
let _cloudReady = false;
let _pendingQueue = [];
let _cloudInited = false;

// 内部云初始化
function ensureInit() {
  if (_cloudInited) return Promise.resolve(true);

  if (!wx.cloud || typeof wx.cloud.init !== 'function') {
    console.warn('[cloud] 当前基础库不支持云开发');
    _cloudInited = true;
    _cloudReady = false;
    return Promise.resolve(false);
  }

  if (!CONFIG.isCloudConfigured()) {
    // 未配置环境，标记就绪但call会走降级
    _cloudInited = true;
    _cloudReady = false;
    if (CONFIG.FEATURES.DEBUG) {
      console.warn('[cloud] 云开发环境未配置，将使用本地降级模式');
    }
    return Promise.resolve(false);
  }

  try {
    wx.cloud.init({
      env: CONFIG.CLOUD_ENV,
      traceUser: true
    });
    _cloudInited = true;
    _cloudReady = true;
    return Promise.resolve(true);
  } catch (e) {
    console.error('[cloud] 初始化失败:', e);
    _cloudInited = true;
    _cloudReady = false;
    return Promise.resolve(false);
  }
}

// 检查云端就绪（带提示）
function checkReady(options) {
  options = options || {};
  if (!_cloudReady) {
    if (options.showToast !== false) {
      wx.showToast({
        title: options.failText || i18n.t('toast.networkError'),
        icon: 'none'
      });
    }
    return false;
  }
  return true;
}

// ===== 云函数调用 =====
function call(name, data, options) {
  options = options || {};
  data = data || {};
  return ensureInit().then((ready) => {
    if (!ready) {
      // 本地降级，返回 mock
      if (CONFIG.FEATURES.DEBUG) {
        console.info(`[cloud.call] [降级] ${name} -> fallback`);
      }
      return Promise.resolve({
        _fallback: true,
        result: (options.fallback || null)
      });
    }

    if (options.loading) {
      wx.showLoading({ title: options.loadingText || i18n.t('common.loading'), mask: true });
    }

    return new Promise((resolve, reject) => {
      try {
        wx.cloud.callFunction({
          name: name,
          data: data,
          success: (res) => {
            if (options.loading) wx.hideLoading();
            const result = res.result || {};
            if (result && result.errorCode && result.errorCode !== 0) {
              console.error(`[cloud.call] ${name} 返回错误:`, result);
              if (options.showErrorToast !== false) {
                wx.showToast({
                  title: result.errorMsg || i18n.t('common.fail'),
                  icon: 'none'
                });
              }
              return reject(result);
            }
            resolve({ result: result, _fallback: false });
          },
          fail: (err) => {
            if (options.loading) wx.hideLoading();
            console.error(`[cloud.call] ${name} 调用失败:`, err);
            if (options.showErrorToast !== false) {
              wx.showToast({
                title: CONFIG.FEATURES.DEBUG ? (err.errMsg || 'Cloud Call Fail') : i18n.t('toast.networkError'),
                icon: 'none'
              });
            }
            reject(err);
          }
        });
      } catch (e) {
        if (options.loading) wx.hideLoading();
        console.error(`[cloud.call] ${name} 异常:`, e);
        reject(e);
      }
    });
  });
}

// ===== 文件上传到云存储 =====
function upload(localPath, cloudPath, options) {
  options = options || {};
  return ensureInit().then((ready) => {
    if (!ready) {
      console.warn('[cloud.upload] 未配置云存储，返回本地路径');
      return Promise.resolve({
        fileID: localPath,
        tempFilePath: localPath,
        _fallback: true
      });
    }
    if (options.loading) {
      wx.showLoading({ title: options.loadingText || 'Uploading...', mask: true });
    }
    return new Promise((resolve, reject) => {
      try {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: localPath,
          success: (res) => {
            if (options.loading) wx.hideLoading();
            // 同时拿临时URL方便回放
            resolve({
              fileID: res.fileID,
              tempFilePath: localPath,
              _fallback: false
            });
          },
          fail: (err) => {
            if (options.loading) wx.hideLoading();
            console.error('[cloud.upload] 失败:', err);
            if (options.showErrorToast !== false) {
              wx.showToast({
                title: CONFIG.FEATURES.DEBUG ? (err.errMsg || 'Upload Fail') : 'Upload Error',
                icon: 'none'
              });
            }
            reject(err);
          }
        });
      } catch (e) {
        if (options.loading) wx.hideLoading();
        reject(e);
      }
    });
  });
}

// 根据 fileID 拿临时URL用于播放/下载
function getTempURL(fileID) {
  return ensureInit().then((ready) => {
    if (!ready || !fileID || fileID.indexOf('cloud://') !== 0) {
      return Promise.resolve(fileID); // 本地路径直接回
    }
    return new Promise((resolve) => {
      try {
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: (res) => {
            const item = res.fileList && res.fileList[0];
            if (item && item.tempFileURL) {
              resolve(item.tempFileURL);
            } else {
              resolve(fileID);
            }
          },
          fail: () => resolve(fileID)
        });
      } catch (e) {
        resolve(fileID);
      }
    });
  });
}

// db 快捷访问（直接返回集合引用，调用方自己.where.get）
function db(col) {
  ensureInit();
  if (!_cloudReady || !wx.cloud || !wx.cloud.database) return null;
  try {
    return wx.cloud.database().collection(col);
  } catch (e) {
    console.error('[cloud.db] 失败:', e);
    return null;
  }
}

// 生成 openid 相关的安全 cloudPath
function buildCloudPath(prefix, openid, filename) {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  const safeOpenid = (openid || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = (filename || `f${ts}`).replace(/\s+/g, '_');
  return `${prefix}/${safeOpenid}/${ts}_${rand}_${safeFilename}`;
}

module.exports = {
  init: ensureInit,
  ready: () => _cloudReady,
  checkReady: checkReady,
  call: call,
  upload: upload,
  getTempURL: getTempURL,
  db: db,
  buildCloudPath: buildCloudPath
};
