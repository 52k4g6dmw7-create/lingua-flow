// cloudfunctions/login/index.js
// 微信小程序真实登录：通过云函数获取用户 openid（无需前端传 code，云函数天然能拿到）
// 这是实现"真实微信身份"的核心，返回的 openid 是微信用户的唯一标识，
// 可用于后续所有鉴权、数据归属、跨端同步等场景。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const appid = wxContext.APPID;
  const unionid = wxContext.UNIONID || '';

  if (!openid) {
    return {
      errorCode: 1001,
      errorMsg: '无法获取用户身份，请在微信客户端打开',
      openid: '',
      appid,
      unionid
    };
  }

  return {
    errorCode: 0,
    errorMsg: '',
    openid,
    appid,
    unionid,
    timestamp: Date.now()
  };
};
