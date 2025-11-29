// ddNotify.js
const crypto = require('crypto');
const axios = require('axios');

const BASE = 'https://oapi.dingtalk.com/robot/send';

/**
 * 发送钉钉文本消息
 * @param {string} token  access_token
 * @param {string} secret 加签密钥（可选）
 * @param {string} text   要推送的内容
 */
async function sendText(token, secret, text) {
  let url = `${BASE}?access_token=${token}`;
  if (secret) {
    const ts = Date.now();
    const sign = crypto
      .createHmac('sha256', secret)
      .update(`${ts}\n${secret}`)
      .digest('base64');
    url += `&timestamp=${ts}&sign=${encodeURIComponent(sign)}`;
  }

  await axios.post(url, {
    msgtype: 'text',
    text: { content: text }
  });
}

module.exports = { sendText };