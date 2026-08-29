// cloudfunctions/syncUser/index.js
// 用户表 users 的初始化与更新：
//  - action=init: 首次登录时写入用户（幂等，已存在则返回现有的）
//  - action=update: 修改头像/昵称/手机号/语言偏好等
// 数据库集合：users（需要先在云开发控制台创建，并开启"仅创建者可读写"权限）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const USERS_COLLECTION = 'users';

async function ensureCollection() {
  try {
    await db.createCollection(USERS_COLLECTION);
  } catch (e) {
    // -501001 = 集合已存在，忽略
    if (e.errCode !== -501001) {
      console.warn('[syncUser] createCollection warn:', e && e.errCode, e && e.errMsg);
    }
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return { errorCode: 1001, errorMsg: '未获取到用户身份' };
  }

  await ensureCollection();

  const action = event.action || 'init';

  try {
    if (action === 'init') {
      const existing = await db.collection(USERS_COLLECTION).where({ _openid: openid }).get();

      if (existing.data && existing.data.length > 0) {
        // 老用户，更新最近活跃时间
        const user = existing.data[0];
        await db.collection(USERS_COLLECTION).doc(user._id).update({
          data: {
            lastActiveAt: Date.now()
          }
        });
        return Object.assign({}, user, {
          lastActiveAt: Date.now(),
          errorCode: 0,
          errorMsg: ''
        });
      }

      // 新用户，初始化记录
      const now = Date.now();
      const newUser = {
        nickName: event.nickName || '',
        avatarUrl: event.avatarUrl || '',
        phone: '',
        lang: event.lang || 'zh',
        createdAt: now,
        lastActiveAt: now
      };
      const res = await db.collection(USERS_COLLECTION).add({ data: newUser });
      return Object.assign({ _id: res._id, _openid: openid }, newUser, {
        errorCode: 0,
        errorMsg: ''
      });
    }

    if (action === 'update') {
      const patch = event.patch || {};
      // 白名单字段，防止前端注入
      const allowedKeys = ['nickName', 'avatarUrl', 'phone', 'lang', 'lastActiveAt'];
      const safePatch = {};
      allowedKeys.forEach(k => {
        if (patch[k] !== undefined) safePatch[k] = patch[k];
      });
      if (Object.keys(safePatch).length === 0) {
        return { errorCode: 1003, errorMsg: '没有可更新的字段' };
      }

      const existing = await db.collection(USERS_COLLECTION).where({ _openid: openid }).get();
      if (!existing.data || existing.data.length === 0) {
        // 用户不存在，先创建再更新
        const now = Date.now();
        const created = await db.collection(USERS_COLLECTION).add({
          data: Object.assign({ createdAt: now, lastActiveAt: now }, safePatch)
        });
        return Object.assign({ _id: created._id, _openid: openid }, safePatch, {
          errorCode: 0,
          errorMsg: ''
        });
      }
      const userId = existing.data[0]._id;
      await db.collection(USERS_COLLECTION).doc(userId).update({ data: safePatch });
      return Object.assign({}, existing.data[0], safePatch, {
        errorCode: 0,
        errorMsg: ''
      });
    }

    return { errorCode: 1002, errorMsg: '未知的 action 参数' };
  } catch (e) {
    console.error('[syncUser] 异常:', e && e.errMsg || e);
    return {
      errorCode: e && e.errCode || 500,
      errorMsg: e && e.errMsg || '服务器错误'
    };
  }
};
