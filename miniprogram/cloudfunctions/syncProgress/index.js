// cloudfunctions/syncProgress/index.js
// 学习进度云端同步：集合名 progress，以用户 openid 做唯一键
// action=get   拉进度
// action=set   更新进度（合并写入）
// 权限建议：云开发控制台 -> 数据库 -> progress -> 权限 -> 仅创建者可读写

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTION = 'progress';

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
  lastActiveDate: null
};

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
      // 白名单
      const ALLOWED = ['consecutiveDays','totalDays','totalMinutes','currentWeek',
        'currentDayOfWeek','masteringSkills','lastActiveDate','currentPlan','extra'];
      const safePatch = {};
      ALLOWED.forEach(k => { if (patch[k] !== undefined) safePatch[k] = patch[k]; });

      const existing = await db.collection(COLLECTION).where({ _openid: openid }).get();
      let saved;
      if (existing.data && existing.data.length > 0) {
        const merged = Object.assign({}, DEFAULT_PROGRESS, existing.data[0], safePatch);
        await db.collection(COLLECTION).doc(existing.data[0]._id).update({ data: safePatch });
        saved = merged;
      } else {
        const merged = Object.assign({}, DEFAULT_PROGRESS, safePatch, {
          _openid: openid,
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
