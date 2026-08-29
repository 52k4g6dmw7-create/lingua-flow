// cloudfunctions/syncProgress/index.js
// 学习进度云端同步：集合名 progress，以用户 openid 做唯一键
// action=get   拉进度
// action=set   更新进度（合并写入）
//   patch.ieltsBandHistory 传入时，会按时间追加（最多保留最近 200 条），而不是直接覆盖
//
// 权限建议：云开发控制台 -> 数据库 -> progress -> 权限 -> 仅创建者可读写
// 建议字段：
//   consecutiveDays, totalDays, totalMinutes, currentWeek, currentDayOfWeek,
//   masteringSkills, lastActiveDate, currentPlan, ieltsTarget, lastIeltsBand,
//   ieltsBandHistory: [{ ts, date, levelKey, bandLabel, avgScore, planKey, sentenceCount, durationSec }]

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTION = 'progress';
const MAX_IELTS_HISTORY = 200;

async function ensureCollection() {
  try { await db.createCollection(COLLECTION); } catch (e) {
    if (e.errCode !== -501001) { /* ignore already exists */ }
  }
}

const DEFAULT_PROGRESS = {
  consecutiveDays: 0,
  totalDays: 0,
  totalMinutes: 0,
  currentWeek: 1,
  currentDayOfWeek: 1,
  masteringSkills: [{ id: 1, nameKey: 'conclusionFirst', progress: 15, status: 'start' }],
  lastActiveDate: null,
  currentPlan: '',
  ieltsTarget: '',            // 用户在首页选择的雅思目标级别 key：ielts_5_5 等
  lastIeltsBand: '',          // 最近一次训练得到的 Band：如 '6.5-7.0'
  ieltsBandHistory: [],       // 雅思分段训练历史
  updatedAt: 0
};

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function mergeIeltsHistory(oldList, newItems) {
  if (!Array.isArray(newItems) || newItems.length === 0) return oldList || [];
  const combined = Array.isArray(oldList) ? oldList.slice() : [];
  newItems.forEach(item => {
    if (item && typeof item === 'object') combined.push(item);
  });
  // 按 ts 倒序，去重（同 ts 同 levelKey 同 avgScore 视为同一条）
  combined.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const seen = new Set();
  const uniq = [];
  combined.forEach(item => {
    const k = `${item.ts || 0}|${item.levelKey || ''}|${item.avgScore || 0}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(item);
    }
  });
  return uniq.slice(0, MAX_IELTS_HISTORY);
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };

  await ensureCollection();
  const action = event.action || 'get';

  try {
    if (action === 'get') {
      const existing = await db.collection(COLLECTION).where({ _openid: openid }).get();
      if (existing.data && existing.data.length > 0) {
        const p = existing.data[0];
        return Object.assign({}, DEFAULT_PROGRESS, p, { errorCode: 0, errorMsg: '' });
      }
      return Object.assign({}, DEFAULT_PROGRESS, { _openid: openid, errorCode: 0, errorMsg: '' });
    }

    if (action === 'set') {
      const patch = event.patch || {};
      const ALLOWED = ['consecutiveDays','totalDays','totalMinutes','currentWeek',
        'currentDayOfWeek','masteringSkills','lastActiveDate','currentPlan','ieltsTarget',
        'lastIeltsBand','updatedAt'];
      const safePatch = {};
      ALLOWED.forEach(k => { if (patch[k] !== undefined) safePatch[k] = patch[k]; });
      safePatch.updatedAt = Date.now();

      const existing = await db.collection(COLLECTION).where({ _openid: openid }).get();
      let saved;

      if (existing.data && existing.data.length > 0) {
        const oldDoc = existing.data[0];
        // 如果传入了 ieltsBandHistory（数组），合并而不是覆盖
        if (patch.ieltsBandHistory) {
          const merged = mergeIeltsHistory(oldDoc.ieltsBandHistory, patch.ieltsBandHistory);
          // 如果 merged 不同才 set，避免无意义写
          safePatch.ieltsBandHistory = merged;
        }
        const mergedDoc = Object.assign({}, DEFAULT_PROGRESS, oldDoc, safePatch);
        await db.collection(COLLECTION).doc(oldDoc._id).update({ data: safePatch });
        saved = mergedDoc;
      } else {
        const ieltsBandHistory = patch.ieltsBandHistory
          ? mergeIeltsHistory([], patch.ieltsBandHistory)
          : [];
        const merged = Object.assign({}, DEFAULT_PROGRESS, safePatch, {
          _openid: openid,
          ieltsBandHistory,
          createdAt: Date.now()
        });
        const r = await db.collection(COLLECTION).add({ data: merged });
        saved = Object.assign({}, merged, { _id: r._id });
      }
      return Object.assign({}, saved, { errorCode: 0, errorMsg: '' });
    }

    return { errorCode: 1002, errorMsg: '未知 action' };
  } catch (e) {
    console.error('[syncProgress]', e && e.errMsg || e);
    return { errorCode: e && e.errCode || 500, errorMsg: e && e.errMsg || '服务器错误' };
  }
};
