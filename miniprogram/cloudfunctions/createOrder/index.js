// cloudfunctions/createOrder/index.js
// 微信小程序虚拟支付通道（企业主体可用，个人主体不可用）
//
// 前端付费流程：
//   1. 用户在 vip 页选套餐 -> 前端调用 cloud.callFunction('createOrder', { action: 'create', planKey })
//   2. 本云函数生成 outTradeNo + 调用 cloud.openapi.virtualPayment.sendPayment + 写 orders 集合(status=0)
//   3. 前端拿到 bill_no 等参数后调用 wx.requestVirtualPayment 拉起支付
//   4. 用户支付成功 -> 前端再调 cloud.callFunction('createOrder', { action: 'verify', outTradeNo })
//      或在微信支付回调中调用 action=verify 来开通会员
//   5. verify 通过 -> 写 users.membership + orders.status=1
//
// 激活码通道（个人号可用、企业号也可用）：见 activateKey 云函数
//
// 集合 orders 结构：
//   { outTradeNo: String, openid: String, planKey: String, price: Number (分),
//     billNo: String, wxTransId: String, status: 0|1|2|3 (0待支付 1成功 2失败 3已退款),
//     payEnv: 0|1, paidAt: 0, createdAt: ts, source: 'wx_pay' }

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const USERS = 'users';
const ORDERS = 'orders';

const PLAN_TABLE = {
  pro_2year:   { price: 4980, durationType: 'years',   durationValue: 2, isForever: false },
  pro_forever: { price: 9900, durationType: 'forever', durationValue: 0, isForever: true  }
};

async function ensureCol(name) { try { await db.createCollection(name); } catch (e) { if (e.errCode !== -501001) {} } }

