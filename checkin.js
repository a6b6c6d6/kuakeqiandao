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

  // 提前确定账号标识，防止 catch 时不知道是哪个账号
  const accountId = user || (kps ? kps.slice(0, 8) : '未知账号');

  if (!kps || !sign || !vcode) {
    const missing = [];
    if (!kps) missing.push('kps');
    if (!sign) missing.push('sign');
    if (!vcode) missing.push('vcode');
    return { ok: false, msg: `【${accountId}】Cookie 缺少参数：${missing.join(', ')}` };
  }

  try {
    // 1. 第一次获取：检查今日是否已签到
    const infoRes1 = await axios.get('https://drive-m.quark.cn/1/clouddrive/capacity/growth/info', {
      params: { pr: 'ucpro', fr: 'android', kps, sign, vcode },
      timeout: 10000
    });
    const base = infoRes1.data.data;
    if (!base) {
      const errMsg = infoRes1.data?.message || '接口返回异常（可能 token 过期或网络问题）';
      return { ok: false, msg: `【${accountId}】获取成长信息失败：${errMsg}` };
    }

    if (!user) user = base.nickname || base.uid || kps.slice(0, 8);
    const isVip = base['88VIP'] ? '88VIP' : '普通用户';

    // 2. 执行签到（如果今天还没签）
    if (!base.cap_sign.sign_daily) {
      const signRes = await axios.post('https://drive-m.quark.cn/1/clouddrive/capacity/growth/sign',
        { sign_cyclic: true },
        { params: { pr: 'ucpro', fr: 'android', kps, sign, vcode }, timeout: 10000 }
      );
      const sr = signRes.data;
      if (!sr.data) {
        return { ok: false, msg: `【${isVip}】${user}\n❌ 签到失败：${sr.message}（code: ${sr.code || sr.status || '未知'}）` };
      }
    }

    // 3. 第二次获取：刷新签到后的最新数据
    const infoRes2 = await axios.get('https://drive-m.quark.cn/1/clouddrive/capacity/growth/info', {
      params: { pr: 'ucpro', fr: 'android', kps, sign, vcode },
      timeout: 10000
    });
    const latest = infoRes2.data.data;
    if (!latest) {
      const errMsg = infoRes2.data?.message || '接口返回异常';
      return { ok: false, msg: `【${user}】刷新成长信息失败：${errMsg}` };
    }

    // 4. 拼装最终文案（使用最新数据）
    const total = latest.total_capacity;
    const signReward = latest.cap_composition?.sign_reward || 0;
    const signInfo = latest.cap_sign;
    const dailyReward = signInfo.sign_daily_reward || 0;

    const msg = 
      `【${isVip}】${user}\n` +
      `💾 总容量：${convertBytes(total)}，历史签到：${convertBytes(signReward)}\n` +
      `✅ ${signInfo.sign_daily ? '已签到' : '签到异常'}：+${convertBytes(dailyReward)}，连签(${signInfo.sign_progress}/${signInfo.sign_target})`;

    return { ok: true, msg };
  } catch (e) {
    // 尽可能提取 API 响应中的错误信息
    const detail = e.response?.data?.message || e.message;
    const status = e.response?.status ? `HTTP ${e.response.status}` : '网络错误';
    return { ok: false, msg: `【${accountId}】${status}：${detail}` };
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
