// cloudfunctions/checkVipStatus/index.js
// 会员鉴权核心云函数：
//   - 对新用户初始化免费试用（首次调用时写入users.freeTrialStartedAt）
//   - 计算免费剩余时长（分钟）
//   - 计算会员到期时间、是否在会员期内（含永久会员）
// 所有页面在进入"训练/上传/朗读"等核心功能前，都必须调用本云函数做拦截。
//
// users 集合中新增会员相关字段（由云函数负责写入，前端"保存资料"类接口不得写以下字段）：
//   freeTrialStartedAt: Number (ms, 首次进入的时间戳，用于免费试用计算)
//   membership: {
//     planKey: 'pro_2year' | 'pro_forever' | null
//     activatedAt: Number (ms, 开通时间)
//     expiresAt: Number (ms, 到期时间；永久会员此字段不做判断)
//     isForever: Boolean (是否永久有效；仅 pro_forever 设为 true)
//     source: 'activation_code' | 'wx_pay' | 'manual_gift'  (开通渠道)
//     orderId: String | null   (对应订单号或激活码)
//   }

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const USERS_COLLECTION = 'users';
// 免费试用：60分钟（由配置控制，若 config.js 传了则覆盖）
const DEFAULT_FREE_MINUTES = 60;

const PLAN_TABLE = {
  pro_2year:   { durationType: 'years',   durationValue: 2, isForever: false },
  pro_forever: { durationType: 'forever', durationValue: 0, isForever: true  }
};

async function ensureUser(openid) {
  let existing = null;
  try {
    const r = await db.collection(USERS_COLLECTION).where({ _openid: openid }).get();
    if (r && r.data && r.data.length) existing = r.data[0];
  } catch (e) { /* ignore */ }

  if (existing) return existing;

  const now = Date.now();
  try {
    await db.collection(USERS_COLLECTION).add({
      data: {
        nickName: '',
        avatarUrl: '',
        phone: '',
        lang: 'zh',
        createdAt: now,
        lastActiveAt: now,
        freeTrialStartedAt: now,       // 首次创建时就开免费计时
        membership: { planKey: null, activatedAt: 0, expiresAt: 0, isForever: false, source: null, orderId: null }
      }
    });
    const r2 = await db.collection(USERS_COLLECTION).where({ _openid: openid }).get();
    return r2.data[0];
  } catch (e) {
    // -501001 集合不存在
    if (e.errCode === -501001) {
      try { await db.createCollection(USERS_COLLECTION); } catch (_) {}
      return ensureUser(openid);
    }
    throw e;
  }
}

