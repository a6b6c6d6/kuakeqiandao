# 夸克网盘自动签到 + 钉钉推送

每天定时帮你的夸克网盘账号签到，结果通过钉钉群机器人推送，支持加签安全验证。

---

## 功能
- ✅ 自动检测账号登录状态（基于 Cookie）
- ✅ 签到结果通过钉钉群机器人推送
- ✅ 支持钉钉「加签」安全模式
- ✅ GitHub Actions 零成本定时运行（默认每天 6：18 UTC+8）

---

## 快速开始

### 1. Fork 本仓库

### 2. 设置 Secrets
在仓库页面依次点击  
`Settings → Secrets and variables → Actions → New repository secret`  
添加以下 3 条（**全部必填，缺失会导致工作流失败**）：

| Secret 名称        | 说明                                                                 |
|--------------------|----------------------------------------------------------------------|
| `QUARK_COOKIE`     | 夸克网盘 Cookie。**获取方式见下文**。                                |
| `DD_ACCESS_TOKEN`  | 钉钉机器人 `access_token`。**只需要数字部分**（即 `access_token=` 后面的纯数字）。 |
| `DD_SECRET`        | 钉钉机器人「加签」密钥。**必须完整填写，不能省略任何字符**。         |

&gt; 示例  
&gt; `DD_ACCESS_TOKEN` 填 `123456`  
&gt; `DD_SECRET` 填 `SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. 验证
- 手动触发：进入 `Actions` 页，选中 `Quark Checkin` 工作流，点击 `Run workflow`。
- 正常情况 30 秒内会收到钉钉群消息。

---

## 获取 Cookie（电脑端）
1. 打开 夸克网盘 
   实际只需要 Cookie，User-Agent 用默认即可。
2.F12，刷新一下，找到包含夸克网盘的网络请求，找到Cookie，全部复制即可

---

## 钉钉机器人配置
1. 群设置 → 智能群助手 → 添加机器人 → 自定义 → 加签  
   保存后页面会显示：
   - Webhook 地址，例如  
     `https://oapi.dingtalk.com/robot/send?access_token=123456`  
     只取数字部分 `123456` 填入 `DD_ACCESS_TOKEN`。
   - 密钥 `SECxxxxxxxx...` 完整填入 `DD_SECRET`。

---

## 自定义
- 修改执行时间：编辑 `.github/workflows/checkin.yml` 里的 `cron` 表达式.
- 多账号：在 `QUARK_COOKIE` 里用英文半角逗号 `,` 分隔多个 Cookie，脚本会依次签到并一次性推送结果。

---

## 免责声明
本项目仅供学习交流，请确保使用的账号 Cookie 来自您本人，由此带来的任何风险与仓库作者无关。
