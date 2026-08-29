// miniprogram/test_soe_local.js
// ============================================================
// 腾讯云 SOE 本地连通性测试脚本（独立运行，不依赖微信云开发）
//
// 使用方法：
//   1) 把下方 SOE_SECRET_ID / SOE_SECRET_KEY 换成你自己的真实密钥
//      （从 https://console.cloud.tencent.com/cam/capi 获取）
//   2) 开通"智聆口语评测"服务：https://console.cloud.tencent.com/soe （有免费额度）
//   3) 在本项目目录执行：
//        cd /workspace/miniprogram
//        node test_soe_local.js
//   4) 预期输出：
//        - 如果签名 + 密钥 + 服务开通都正确：
//            ✅ SOE 真实 API 调用成功
//            PronAccuracy / PronFluency / PronCompletion / SuggestedScore 有数值
//            accuracy / fluency / pronunciation 三维分数
//        - 如果鉴权失败：
//            ❌ SOE 返回错误：AuthFailure.SignatureExpire / InvalidSecretId 等
//            → 对照底部 FAQ 解决
//
//   5) 本地验证通过后，再把同样 3 个值填入云函数环境变量即可
// ============================================================

const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');

// ================== 【必填】填入你的腾讯云密钥 ==================
const SOE_SECRET_ID   = process.env.SOE_SECRET_ID   || 'AKIDxxxxxxxxxxxxxxxxxxxxxxx';  // 改这里，或传环境变量
const SOE_SECRET_KEY  = process.env.SOE_SECRET_KEY  || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // 改这里，或传环境变量
// SOE 基础版（2018-07-24）不需要配置 Region，签名 X-TC-Region 留空
// ============================================================

function sha256Hex(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function hmacSha256(key, s, enc) {
  return crypto.createHmac('sha256', key).update(s, 'utf8').digest(enc || '');
}

// ============ 构造一段合法测试音频（16k / 单声道 / 16bit / wav / 0.5s 静音） ============
// 真实评分会很低（静音）但 SOE 引擎不会报错，足以验证鉴权 + 参数链路
function buildTestWav() {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const durationSec = 0.5;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataBytes = numSamples * channels * (bitsPerSample / 8); // 16000
  const buffer = Buffer.alloc(44 + dataBytes);
  let o = 0;
  buffer.write('RIFF', o); o += 4;
  buffer.writeUInt32LE(36 + dataBytes, o); o += 4;
  buffer.write('WAVE', o); o += 4;
  buffer.write('fmt ', o); o += 4;
  buffer.writeUInt32LE(16, o); o += 4;
  buffer.writeUInt16LE(1, o); o += 2;            // PCM
  buffer.writeUInt16LE(channels, o); o += 2;     // mono
  buffer.writeUInt32LE(sampleRate, o); o += 4;
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), o); o += 4;
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), o); o += 2;
  buffer.writeUInt16LE(bitsPerSample, o); o += 2;
  buffer.write('data', o); o += 4;
  buffer.writeUInt32LE(dataBytes, o); o += 4;
  // 填充静音
  buffer.fill(0x00, 44, 44 + dataBytes);
  return buffer;
}

// ============ TC3-HMAC-SHA256 签名（与 evaluateSpeech 云函数完全一致） ============
function tc3Sign(secretId, secretKey, service, action, version, payload) {
  const now = Math.floor(Date.now() / 1000);
  const date = new Date(now * 1000).toISOString().slice(0, 10);
  const host = `${service}.tencentcloudapi.com`;
  const contentType = 'application/json; charset=utf-8';
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = sha256Hex(payload);
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = sha256Hex(canonicalRequest);
  const stringToSign = `${algorithm}\n${now}\n${credentialScope}\n${hashedCanonicalRequest}`;
  const secretDate = hmacSha256(Buffer.from('TC3' + secretKey, 'utf8'), date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign, 'hex');
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    host, authorization,
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'X-TC-Action': action,
      'X-TC-Timestamp': String(now),
      'X-TC-Version': version,
      'X-TC-Region': '',
      'Authorization': authorization
    }
  };
}

