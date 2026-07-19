/**
 * tts 云函数 —— 中文 TTS 在线合成兜底（腾讯云 TTS）。
 *
 * 调用方：miniprogram/src/platform/tts.ts 的 WxTtsBackend，
 * 预生成映射未命中且按推定路径下载失败时调用。
 *
 * 流程：校验入参 → 调腾讯云 TTS（TextToVoice）→ 上传云存储 → 返回 fileID。
 * 文件命名契约（与构建期脚本 scripts/genZhAudios.mjs 一致）：
 *   cloudPath = audio/zh/<sha1("zh-CN|"+text)>.mp3
 * 同一路径重复合成会直接覆盖，客户端三级缓存保证同一设备不会重复调用。
 *
 * 环境变量（云函数控制台配置，勿写进代码）：
 *   TENCENT_SECRET_ID / TENCENT_SECRET_KEY  腾讯云 API 密钥（必填）
 *   TTS_VOICE                               音色 VoiceType（可选，默认 101016 智甜·女童声）
 *   TTS_SPEED                               语速 -2~2（可选，默认 0）
 */
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/** 单次合成文本长度上限（腾讯云基础合成限制 150 汉字，留余量） */
const MAX_TEXT_LEN = 140;

// ---------------------------------------------------------------------------
// 腾讯云 API 3.0 签名（TC3-HMAC-SHA256）
// ---------------------------------------------------------------------------

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function hmacHex(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/** 调腾讯云 TextToVoice，返回音频 Buffer（mp3） */
function synthesize(text, secretId, secretKey) {
  const service = 'tts';
  const host = 'tts.tencentcloudapi.com';
  const region = 'ap-guangzhou';
  const action = 'TextToVoice';
  const version = '2019-08-23';
  const algorithm = 'TC3-HMAC-SHA256';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const params = {
    Text: Buffer.from(text, 'utf8').toString('base64'), // 腾讯要求 base64 编码文本
    SessionId: crypto.randomUUID(),
    VoiceType: Number(process.env.TTS_VOICE || 101016), // 默认：智甜（女童声）
    Codec: 'mp3',
    SampleRate: 16000,
    ModelType: 1, // 精品音色
  };
  if (process.env.TTS_SPEED !== undefined) {
    params.Speed = Number(process.env.TTS_SPEED);
  }
  const payload = JSON.stringify(params);

  const canonicalRequest = [
    'POST',
    '/',
    '',
    `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}`,
    '',
    'content-type;host;x-tc-action',
    sha256Hex(payload),
  ].join('\n');
  const credentialScope = `${date}/${region}/${service}/tc3_request`;
  const stringToSign = [algorithm, timestamp, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signature = hmacHex(hmac(hmac(hmac(`TC3${secretKey}`, date), region), 'tc3_request'), stringToSign);
  const authorization =
    `${algorithm} Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;

  const options = {
    hostname: host,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': host,
      'Authorization': authorization,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Region': region,
      'X-TC-Timestamp': timestamp,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (body.Response && body.Response.Error) {
            reject(new Error(`${body.Response.Error.Code}: ${body.Response.Error.Message}`));
          } else if (body.Response && body.Response.Audio) {
            resolve(Buffer.from(body.Response.Audio, 'base64'));
          } else {
            reject(new Error('unexpected response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('tencent tts timeout')));
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// 云函数入口
// ---------------------------------------------------------------------------

exports.main = async (event) => {
  const text = (event.text || '').trim().replace(/\s+/g, ' ');
  if (!text || text.length > MAX_TEXT_LEN) {
    return { ok: false, error: 'invalid text' };
  }
  const lang = event.lang || 'zh-CN';
  if (!/^zh/i.test(lang)) {
    return { ok: false, error: 'unsupported lang' };
  }
  const { TENCENT_SECRET_ID, TENCENT_SECRET_KEY } = process.env;
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
    return { ok: false, error: 'credentials not configured' };
  }

  const cloudPath = `audio/zh/${crypto.createHash('sha1').update(`zh-CN|${text}`, 'utf8').digest('hex')}.mp3`;
  try {
    const audio = await synthesize(text, TENCENT_SECRET_ID, TENCENT_SECRET_KEY);
    const res = await cloud.uploadFile({ cloudPath, fileContent: audio });
    return { ok: true, fileID: res.fileID };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
};
