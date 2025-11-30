
const axios = require('axios');
const crypto = require('crypto');

/* ---------- 钉钉推送 ---------- */
async function sendText(token, secret, text) {
  const base = 'https://oapi.dingtalk.com/robot/send';
  let url = `${base}?access_token=${token}`;
  if (secret) {
    const ts = Date.now();
    const sign = crypto.createHmac('sha256', secret).update(`${ts}\n${secret}`).digest('base64');
    url += `&timestamp=${ts}&sign=${encodeURIComponent(sign)}`;
  }
  await axios.post(url, { msgtype: 'text', text: { content: text } });
}

/* ---------- 工具 ---------- */
function nowStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function convertBytes(b) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(2)} ${units[i]}`;
}

function parseCookie(cookie) {
  const o = {};
  cookie.split(';').forEach(c => {
    const [k, v] = (c.trim().match(/^([^=]+)=(.*)$/) || []).slice(1);
    if (k) o[k] = v;
  });
  return o;
}

/* ---------- 签到 ---------- */
async function doCheckIn(cookie) {
  const c = parseCookie(cookie);
  let user = c.user;
  const { kps, sign, vcode } = c;
  if (!kps || !sign || !vcode) return { ok: false, msg: 'Cookie 缺少 kps/sign/vcode' };

  try {
    const infoRes = await axios.get('https://drive-m.quark.cn/1/clouddrive/capacity/growth/info', {
      params: { pr: 'ucpro', fr: 'android', kps, sign, vcode },
      timeout: 10000
    });
    const data = infoRes.data.data;
    if (!data) return { ok: false, msg: '获取成长信息失败' };

    if (!user) user = data.nickname || data.uid || kps.slice(0, 8);
    const isVip = data['88VIP'] ? '88VIP' : '普通用户';
    const total = data.total_capacity;
    const signReward = data.cap_composition?.sign_reward || 0;
    const signInfo = data.cap_sign;

    let msg = `【${isVip}】${user}\n💾 总容量：${convertBytes(total)}，签到奖励：${convertBytes(signReward)}\n`;

    if (signInfo.sign_daily) {
      msg += `✅ 已签到：+${convertBytes(signInfo.sign_daily_reward)}，连签(${signInfo.sign_progress}/${signInfo.sign_target})`;
    } else {
      const signRes = await axios.post('https://drive-m.quark.cn/1/clouddrive/capacity/growth/sign', { sign_cyclic: true }, {
        params: { pr: 'ucpro', fr: 'android', kps, sign, vcode },
        timeout: 10000
      });
      const sr = signRes.data;
      if (sr.data) {
        msg += `✅ 签到成功：+${convertBytes(sr.data.sign_daily_reward)}，连签(${signInfo.sign_progress + 1}/${signInfo.sign_target})`;
      } else {
        msg += `❌ 签到失败：${sr.message}`;
      }
    }
    return { ok: true, msg };
  } catch (e) {
    return { ok: false, msg: `${user || '未知用户'}：${e.message}` };
  }
}

/* ---------- 主流程 ---------- */
(async () => {
  const cookies = (process.env.COOKIE_QUARK || '').split(/\n|&&/).filter(Boolean);
  if (!cookies.length) {
    console.log('❌ 未设置 COOKIE_QUARK');
    process.exit(1);
  }
  const report = [`【夸克网盘签到报告】 ${nowStr()}`];
  for (const ck of cookies) report.push((await doCheckIn(ck)).msg);
  const full = report.join('\n\n');
  console.log(full);
  const tok = process.env.DD_ACCESS_TOKEN;
  if (tok) {
    try { await sendText(tok, process.env.DD_SECRET || '', full); }
    catch (e) { console.log('钉钉推送失败', e.message); }
  }
})();