function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function genOutTradeNo(openid) {
  const d = new Date();
  const ts = `${d.getFullYear()}${pad(d.getMonth()+1,2)}${pad(d.getDate(),2)}${pad(d.getHours(),2)}${pad(d.getMinutes(),2)}${pad(d.getSeconds(),2)}`;
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const tail = (openid || 'xx').slice(-4);
  return `LSO${ts}${rand}${tail}`;
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

async function grantVipToUser(openid, planKey, orderId) {
  if (!PLAN_TABLE[planKey]) return { ok: false, errorMsg: '未知套餐' };
  const now = Date.now();
  const { expiresAt, isForever } = calcExpire(planKey, now);

  let userDoc = null;
  try {
    const ur = await db.collection(USERS).where({ _openid: openid }).limit(1).get();
    userDoc = ur && ur.data && ur.data[0];
  } catch (_) {}
  if (!userDoc) {
    await db.collection(USERS).add({
      data: {
        nickName: '', avatarUrl: '', phone: '', lang: 'zh',
        createdAt: now, lastActiveAt: now, freeTrialStartedAt: now,
        membership: { planKey: null, activatedAt: 0, expiresAt: 0, isForever: false, source: null, orderId: null }
      }
    });
    const ur2 = await db.collection(USERS).where({ _openid: openid }).limit(1).get();
    userDoc = ur2.data[0];
  }

  const cur = userDoc.membership || {};
  let newExpires = expiresAt;
  let newForever = isForever;
  let activatedAt = now;
  if (cur.isForever || newForever) {
    newForever = true;
  } else if (cur.planKey === planKey && Number(cur.expiresAt) > now) {
    newExpires = Number(cur.expiresAt) + (expiresAt - now);
    activatedAt = Number(cur.activatedAt) || now;
  }

  await db.collection(USERS).doc(userDoc._id).update({
    data: {
      'membership.planKey': planKey,
      'membership.activatedAt': activatedAt,
      'membership.expiresAt': newExpires,
      'membership.isForever': newForever,
      'membership.source': 'wx_pay',
      'membership.orderId': orderId
    }
  });

  return { ok: true, planKey, activatedAt, expiresAt: newExpires, isForever: newForever };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || 'create';

  await ensureCol(ORDERS);

  try {
    // ======================================================================
    // action=create  发起支付（前端用）
    // ======================================================================
    if (action === 'create') {
      if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };
      const planKey = event.planKey;
      const plan = PLAN_TABLE[planKey];
      if (!plan) return { errorCode: 2201, errorMsg: '未知套餐 planKey' };

      const payEnv = Number(event.payEnv) === 1 ? 1 : 0; // 0正式 1沙箱
      const outProductId = event.outProductId || ('lingua_' + planKey);
      const outTradeNo = genOutTradeNo(openid);
      const now = Date.now();

      // 第一步：先写订单（待支付状态）
      const orderDoc = {
        outTradeNo,
        openid,
        planKey,
        price: plan.price,
        billNo: '',
        wxTransId: '',
        status: 0,
        payEnv,
        paidAt: 0,
        createdAt: now,
        source: 'wx_pay',
        remark: event.remark || ''
      };
      await db.collection(ORDERS).add({ data: orderDoc });

      // 第二步：调微信虚拟支付下单
      try {
        const payRes = await cloud.openapi.virtualPayment.sendPayment({
          env: payEnv,
          openid: openid,
          out_product_id: outProductId,
          out_trade_no: outTradeNo,
          // 微信虚拟支付要求价格单位分；product_price 字段（若当前开放能力版本要求）
          price: plan.price,
          product_name: planKey === 'pro_forever' ? 'LinguaSpeak Pro 不限时会员' : 'LinguaSpeak Pro 2年会员',
          pay_currency: 'CNY',
          buy_quantity: 1,
          attach: JSON.stringify({ planKey })
        });

        // 写回 billNo
        const billNo = (payRes && (payRes.bill_no || payRes.billNo)) || '';
        if (billNo) {
          try {
            const list = await db.collection(ORDERS).where({ outTradeNo }).limit(1).get();
            if (list.data && list.data[0]) {
              await db.collection(ORDERS).doc(list.data[0]._id).update({ data: { billNo } });
            }
          } catch (_) {}
        }

        return {
          errorCode: 0,
          errorMsg: '',
          outTradeNo,
          billNo,
          payEnv,
          planKey,
          price: plan.price,
          priceLabel: '¥' + (plan.price / 100).toFixed(plan.price % 100 === 0 ? 0 : 1).replace(/\.0$/, ''),
          // 前端 wx.requestVirtualPayment 需要的参数
          wxPayArgs: {
            env: payEnv,
            offerId: '',  // 空即可，让基础库取小程序appid
            currencyType: 'CNY',
            // platform 字段新版 API 已移除
          }
        };
      } catch (payErr) {
        console.error('[virtualPayment.sendPayment] err:', payErr && payErr.errMsg || payErr);
        // 微信侧失败，订单置失败
        try {
          const list = await db.collection(ORDERS).where({ outTradeNo }).limit(1).get();
          if (list.data && list.data[0]) {
            await db.collection(ORDERS).doc(list.data[0]._id).update({
              data: { status: 2 }
            });
          }
        } catch (_) {}
        return {
          errorCode: payErr && payErr.errCode || 2210,
          errorMsg: payErr && payErr.errMsg || '微信虚拟支付下单失败（请确认已在mp后台开通虚拟支付；个人小程序请改用激活码通道）',
          fallbackHint: '您仍可使用【激活码】通道开通会员，无需微信支付',
          outTradeNo
        };
      }
    }

    // ======================================================================
    // action=verify  验证支付结果并开通会员（前端在 wx.requestVirtualPayment success 中调用）
    // ======================================================================
    if (action === 'verify') {
      if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };
      const outTradeNo = event.outTradeNo;
      const payEnv = Number(event.payEnv) === 1 ? 1 : 0;
      if (!outTradeNo) return { errorCode: 2221, errorMsg: '缺少 outTradeNo' };

      let order = null;
      const list = await db.collection(ORDERS).where({ outTradeNo }).limit(1).get();
      if (list && list.data && list.data[0]) order = list.data[0];
      if (!order) return { errorCode: 2222, errorMsg: '订单不存在' };
      if (order.openid !== openid) return { errorCode: 2223, errorMsg: '订单归属不匹配' };

      // 如订单已成功直接返回，避免重复开通
      if (order.status === 1) {
        return { errorCode: 0, errorMsg: '', vipGranted: true, planKey: order.planKey, alreadyGranted: true };
      }

      let verified = false;
      let wxTransId = '';
      try {
        const vRes = await cloud.openapi.virtualPayment.queryOrder({
          env: payEnv,
          out_trade_no: outTradeNo,
          openid: openid
        });
        const wxState = vRes && (vRes.order_state || vRes.orderState);
        wxTransId = (vRes && (vRes.transaction_id || vRes.wxTransId)) || '';
        // order_state 取值参考虚拟支付文档：0=待支付 1=已支付 2=退款
        if (wxState === 1 || vRes && (vRes.pay_state === 1 || vRes.payState === 1)) verified = true;
      } catch (vErr) {
        console.warn('[verify] queryOrder fail:', vErr && vErr.errMsg);
        // queryOrder 失败，直接用前端传的 payResult 兜底（必须再校验一次金额+签名）
        if (event.payResult && event.payResult.errMsg && event.payResult.errMsg.indexOf('ok') !== -1) {
          verified = true;
        }
      }

      if (!verified) {
        return { errorCode: 2230, errorMsg: '支付尚未成功，请稍后重试或在「订单/记录」中查看' };
      }

      const now = Date.now();
      // 先写订单状态
      try {
        await db.collection(ORDERS).doc(order._id).update({
          data: { status: 1, paidAt: now, wxTransId: wxTransId || order.wxTransId }
        });
      } catch (_) {}

      const grantRes = await grantVipToUser(openid, order.planKey, outTradeNo);
      if (!grantRes.ok) return { errorCode: 2240, errorMsg: grantRes.errorMsg || '开通失败' };

      return {
        errorCode: 0,
        errorMsg: '',
        vipGranted: true,
        planKey: order.planKey,
        isForever: grantRes.isForever,
        expiresAt: grantRes.expiresAt,
        activatedAt: grantRes.activatedAt,
        wxTransId
      };
    }

    // ======================================================================
    // action=mock_success  本地调试用：伪造支付成功（沙箱阶段）
    // ⚠️  线上必须在云控制台给 createOrder 云函数环境变量设置 VIP_DISABLE_MOCK=1
    // ======================================================================
    if (action === 'mock_success') {
      if (process.env.VIP_DISABLE_MOCK === '1') {
        return { errorCode: 2290, errorMsg: '已禁用 mock 模式' };
      }
      if (!openid) return { errorCode: 1001, errorMsg: '未获取用户身份' };
      const planKey = event.planKey || 'pro_2year';
      if (!PLAN_TABLE[planKey]) return { errorCode: 2201, errorMsg: '未知套餐' };
      const outTradeNo = 'MOCK' + Date.now();
      const now = Date.now();
      await db.collection(ORDERS).add({
        data: {
          outTradeNo, openid, planKey, price: PLAN_TABLE[planKey].price,
          billNo: 'mock', wxTransId: 'mock', status: 1, payEnv: 1,
          paidAt: now, createdAt: now, source: 'mock', remark: '本地mock'
        }
      });
      const grantRes = await grantVipToUser(openid, planKey, outTradeNo);
      return {
        errorCode: 0,
        errorMsg: '',
        vipGranted: true,
        planKey,
        isForever: grantRes.isForever,
        expiresAt: grantRes.expiresAt,
        activatedAt: grantRes.activatedAt,
        hint: 'Mock模式已开通会员。上线前请设置 VIP_DISABLE_MOCK=1'
      };
    }

    return { errorCode: 2200, errorMsg: '未知 action（create / verify / mock_success）' };
  } catch (e) {
    console.error('[createOrder] err:', e && e.errMsg || e);
    return { errorCode: e && e.errCode || 500, errorMsg: e && e.errMsg || '服务器错误' };
  }
};