function rawHttpsJson(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST', hostname, port: 443, path, headers, timeout: 20000
    }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'];
        let raw;
        try {
          if (encoding === 'gzip') raw = zlib.gunzipSync(buf).toString('utf8');
          else if (encoding === 'deflate') raw = zlib.inflateSync(buf).toString('utf8');
          else raw = buf.toString('utf8');
        } catch (e) { raw = buf.toString('utf8'); }
        try { resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(raw), raw }); }
        catch (e) { resolve({ statusCode: res.statusCode, headers: res.headers, raw }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // 1) 参数校验
  if (!SOE_SECRET_ID || SOE_SECRET_ID.includes('xxxxxxx') ||
      !SOE_SECRET_KEY || SOE_SECRET_KEY.includes('xxxxxxx')) {
    console.error('❌ 请先在脚本顶部填入真实的 SOE_SECRET_ID / SOE_SECRET_KEY');
    console.error('   获取地址：https://console.cloud.tencent.com/cam/capi');
    process.exit(1);
  }

  // 2) 构造测试请求（英语句子 + 测试 WAV）
  const targetText = 'I want to talk about the importance of environmental protection.';
  const wavBuf = buildTestWav();
  const sessionId = 'test-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
  const body = JSON.stringify({
    SeqId: 1,
    IsEnd: 1,
    VoiceFileType: 2,        // 2=wav
    VoiceEncodeType: 1,      // 1=PCM
    UserVoiceData: wavBuf.toString('base64'),
    SessionId: sessionId,
    RefText: targetText,
    ServerType: 1,           // 1=英文, 0=中文
    WorkMode: 1,             // 1=非流式
    EvalMode: 1,             // 1=句子
    ScoreCoeff: 1.0          // 标准苛刻
  });
  const signed = tc3Sign(SOE_SECRET_ID, SOE_SECRET_KEY, 'soe',
    'TransmitOralProcessWithInit', '2018-07-24', body);

  console.log('🧪 开始调用腾讯云 SOE：TransmitOralProcessWithInit (2018-07-24)');
  console.log('   Host :', signed.host);
  console.log('   RefText:', targetText);
  console.log('   SessionId:', sessionId);

  // 3) 发请求
  let resp;
  try {
    resp = await rawHttpsJson(signed.host, '/', signed.headers, body);
  } catch (e) {
    console.error('❌ 网络错误：', e.message);
    process.exit(2);
  }

  // 4) 解析结果
  const d = resp && resp.data;
  if (!d || !d.Response) {
    console.error('❌ 非 JSON 响应或响应结构异常：HTTP', resp.statusCode);
    console.error('   Raw:', (resp.raw || '').slice(0, 1000));
    process.exit(3);
  }

  const r = d.Response;
  if (r.Error) {
    console.error('\n❌ SOE 返回错误：');
    console.error('   Code    :', r.Error.Code);
    console.error('   Message :', r.Error.Message);
    console.error('   RequestId:', r.RequestId || '');
    console.error('\n—— 常见错误排查 ——');
    if (String(r.Error.Code).includes('Signature') || String(r.Error.Code).includes('AuthFailure')) {
      console.error('  → 鉴权签名问题：');
      console.error('    ① 核对 SOE_SECRET_ID / SOE_SECRET_KEY 是否完全复制（没有前后空格）');
      console.error('    ② 本地系统时间是否准确？TC3 签名要求本机 UTC 时间误差 ≤ 5 分钟');
      console.error('    ③ SecretId/SecretKey 对是否已启用，且未被禁用/删除');
    } else if (String(r.Error.Code).includes('UnauthorizedOperation') || String(r.Error.Message).includes('开通')) {
      console.error('  → 服务未开通：前往 https://console.cloud.tencent.com/soe 开通"智聆口语评测"');
    } else if (String(r.Error.Code).includes('InvalidParameter') || String(r.Error.Code).includes('Missing')) {
      console.error('  → 参数错误：检查 RefText / ServerType / VoiceEncodeType 是否与脚本一致');
    } else if (String(r.Error.Code).includes('LimitExceeded') || String(r.Error.Code).includes('RequestLimitExceeded')) {
      console.error('  → 超出免费额度：前往 https://console.cloud.tencent.com/soe 购买资源包或升级');
    }
    process.exit(4);
  }

  // 5) 成功 → 展示分数
  const acc0 = Number(r.PronAccuracy);
  const flu0 = Number(r.PronFluency);
  const cmpl0 = Number(r.PronCompletion);
  const sug = Number(r.SuggestedScore);
  console.log('\n✅ SOE 真实 API 调用成功 ！');
  console.log('   RequestId        :', r.RequestId || '');
  console.log('   SessionId        :', sessionId);
  console.log('   PronAccuracy (准) :', isNaN(acc0) ? 'N/A' : acc0);
  console.log('   PronFluency  (流) :', isNaN(flu0) ? 'N/A' : flu0);
  console.log('   PronCompletion(完):', isNaN(cmpl0) ? 'N/A' : cmpl0);
  console.log('   SuggestedScore   :', isNaN(sug) ? 'N/A' : sug);
  console.log('   Words 数量       :', Array.isArray(r.Words) ? r.Words.length : 0);

  // 合成三维（与云函数内算法一致）
  const accuracy  = Math.max(0, Math.min(100, Math.round(isNaN(acc0) ? (isNaN(sug) ? 65 : sug) : acc0)));
  const fluency   = Math.max(0, Math.min(100, Math.round(isNaN(flu0) ? (isNaN(sug) ? 63 : sug - 2) : flu0)));
  const pronunciation = Math.max(0, Math.min(100, Math.round(
    !isNaN(cmpl0) ? (cmpl0 * 0.4 + accuracy * 0.35 + fluency * 0.25)
                  : (accuracy * 0.7 + fluency * 0.3)
  )));
  const avg = Math.round(0.45 * pronunciation + 0.30 * fluency + 0.25 * accuracy);

  console.log('\n   —— 雅思加权三维（evaluateSpeech 返回的就是这个）——');
  console.log('   accuracy       :', accuracy);
  console.log('   fluency        :', fluency);
  console.log('   pronunciation  :', pronunciation);
  console.log('   weighted avg   :', avg, '  对应雅思 Band：' +
    (avg >= 96 ? '8.5+' : avg >= 88 ? '7.5-8.0' : avg >= 75 ? '6.5-7.0' : avg >= 60 ? '5.5-6.0' : '4.5-5.0')
  );
  console.log('\n   💡 说明：本次用的是 0.5s 静音 WAV 做连通性测试，所以分数偏低是正常的。');
  console.log('          你在小程序里真实录音时会拿到与朗读水平匹配的分数。');

  console.log('\n✅ 下一步：把以下 3 个环境变量填入云函数 evaluateSpeech 即可：');
  console.log('     SOE_SECRET_ID  =', SOE_SECRET_ID);
  console.log('     SOE_SECRET_KEY =', SOE_SECRET_KEY.slice(0, 4) + '********' + SOE_SECRET_KEY.slice(-4));
  console.log('     SOE_REGION     = ap-beijing（或你选择的地域，本接口实际不使用，仅作标识）');
}

main().catch(e => { console.error('Uncaught:', e); process.exit(99); });