function calcExpire(planKey, fromNow) {
  const def = PLAN_TABLE[planKey];
  if (!def) return { expiresAt: 0, isForever: false };
  if (def.isForever) return { expiresAt: 0, isForever: true };

  const base = fromNow || Date.now();
  const d = new Date(base);
  if (def.durationType === 'years') {
    d.setFullYear(d.getFullYear() + Number(def.durationValue || 0));
  } else if (def.durationType === 'months') {
    d.setMonth(d.getMonth() + Number(def.durationValue || 0));
  } else if (def.durationType === 'days') {
    d.setDate(d.getDate() + Number(def.durationValue || 0));
  }
  return { expiresAt: d.getTime(), isForever: false };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };

  const freeMinutes = Number(event.freeMinutes) || DEFAULT_FREE_MINUTES;
  const action = event.action || 'check';

  try {
    const user = await ensureUser(openid);
    const now = Date.now();

    // ===== action=consume_trial  显式触发免费计时开始（可选，一般 createUser 时已开始） =====
    if (action === 'consume_trial') {
      if (!user.freeTrialStartedAt) {
        await db.collection(USERS_COLLECTION).doc(user._id).update({
          data: { freeTrialStartedAt: now, lastActiveAt: now }
        });
      }
    }

    // ===== action=grant_vip  管理端调用：手动赠送会员（需传 adminKey 防滥用） =====
    if (action === 'grant_vip') {
      const adminKey = event.adminKey || '';
      // ⚠️ 建议在云环境变量里配置 VIP_ADMIN_KEY，这里先用硬编码做占位
      const EXPECTED_ADMIN_KEY = (process.env.VIP_ADMIN_KEY) || 'LINGUA_ADMIN_CHANGE_ME_PLEASE';
      if (adminKey !== EXPECTED_ADMIN_KEY) {
        return { errorCode: 2005, errorMsg: 'adminKey 不正确（请到云函数环境变量 VIP_ADMIN_KEY 配置）' };
      }
      const planKey = event.planKey;
      if (!PLAN_TABLE[planKey]) return { errorCode: 2003, errorMsg: '未知套餐' };
      const { expiresAt, isForever } = calcExpire(planKey, now);
      const patch = {
        'membership.planKey': planKey,
        'membership.activatedAt': now,
        'membership.expiresAt': expiresAt,
        'membership.isForever': isForever,
        'membership.source': event.source || 'manual_gift',
        'membership.orderId': event.orderId || ('admin_' + now)
      };
      await db.collection(USERS_COLLECTION).doc(user._id).update({ data: patch });
      return { errorCode: 0, errorMsg: '', granted: true };
    }

    // ===== 默认 action=check：计算当前会员/免费状态 =====
    const trialStart = user.freeTrialStartedAt || now;
    const freeEndAt = trialStart + freeMinutes * 60 * 1000;
    const freeRemainingMs = Math.max(0, freeEndAt - now);
    const freeRemainingMinutes = Math.floor(freeRemainingMs / 60000);
    const freeRemainingSeconds = Math.floor((freeRemainingMs % 60000) / 1000);
    const inFreeTrial = freeRemainingMs > 0;

    const m = user.membership || {};
    let inVip = false;
    let vipPlanKey = null;
    let vipExpiresAt = 0;
    let vipDaysLeft = 0;
    let isForeverVip = false;

    if (m && m.planKey) {
      vipPlanKey = m.planKey;
      isForeverVip = !!m.isForever;
      vipExpiresAt = Number(m.expiresAt) || 0;
      if (isForeverVip) {
        inVip = true;
        vipDaysLeft = Infinity;
      } else if (vipExpiresAt > now) {
        inVip = true;
        vipDaysLeft = Math.max(1, Math.ceil((vipExpiresAt - now) / (24 * 3600 * 1000)));
      } else {
        // 会员已过期，清空状态（避免后续误判）
        try {
          await db.collection(USERS_COLLECTION).doc(user._id).update({
            data: {
              'membership.planKey': null,
              'membership.isForever': false
            }
          });
        } catch (_) {}
        inVip = false;
      }
    }

    // 能否使用核心功能：在试用期内 OR 会员有效
    const canUseCore = inFreeTrial || inVip;

    // 刷新最近活跃（异步不阻塞）
    try {
      db.collection(USERS_COLLECTION).doc(user._id).update({ data: { lastActiveAt: now } }).catch(() => {});
    } catch (_) {}

    return {
      errorCode: 0,
      errorMsg: '',
      canUseCore,
      // 免费试用
      freeTrial: {
        active: inFreeTrial,
        totalMinutes: freeMinutes,
        startedAt: trialStart,
        endsAt: freeEndAt,
        remainingMinutes: freeRemainingMinutes,
        remainingSeconds: freeRemainingSeconds,
        remainingMs: freeRemainingMs
      },
      // 会员
      vip: {
        active: inVip,
        planKey: vipPlanKey,
        activatedAt: Number(m.activatedAt) || 0,
        expiresAt: vipExpiresAt,
        daysLeft: vipDaysLeft,
        isForever: isForeverVip,
        source: m.source || null,
        orderId: m.orderId || null
      },
      serverTime: now,
      // 辅助：给前端提示文案的标记
      _ui: {
        needUpgrade: !canUseCore,                         // true 时必须弹升级
        freeAlmostGone: inFreeTrial && freeRemainingMinutes <= 10 && freeRemainingMinutes > 0, // 免费即将结束小提示
        expiredVip: !!m.planKey && !inVip                  // 之前开过但过期了
      }
    };
  } catch (e) {
    console.error('[checkVipStatus] err:', e && e.errMsg || e);
    return {
      errorCode: e && e.errCode || 500,
      errorMsg: e && e.errMsg || '服务器错误',
      // 兜底：给 10 分钟宽限期，避免云函数挂了用户完全不能用
      canUseCore: true,
      _fallback: true
    };
  }
};

// 导出 calcExpire 给 activateKey / createOrder 复用（同进程内 require 时可用）
module.exports = exports;
exports._internal = { calcExpire, PLAN_TABLE };
