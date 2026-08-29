// cloudfunctions/activateKey/index.js
// 激活码兑换会员：
//   - activations 集合结构（由运营在云控制台批量导入或用 generate 接口生成）：
//     { code: 'LS-XXXX-XXXX-XXXX', planKey: 'pro_2year' | 'pro_forever',
//       price: 4980, status: 0 | 1, usedBy: openid | '', usedAt: 0,
//       createdAt: ts, batch: '2026_Q1', remark: '渠道-张三' }
//     status 枚举：0 = 未使用   1 = 已使用
//   - action = redeem        前端：用户输入激活码 -> 校验未使用 -> 写入 users.membership -> status=1
//   - action = generate      运营（云控制台/管理员传adminKey）：批量生成 N 个激活码
//   - action = list_batch    管理：查看某批次激活码的使用情况（可选）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const USERS = 'users';
const ACTIVATIONS = 'activations';
const EXPECTED_ADMIN_KEY = process.env.VIP_ADMIN_KEY || 'LINGUA_ADMIN_CHANGE_ME_PLEASE';

const PLAN_TABLE = {
  pro_2year:   { durationType: 'years',   durationValue: 2, isForever: false },
  pro_forever: { durationType: 'forever', durationValue: 0, isForever: true  }
};

async function ensureCollection(name) {
  try { await db.createCollection(name); } catch (e) { if (e.errCode !== -501001) console.warn('[ensureCol]', name, e && e.errCode); }
}

function randomCode(planKey) {
  // 生成形如 LS-P2Y-7F3K-9XQ2 的可读激活码
  const prefix = planKey === 'pro_forever' ? 'LS-PRO' : 'LS-P2Y';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n) => { let s = ''; for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; };
  return `${prefix}-${part(4)}-${part(4)}-${part(4)}`;
}

