// cloudfunctions/getPhone/index.js
// 解密手机号：需要小程序认证为企业/个体工商户类型，个人主体无法使用此接口
// 前端：<button open-type="getPhoneNumber" bindgetphonenumber="onGetPhone">
// 然后把 e.detail.code 传进来即可
// 成功后同步把手机号写到 users 表中

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const USERS_COLLECTION = 'users';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return { errorCode: 1001, errorMsg: '未获取到用户身份' };
  }

  const code = event.code;
  if (!code) {
    return { errorCode: 1002, errorMsg: '缺少 code 参数' };
  }

  try {
    // 微信开放能力：用 code 换手机号
    const res = await cloud.openapi.phonenumber.getPhoneNumber({ code });

    if (!res || !res.phoneInfo || !res.phoneInfo.phoneNumber) {
      return {
        errorCode: 1004,
        errorMsg: '解析手机号失败，请重试或检查小程序主体（需企业/个体认证）'
      };
    }

    const phone = res.phoneInfo.phoneNumber;
    const purePhone = res.phoneInfo.purePhoneNumber || phone;
    const countryCode = res.phoneInfo.countryCode || '86';

    // 写入 users 表
    try {
      const existing = await db.collection(USERS_COLLECTION).where({ _openid: openid }).get();
      if (existing.data && existing.data.length > 0) {
        await db.collection(USERS_COLLECTION).doc(existing.data[0]._id).update({
          data: { phone }
        });
      }
    } catch (dbErr) {
      console.warn('[getPhone] 写 users 失败:', dbErr && dbErr.errMsg);
    }

    return {
      errorCode: 0,
      errorMsg: '',
      phone,
      purePhone,
      countryCode
    };
  } catch (e) {
    console.error('[getPhone] 失败:', e && e.errMsg || e);
    return {
      errorCode: e && e.errCode || 500,
      errorMsg: e && e.errMsg || '解析手机号失败（个人小程序不支持此能力，可在 config.js 关闭 ENABLE_PHONE_AUTH）'
    };
  }
};
