// cloudfunctions/uploadRecord/index.js
// 录音元数据入库，方便后续历史回看、统计、AI 二次评测
// 前端 utils/api.uploadRecord() 会先把文件上传到云存储拿到 fileID，再调用本云函数写 DB

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = 'records';

async function ensureCollection() {
  try { await db.createCollection(COLLECTION); } catch (e) {
    if (e.errCode !== -501001) { /* ignore */ }
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };

  await ensureCollection();

  const fileID = event.fileID;
  if (!fileID) return { errorCode: 1002, errorMsg: '缺少 fileID' };

  const doc = {
    fileID,
    duration: Number(event.duration) || 0,
    targetText: event.targetText || '',
    contentLang: event.contentLang || 'en',
    sentenceId: event.sentenceId || null,
    planKey: event.planKey || '',
    createdAt: Date.now()
  };

  try {
    const r = await db.collection(COLLECTION).add({ data: doc });
    return {
      errorCode: 0,
      errorMsg: '',
      recordId: r._id
    };
  } catch (e) {
    console.error('[uploadRecord] DB err:', e && e.errMsg || e);
    return { errorCode: 500, errorMsg: e && e.errMsg || '写入失败' };
  }
};
