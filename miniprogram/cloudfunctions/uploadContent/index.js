// cloudfunctions/uploadContent/index.js
// 用户上传内容的真实落地：
//  - type=text       直接写入 content 集合，分句后返回
//  - type=file       根据 fileID 从云存储中下载 txt 文本文件并解析
//  - action=history  拉取用户的历史上传（前20条）
// 数据库集合: contents，权限建议：仅创建者可读写

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = 'contents';

async function ensureCollection() {
  try { await db.createCollection(COLLECTION); } catch (e) {
    if (e.errCode !== -501001) { /* ignore */ }
  }
}

function splitSentences(text, lang) {
  if (!text) return [];
  const east = (lang === 'zh' || lang === 'ja' || lang === 'ko');
  const re = east ? /[\n。！？!?；;]/ : /[\n.!?;]+/;
  const arr = text.split(re).map(s => s.trim()).filter(s => s.length > 0);
  return arr.length ? arr.slice(0, 50) : [text];
}

async function saveDoc(openid, doc) {
  const r = await db.collection(COLLECTION).add({ data: doc });
  return r._id;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };

  await ensureCollection();

  try {
    // ===== action=history 拉历史 =====
    if (event.action === 'history') {
      const r = await db.collection(COLLECTION)
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      return { errorCode: 0, errorMsg: '', list: r.data || [] };
    }

    // ===== action=delete 删除历史 =====
    if (event.action === 'delete' && event.id) {
      await db.collection(COLLECTION).doc(event.id).remove();
      return { errorCode: 0, errorMsg: '' };
    }

    const lang = event.lang || 'en';
    const createdAt = Date.now();

    // ===== type=text =====
    if (event.type === 'text') {
      const raw = (event.text || '').toString();
      if (raw.length < 5) {
        return { errorCode: 1003, errorMsg: '文本内容过短（至少5个字符）' };
      }
      const sentences = splitSentences(raw, lang);
      const doc = {
        type: 'text',
        title: raw.substring(0, 40),
        text: raw,
        sentences,
        lang,
        createdAt
      };
      const id = await saveDoc(openid, doc);
      return {
        errorCode: 0,
        errorMsg: '',
        contentId: id,
        sentences,
        lang,
        title: doc.title
      };
    }

    // ===== type=file =====
    if (event.type === 'file') {
      const fileID = event.fileID;
      if (!fileID) return { errorCode: 1002, errorMsg: '缺少 fileID' };

      let text = '';
      try {
        const dl = await cloud.downloadFile({ fileID });
        const buf = dl.fileContent;
        text = (buf && buf.toString) ? buf.toString('utf8') : '';
      } catch (e) {
        return {
          errorCode: 1004,
          errorMsg: '文件下载失败：' + (e && e.errMsg || '未知错误')
        };
      }

      if (!text || text.trim().length < 5) {
        return { errorCode: 1005, errorMsg: '文件内容为空或过短（仅支持 UTF-8 .txt）' };
      }

      const sentences = splitSentences(text, lang);
      const doc = {
        type: 'file',
        fileID,
        title: (event.filename || 'uploaded.txt').substring(0, 40),
        text: text.substring(0, 10000), // 入库裁剪超长文件避免超限
        sentences,
        lang,
        createdAt
      };
      const id = await saveDoc(openid, doc);
      return {
        errorCode: 0,
        errorMsg: '',
        contentId: id,
        sentences,
        lang,
        title: doc.title
      };
    }

    return { errorCode: 1000, errorMsg: '未知 type' };
  } catch (e) {
    console.error('[uploadContent] err:', e && e.errMsg || e);
    return { errorCode: e && e.errCode || 500, errorMsg: e && e.errMsg || '服务器错误' };
  }
};
