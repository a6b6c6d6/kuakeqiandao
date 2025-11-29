// checkin.js
const fs = require('fs');
const axios = require('axios');
const { sendText } = require('./ddNotify');

/* ---------- 工具 ---------- */
// 返回 yyyy/mm/dd hh:mm:ss:ms  精确到毫秒
function nowStr() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${Y}/${M}/${D} ${h}:${m}:${s}:${ms}`;
}

/* ---------- 签到 ---------- */
async function doCheckIn(cookie) {
  try {
    const rsp = await axios.get('https://pan.quark.cn/account/info', {
      headers: { Cookie: cookie },
      timeout: 10000
    });
    // 打印原始返回，方便调试（上线可注释）
    console.log('[原始返回]', JSON.stringify(rsp.data, null, 2));

    if (rsp.data?.data?.nickname) {
      return { ok: true, msg: `签到成功：${rsp.data.data.nickname}` };
    }
    return { ok: false, msg: '接口返回异常（未获取到 nickname）' };
  } catch (e) {
    return { ok: false, msg: `请求失败：${e.message}` };
  }
}

/* ---------- 主流程 ---------- */
(async () => {
 const cfg = {
  cookies: [process.env.QUARK_COOKIE],
  dingtalk: {
    access_token: process.env.DD_ACCESS_TOKEN,
    secret: process.env.DD_SECRET
  }
};
  // 报告头带时间
  let report = `【夸克网盘签到报告】\n时间：${nowStr()}\n`;

  for (const ck of cfg.cookies) {
    const { ok, msg } = await doCheckIn(ck);
    report += `${msg}\n`;
  }

  console.log(report); // 本地也打印

  // 钉钉推送
  if (cfg.dingtalk?.access_token) {
    try {
      await sendText(cfg.dingtalk.access_token, cfg.dingtalk.secret || '', report.trim());
      console.log('钉钉推送完成');
    } catch (e) {
      console.log('钉钉推送失败：', e.message);
    }
  }
})();