function calcExpire(planKey, fromNow) {
  const def = PLAN_TABLE[planKey];
  if (!def) return { expiresAt: 0, isForever: false };
  if (def.isForever) return { expiresAt: 0, isForever: true };
  const base = fromNow || Date.now();
  const d = new Date(base);
  if (def.durationType === 'years') d.setFullYear(d.getFullYear() + Number(def.durationValue || 0));
  else if (def.durationType === 'months') d.setMonth(d.getMonth() + Number(def.durationValue || 0));
  else if (def.durationType === 'days') d.setDate(d.getDate() + Number(def.durationValue || 0));
  return { expiresAt: d.getTime(), isForever: false };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || '';
  const action = event.action || 'redeem';

  await ensureCollection(ACTIVATIONS);

  try {
    // ================================================================
    // action=generate  管理员批量生成激活码（不传 adminKey 直接拒绝）
    // ================================================================
    if (action === 'generate') {
      if ((event.adminKey || '') !== EXPECTED_ADMIN_KEY) {
        return { errorCode: 2001, errorMsg: '管理员密钥不正确（请在云函数环境变量 VIP_ADMIN_KEY 配置）' };
      }
      const planKey = event.planKey;
      if (!PLAN_TABLE[planKey]) return { errorCode: 2003, errorMsg: '未知套餐 planKey（pro_2year / pro_forever）' };

      const count = Math.max(1, Math.min(500, Number(event.count) || 1));
      const batch = event.batch || ('B' + Date.now());
      const remark = event.remark || '';
      const price = Number(event.price) || (planKey === 'pro_forever' ? 9900 : 4980);

      const now = Date.now();
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({
          code: randomCode(planKey),
          planKey,
          price,
          status: 0,
          usedBy: '',
          usedAt: 0,
          createdAt: now,
          batch,
          remark
        });
      }
      // 批量插入：wx-server-sdk 单次 add 只支持 1 条，循环 500 次也够快
      for (const doc of list) {
        try { await db.collection(ACTIVATIONS).add({ data: doc }); } catch (e) { console.warn('insert fail', e); }
      }
      return {
        errorCode: 0,
        errorMsg: '',
        generated: list.length,
        batch,
        list: list.slice(0, 100), // 前 100 条返回给前端展示；超过的到云控制台导出
        exportHint: list.length > 100 ? '完整清单请到云开发控制台 -> 数据库 -> activations 按 batch 导出 CSV' : ''
      };
    }

    // ================================================================
    // action=redeem  用户兑换激活码（小程序端调用）
    // ================================================================
    if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };

    if (action === 'redeem') {
      let code = (event.code || '').toString().trim().toUpperCase();
      if (!code) return { errorCode: 2101, errorMsg: '请输入激活码' };
      // 容错：用户可能粘贴时带了空格或短横线错位，先规整再查一次原文
      const clean = code.replace(/[\s\-_]/g, '');

      let found = null;
      const r = await db.collection(ACTIVATIONS).where({ code }).limit(1).get();
      if (r && r.data && r.data.length) found = r.data[0];

      if (!found) {
        // 尝试不带分隔符再试一次
        const all = await db.collection(ACTIVATIONS).limit(50).orderBy('createdAt', 'desc').get();
        if (all && all.data) {
          found = all.data.find(x => (x.code || '').replace(/[\s\-_]/g, '') === clean);
        }
      }
      if (!found) return { errorCode: 2102, errorMsg: '激活码不存在，请检查输入或联系客服' };

      if (found.status === 1) {
        return {
          errorCode: 2103,
          errorMsg: '该激活码已使用',
          usedAt: found.usedAt,
          usedBy: (found.usedBy || '').substring(0, 6) + '***'
        };
      }

      const plan = PLAN_TABLE[found.planKey];
      if (!plan) return { errorCode: 2104, errorMsg: '激活码对应套餐已下线，请联系客服' };

      const now = Date.now();
      const { expiresAt, isForever } = calcExpire(found.planKey, now);

      // 先写用户会员，再更新激活码状态（事务化；此处用两步+补偿）
      let userDoc = null;
      try {
        const ur = await db.collection(USERS).where({ _openid: openid }).limit(1).get();
        userDoc = ur && ur.data && ur.data[0];
      } catch (_) {}

      if (!userDoc) {
        // 极端情况：用户表没建，先建
        await db.collection(USERS).add({
          data: {
            nickName: '', avatarUrl: '', phone: '', lang: 'zh',
            createdAt: now, lastActiveAt: now,
            freeTrialStartedAt: now,
            membership: { planKey: null, activatedAt: 0, expiresAt: 0, isForever: false, source: null, orderId: null }
          }
        });
        const ur2 = await db.collection(USERS).where({ _openid: openid }).limit(1).get();
        userDoc = ur2.data[0];
      }

      // 会员叠加策略：
      //   1) 如果现在是空会员 / 已过期：直接按激活码写
      //   2) 如果已是同样 planKey 的期限会员：在现有 expiresAt 基础上续期
      //   3) 如果是永久会员：保持永久，不改（但激活码视为已消耗）
      const cur = userDoc.membership || {};
      let newExpires = expiresAt;
      let newForever = isForever;
      let activatedAt = now;

      if (cur.isForever || newForever) {
        newForever = true;
      } else if (cur.planKey === found.planKey && Number(cur.expiresAt) > now) {
        newExpires = Number(cur.expiresAt) + (expiresAt - now);
        activatedAt = Number(cur.activatedAt) || now;
      }

      const patch = {
        'membership.planKey': newForever ? (cur.planKey && cur.isForever ? cur.planKey : found.planKey) : found.planKey,
        'membership.activatedAt': activatedAt,
        'membership.expiresAt': newExpires,
        'membership.isForever': newForever,
        'membership.source': 'activation_code',
        'membership.orderId': found.code
      };
      await db.collection(USERS).doc(userDoc._id).update({ data: patch });

      // 激活码标记已使用
      await db.collection(ACTIVATIONS).doc(found._id).update({
        data: { status: 1, usedBy: openid, usedAt: now }
      });

      return {
        errorCode: 0,
        errorMsg: '',
        redeemed: true,
        planKey: found.planKey,
        isForever: newForever,
        expiresAt: newExpires,
        activatedAt,
        daysLeft: newForever ? Infinity : Math.max(1, Math.ceil((newExpires - now) / 86400000))
      };
    }

    // ================================================================
    // action=list_batch  管理员查看批次
    // ================================================================
    if (action === 'list_batch') {
      if ((event.adminKey || '') !== EXPECTED_ADMIN_KEY) return { errorCode: 2001, errorMsg: 'adminKey 不正确' };
      const batch = event.batch;
      const where = batch ? { batch } : {};
      const r = await db.collection(ACTIVATIONS).where(where).orderBy('createdAt', 'desc').limit(100).get();
      const total = await db.collection(ACTIVATIONS).where(where).count();
      return {
        errorCode: 0,
        errorMsg: '',
        list: r && r.data || [],
        total: total.total
      };
    }

    return { errorCode: 2000, errorMsg: '未知 action（redeem / generate / list_batch）' };
  } catch (e) {
    console.error('[activateKey] err:', e && e.errMsg || e);
    return { errorCode: e && e.errCode || 500, errorMsg: e && e.errMsg || '服务器错误' };
  }
};
