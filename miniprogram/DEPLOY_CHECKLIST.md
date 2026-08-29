# LinguaSpeak 小程序 发布部署清单 (DEPLOY_CHECKLIST)

> 本清单用于保证 LinguaSpeak 小程序从"本地开发"到"真实发布到微信小程序供客户使用"的所有步骤都被完整执行。请按顺序逐项打勾 ✅ 。

---

## 第一部分：发布前必读 — 什么是"真实功能"？

本改造前，LinguaSpeak 所有功能均为**前端本地模拟**：
- 登录：仅 `wx.showModal` + `wx.setStorageSync('ls_user')`，**无真实微信身份**
- 进度：仅 `localStorage`，换设备/清缓存后丢失
- 评分：`recordSeconds + Math.random()`，**每次结果随机且不可信**
- 上传内容：只在内存里存一下，刷新即丢失

改造后全部变为**真实功能**：
- 登录：`wx.login → 云函数 login(云函数自带WXContext拿真实openid) → syncUser 写 users 集合`
- 进度：先本地显示，异步同步/覆盖到云端 `progress` 集合，**跨设备可用**
- 评分：**同声传译插件实时ASR识别** + `evaluateSpeech` 云函数基于 Levenshtein 编辑距离 + 多语言基准语速计算 **稳定非随机评分**
- 录音：真实上传到云存储 `records/用户openid/xxx.mp3` + 元数据写 `records` 集合，可回放
- 上传内容：文本/文件真实写入 `contents` 集合，支持 20 条历史回溯
- 发现页：优先从 `courses` 集合读运营录入内容，空集合自动返回内置静态多语言课程

---

## 第二部分：发布步骤（按顺序）

### ✅ Step 1：注册小程序 + 获取 AppID
- [ ] 前往 https://mp.weixin.qq.com 注册小程序账号（建议企业/个体工商户主体，个人主体不能用手机号授权）
- [ ] 记录 AppID（形如 `wxabcdef1234567890`）
- [ ] 打开 `/workspace/miniprogram/project.config.json`，把 `"appid": "touristappid"` 替换为你的真实 AppID

### ✅ Step 2：开通云开发环境
- [ ] 用微信开发者工具打开 `/workspace/miniprogram` 目录（**注意不是 /workspace 根目录，因为 src 是 H5 站**）
- [ ] 点工具栏「云开发」按钮 → 同意协议 → 创建环境
  - 建议选：按量付费（新用户有免费额度足够初期）
  - 环境名称随意，如 `lingua-prod`
- [ ] 进入云开发控制台 → 「设置」 → 复制**环境 ID**（形如 `lingua-3gxxxxxx` 或 `lingua-prod-xxxxx`）
- [ ] 打开 `/workspace/miniprogram/config.js`，将：
  ```js
  CLOUD_ENV: 'your-env-id'
  ```
  改为你刚刚复制的真实环境 ID。⚠️ **这是区分"本地降级模式"和"真实云模式"的唯一开关**

### ✅ Step 3：添加同声传译插件（免费，语音识别必备）
- [ ] 登录 https://mp.weixin.qq.com → 设置 → 第三方设置 → 插件管理 → 添加插件
- [ ] 搜索「微信同声传译」→ 找到 AppID 为 `wx069ba97219f66d99` 的那个官方插件 → 添加
- [ ] （可选）回到 config.js 确认 `WECHAT_SI_PLUGIN_APPID` 就是 `wx069ba97219f66d99`，版本号 `0.3.5` 正确
- [ ] ⚠️ 如果暂时不想加插件，把 `config.js` 中 `FEATURES.ENABLE_SPEECH_EVAL` 改为 `false`，会降级为"仅基于时长估算"的稳定评分模型（非随机，但准确率不如 ASR）

### ✅ Step 4：部署 8 个云函数（必须，否则全都是降级模式）
> 在微信开发者工具的文件树里，每个云函数文件夹**右键 → 上传并部署（云端安装依赖）**。

按以下顺序逐个部署：

| 序号 | 云函数名 | 作用 | 依赖集合 |
|------|----------|------|---------|
| 1 | `login` | 获取用户真实 openid | 无 |
| 2 | `syncUser` | 初始化/更新 users 集合用户资料 | users |
| 3 | `getPhone` | 解密手机号（仅企业主体可用） | users |
| 4 | `syncProgress` | 学习进度读写 | progress |
| 5 | `uploadRecord` | 录音元数据入库 | records |
| 6 | `evaluateSpeech` | 真实评分算法（Levenshtein+语速） | 无 |
| 7 | `uploadContent` | 上传文本/文件解析入库 | contents |
| 8 | `listCourses` | 发现页课程动态加载 | courses |
| 9 | `checkVipStatus` | 会员状态 + 免费试用时长校验 | users |
| 10 | `activateKey` | 激活码生成/兑换（含 admin 批量生成） | activations, users |
| 11 | `createOrder` | 微信虚拟支付下单 + 验单 + 开通会员 | orders, users |

每个云函数部署时：
- [ ] 选择「云端安装依赖：不校验是否部署 node_modules」
- [ ] 等待状态栏提示部署成功
- [ ] 每个都点一次「云端测试」确认没有启动错误（login/syncUser/syncProgress 应返回 `errorCode: 0`）

### ✅ Step 5：数据库集合权限设置（极重要，否则线上读写会失败）
> 云开发控制台 → 数据库 → 对以下每个集合检查权限设置

| 集合名 | 建议权限 | 说明 |
|--------|---------|------|
| `users` | 仅创建者可读写 | 用户自己的头像/昵称/手机号只能自己改（**会员字段仅云函数可改，前端无法直接写**） |
| `progress` | 仅创建者可读写 | 学习进度用户私有 |
| `records` | 仅创建者可读写 | 录音文件元数据用户私有 |
| `contents` | 仅创建者可读写 | 用户上传的文本/文件私有 |
| `courses` | 所有用户可读，仅创建者可写 | 运营录入课程后所有人可见 |
| `activations` | 所有用户不可读写（仅云函数读写） | 激活码敏感表，防止前端刷激活码 |
| `orders` | 仅创建者可读，仅云函数可写 | 订单历史，用户只能看自己的，写操作全走云函数 |

> 💡 如果集合不存在，没关系 — 首次调用云函数会自动用 `db.createCollection` 创建。但**创建后一定要手动去云控制台把权限改对**，默认权限通常是"所有用户可读写"，不安全。

### ✅ Step 5.5：开通虚拟支付（会员系统必做，企业主体专属）
> ⚠️ **微信虚拟支付仅支持企业/个体工商户主体的小程序**，且仅允许购买"数字商品 / 虚拟会员"等，**不能卖实物**（本小程序 Pro 会员属于虚拟服务，合规）。
> ⚠️ 个人主体请直接跳到「仅激活码模式」（下方 Step 5.7）。

- [ ] 登录 https://mp.weixin.qq.com → 功能 → 虚拟支付 → 点击"去开通"
- [ ] 上传经营资质（营业执照 + 小程序类目「教育-语言学习」）→ 等审核，一般 1-3 个工作日
- [ ] 审核通过后 → 虚拟支付 → 商品管理 → **新增 2 个商品**，与代码中商品 ID 严格一致：

  | 商品ID（填写到 config.js 时要一致） | 商品名称（展示给用户） | 价格（分） | 类型 |
  |--------------------------|---------------|----------|----|
  | `lingua_pro_2year_498`   | LinguaSpeak · Pro（2年版） | 4980 分 = 49.8 元 | 时长/周期类 |
  | `lingua_pro_forever_990` | LinguaSpeak · Pro（永久版）| 9900 分 = 99.0 元 | 永久权限类 |

- [ ] 打开 `/workspace/miniprogram/config.js` 确认：
  ```js
  VIP: {
    // ...
    WX_PAY_PRODUCT_IDS: {
      pro_2year: 'lingua_pro_2year_498',
      pro_forever: 'lingua_pro_forever_990'
    }
  },
  FEATURES: {
    ENABLE_VIP: true,     // 会员系统主开关
    ENABLE_WX_PAY: true   // 虚拟支付通道开关
  }
  ```
- [ ] 给云函数 `createOrder` 开通"虚拟支付 API 权限"：
  - 云开发控制台 → 云函数 → `createOrder` → 配置 → 权限设置 → 勾选「虚拟支付 - sendPayment / queryOrder」
  - 或通过云控制台云函数权限项，授权 `cloud.openapi.virtualPayment.*` 的调用权限

### ✅ Step 5.6：激活码系统（必做，个人/企业都可用）
> 激活码通道**不依赖微信支付**，适合：个人主体小程序、线下分销、抖音/小红书引流兑换、批量采购等场景。

- [ ] **先部署 `activateKey` 云函数**（Step 4 已在列表里）
- [ ] 生成激活码（推荐用云开发控制台云函数**云端测试**，传 `adminKey` 批量生成，**不要前端写生成逻辑**）：
  ```json
  // 在 activateKey 云端测试 → 函数参数填：
  {
    "action": "generate",
    "adminKey": "Lingua2025Admin",        // 建议改成自己的强密码，并在云函数代码同步修改
    "count": 100,                        // 本次生成 100 张
    "planKey": "pro_2year",              // 或 pro_forever
    "price": 4980,                       // 面值 49.8 元（仅展示用）
    "batchNote": "2025年双11活动_两年卡"
  }
  ```
  成功返回会给出 `activations` 数组（每张的 `code`、`planKey`、`expiresAt`）
- [ ] 强烈建议**批量生成后立刻导出 Excel/CSV 保存**，以后发给客户或渠道商
  - 云开发控制台 → 数据库 → activations 集合 → 右上角「导出」→ CSV
- [ ] 激活码安全策略（已写在云函数里）：
  - ✅ 每张激活码仅能使用一次（status: 0 未用 → 1 已用）
  - ✅ 有有效期（默认生成后 2 年过期，可在云函数里改）
  - ✅ 不可重复兑换：使用时写 `usedAt` / `usedBy(openid)`
  - ✅ 管理员密钥如果在 config 配置错误，云函数会直接拒绝 generate，防止被盗刷
- [ ] 数据库集合权限：**`activations` 必须设为"所有用户不可读写"**（否则用户能前端直接查所有激活码，等于白送会员）

### ✅ Step 5.7：仅激活码模式（个人主体 / 不想走虚拟支付时使用）
- [ ] 到 `config.js` 把 `FEATURES.ENABLE_WX_PAY = false`
- [ ] 这样做后，会员中心页面只显示「使用激活码」输入框，不显示微信支付按钮
- [ ] 用户付费后，**你在线下给他一张激活码**，他在「我的 - 开通Pro会员 - 使用激活码」粘贴即完成开通
- [ ] 可搭配任何支付渠道收款：微信转账、支付宝、银行卡、抖音小店…… 都可以，**不依赖微信虚拟支付审核**

### ✅ Step 6：（可选）手机号授权开关
- [ ] 如果你是**个人主体小程序**：`config.js` 把 `FEATURES.ENABLE_PHONE_AUTH` 改为 `false`（个人号用不了此能力，不影响其他功能）
- [ ] 如果你是**企业/个体工商户主体**：保留 `true` 即可，用户授权后手机号会加密解密并写入 users 表 phone 字段

### ✅ Step 7：本地开发端到端测试（必须过）
在微信开发者工具里按以下路径走一遍，确认 Console 没有红字报错：

#### 📌 测试 1：真实登录
1. 打开小程序 → 如果还没配 CLOUD_ENV 应该弹窗提示"尚未配置云开发"（正常，配好就不弹了）
2. 点击底部 Tab「设置」→ 点用户卡片「点击登录」
3. ✅ 应该 toast「登录成功」（不是「本地模式登录」）
4. ✅ 打开云控制台 → 数据库 → users 集合 → 能看到自己的 openid 记录
5. ✅ 点「关于 LinguaSpeak」→ 用户ID 应显示真实 openid（非 local_ 开头）

#### 📌 测试 2：头像昵称编辑
1. 登录后在设置页再次点击用户卡片 → 弹出资料编辑弹窗
2. 点「选择头像」选一张微信头像；昵称填入测试名
3. 保存后刷新
4. ✅ 重新进入弹窗，头像昵称仍保留
5. ✅ 云控制台 users 集合中对应记录 nickName/avatarUrl 已更新

#### 📌 测试 3：朗读训练 + 真实评分
1. 去「首页」点任意卡片进入朗读训练页
2. 点录音按钮，朗读一句屏幕上的话后停止
3. ✅ 录音结束后应该有 analyzing → complete 状态变化
4. ✅ 返回的 accuracy / fluency / pronunciation 是 0-100 的数字，且**同样的句子同样的录音时长每次结果近似**（非随机）
5. ✅ 云控制台 records 集合中出现新记录
6. ✅ 云存储中出现 `records/你的openid/xxx.mp3` 文件

#### 📌 测试 4：上传内容真实落地
1. 去「上传」页 → 粘贴一段 20 字以上英文/中文文本 → 选目标语言 → "开始训练"
2. ✅ 应该跳转到朗读页，句子被正确拆分
3. ✅ 返回上传页 → 历史记录里出现刚刚上传的内容
4. ✅ 云控制台 contents 集合中出现新记录

#### 📌 测试 5：发现页动态课程
1. 去「发现」页
2. ✅ banner + 推荐/热门/新课三个列表应全部加载出来（带 5 国语言标题）
3. ✅ 首次应该显示静态内置课程（因为 courses 集合为空），数据标记 `_builtIn: true`
4. （可选进阶）在云控制台 courses 集合手动插入一条课程记录，重启小程序后应走数据库分支

#### 📌 测试 6：进度跨端同步
1. 朗读训练 1-2 次后，回到首页查看连续打卡天数、总训练时长
2. 打开微信开发者工具 → 「清缓存 → 全部清除」
3. 重启小程序并重新登录
4. ✅ 进度数据应该从云端恢复回来（不会归零）
5. ✅ 云控制台 progress 集合中有 openid 对应的记录

#### 📌 测试 7：会员系统 - 1 小时免费试用
1. 注册一个**从未登录过**的新用户（可在云控制台 users 集合手动删掉自己那条再重登模拟）
2. 登录后立刻进入「我的」页面，顶部会员入口应显示**试用中**，并显示 `59:59` 倒计时
3. 在 60 分钟内，尝试点首页卡片「开始朗读」、上传「开始训练」、发现页「开始训练」
4. ✅ 全部应允许进入，无拦截
5. 为了免等 60 分钟，可在云控制台 users 集合把自己那条的 `freeTrialStartedAt` 改成 **2 小时前的毫秒时间戳**
6. 关闭小程序，重开 → 再点任意「开始训练」
7. ✅ 应弹出"免费试用已结束，开通Pro继续训练"的拦截弹窗，并能跳转到会员中心

#### 📌 测试 8：会员系统 - 激活码兑换
1. 先按 Step 5.6 的指引，用 activateKey 云函数 generate 出**至少 2 张激活码**（一张两年卡、一张永久卡）
2. 到 vip 会员中心 → "使用激活码"输入框 → 粘贴那张两年卡激活码 → 点击兑换
3. ✅ Toast 提示兑换成功；我的页面会员入口立即变成 **PRO** 徽章 + 显示 `剩余 730 天`
4. ✅ 云控制台 users 集合：`vip.planKey === 'pro_2year'`，`vip.expiresAt` 是两年后时间戳
5. 回到会员中心再兑换那张永久卡激活码
6. ✅ 会员入口显示 `永久Pro · 终身使用`；users 集合 `vip.isForever === true`
7. ✅ 所有核心功能（read/upload/discover）不再被拦截

#### 📌 测试 9：会员系统 - 虚拟支付（企业主体才测）
> 个人主体跳过，用「仅激活码模式」即可。

1. 确认 config.js `FEATURES.ENABLE_WX_PAY === true`，且 mp.weixin.qq.com 虚拟支付已开通且已添加 2 个商品
2. 把 `createOrder` 云函数先配成 `DEBUG_MOCK_PAYMENT: true`（在云函数顶部常量），避免真实扣款
3. 到会员中心点 **「立即购买 Pro 2年 49.8元」**
4. ✅ 弹出支付 UI（模拟/真实）→ 支付成功后 Toast「开通成功」
5. ✅ users 集合：`vip.planKey === 'pro_2year'`，且 orders 集合新增一条 order
6. 测试 **「永久 99元」** 同理，支付成功后 `vip.isForever === true`
7. ✅ 关闭 DEBUG_MOCK_PAYMENT 前，先在真手机走一遍真实扣款 0.01 元沙盒单（微信支持虚拟支付沙盒），确认验单回调无问题

#### 📌 测试 10：会员拦截 - 所有入口不漏
确认以下 5 个核心入口都会触发会员拦截（试用结束后 / 未开通用户）：

| 入口 | 触发位置 | 拦截方法 |
|------|---------|---------|
| 首页 "今日任务" 大按钮 | index.js onStartRead | ✅ requireVip 拦截 → 跳 vip?from=index |
| 发现页任意课程卡片 | discover.js onCourseTap | ✅ requireVip 拦截 → 跳 vip?from=discover |
| 发现页底部 "Go Read" 按钮 | discover.js onGoRead | ✅ requireVip 拦截 → 跳 vip?from=discover |
| 朗读页录音按钮 | read.js onStartRecord | ✅ requireVip 拦截 → 跳 vip?from=read |
| 上传页 "开始训练" 按钮 | upload.js onStartTraining | ✅ requireVip 拦截 → 跳 vip?from=upload |

- [ ] 以上 5 个入口在**免费试用结束后**都弹拦截 Modal，确认跳转正常

---

## 第三部分：正式发布前检查清单

### 🛡️ 安全 & 合规
- [ ] `config.js` 中 `FEATURES.DEBUG` 改为 `false`（避免上线后云函数错误详情泄漏给用户）
- [ ] 5 个数据库集合权限已按 Step 5 表格设置完毕（不是默认的"所有用户可读写"）
- [ ] 小程序后台 → 开发管理 → 开发设置 → 服务器域名：云开发不需要配 request 合法域名（云函数走 wx.cloud 通道），但如果后续加自定义域名接口要补
- [ ] （重要）用户隐私协议：小程序后台 → 设置 → 基本设置 → 服务内容声明 → 填写"我们收集您的昵称/头像/手机号（可选）用于登录和身份识别；收集语音录音用于发音评测评分"

### 📱 小程序基础信息
- [ ] 小程序后台 → 设置 → 基本设置 → 上传小程序头像（500x500px）、填写小程序介绍与类目（建议选「教育-语言学习」）
- [ ] 小程序后台 → 版本管理 → 把项目上传为体验版 → 邀请至少 1 个微信号加入体验成员，用真手机测试
- [ ] **真手机测试**：
  - [ ] iOS 真机：登录正常、录音权限弹窗正确、评分正常
  - [ ] Android 真机：同上
  - [ ] 4G/5G 网络下云函数调用正常（不要只测 WiFi）

### 🚀 提审 & 发布
- [ ] 用微信开发者工具点「上传」→ 填写版本号（建议 1.0.0）和项目备注
- [ ] 去小程序后台 → 版本管理 → 把刚才上传的版本「提交审核」
- [ ] 审核内容备注中写清楚（**已开通虚拟支付的版本使用以下备注**；如果只用激活码没开虚拟支付，把付费那两行删掉）：
  > 本小程序是语言朗读训练工具。主要功能：1. 用户微信登录；2. 首页显示学习进度；3. 朗读训练页录音并AI评分；4. 用户可上传文本/文件作为自定义训练内容；5. 发现页浏览训练课程。无社交功能。
  > 本小程序内提供虚拟商品（Pro 会员）购买，采用微信虚拟支付购买时长/永久会员：Pro 2年版 49.8元，Pro 永久版 99.0元；新用户享有 1 小时免费试用，试用结束后需开通会员方可使用核心训练功能。
  > 另支持激活码兑换开通，适用于线下/第三方渠道付费后兑换会员时长。
- [ ] 审核通过后 → 点「发布」→ 正式上线 🎉

---

## 第四部分：常见错误快速排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 所有云函数调用都 toast「云开发环境未配置」| config.js CLOUD_ENV 是默认的 'your-env-id' | 填真实环境 ID，保存后重启小程序 |
| login 云函数报错 `not in cloud env` | 云函数没部署或部署错环境 | 重新右键 login → 上传并部署：云端安装依赖 |
| 录音后评分全是 65 或全是一个数且 evaluatedBy='fallback' | 同声传译插件没加或加错版本 | 到 mp.weixin.qq.com 插件管理确认添加了 `wx069ba97219f66d99` 且版本 0.3.5 |
| 手机号按钮点了提示"个人小程序不支持" | 小程序是个人主体 | 改 `config.js FEATURES.ENABLE_PHONE_AUTH = false`，不影响其他功能 |
| 数据库集合提示 "permission denied" | 集合权限没改对 | 回 Step 5 表格重新设置每个集合的权限 |
| 真机上录音按钮没反应 | 用户没授权麦克风 | 第一次点录音时会弹授权框，用户拒绝后到手机设置手动开启 |
| 上传 .docx/.pdf 显示"文件内容为空" | uploadContent 云函数**只支持 UTF-8 .txt** | 要求用户用记事本另存为 .txt；后续可扩展 mammoth/pdf-parse 在云函数里解析 |
| 开通了虚拟支付，点购买提示"商品不存在" | mp.weixin.qq.com 虚拟支付商品 ID 与 config.js 不一致 | 去 Step 5.5 表格核对：两年卡必须是 `lingua_pro_2year_498`，永久卡必须是 `lingua_pro_forever_990`；大小写敏感 |
| 激活码兑换提示 "无效激活码" | 生成/兑换时 planKey 不匹配，或激活码已被使用 | 去 activations 集合查该 code：status 必须为 0，且 planKey 与 PLANS 中定义一致；兑换人 openid 必须未使用过 |
| 免费用户显示"永久Pro"（会员误判） | 云函数里 isForever 和 expiresAt 校验逻辑异常，或本地缓存脏数据 | ① 到 users 集合确认 `vip.isForever` 只有开通永久卡才为 true；② 在 app.js 的 onShow 里会自动 refreshVipStatus，清缓存重启可立刻解决 |
| 虚拟支付付款成功但会员没开通 | createOrder 的验单（verify）步骤失败，或云函数无 virtualPayment 权限 | ① 云控制台 → 云函数 createOrder → 权限 → 勾选「虚拟支付」API；② 打开 createOrder 云函数 DEBUG 日志，查看 `paymentResult.errcode` 是否为 0 |
| 激活码能无限被兑换 | activations 集合权限不是"仅云函数读写"，前端直接刷库绕过 | Step 5 表格中 `activations` 必须设为「所有用户不可读写」；activateKey 云函数兑换时显式 `status: 1, usedAt, usedBy` 三字段一起写 |
| "免费试用 1 小时"不到 1 小时就被拦截 | 用户手动修改本地手机时间（前端计时被绕过时）| 后端 checkVipStatus 云函数用 `Date.now()` 服务端时间计算剩余时长 + 前端倒计时双机制，已防止篡改；如果出现问题，把 users 集合 freeTrialStartedAt 字段改为准确的首次登录时间 |
| 会员中心页打不开 | 没在 app.json 注册 pages/vip/vip | 检查 app.json `pages` 数组已包含 `pages/vip/vip`（本项目已默认添加） |

---

## 第五部分：功能真实性对照总表（验证结论）

| 模块 | 改造前（模拟） | 改造后（真实） | 验证方法 |
|------|--------------|--------------|---------|
| 🔐 用户登录 | wx.showModal + 本地写死假用户 | `wx.login → cloud.getWXContext().OPENID → users集合` | 云控制台 users 表中有真实 openid 记录 |
| 👤 头像昵称 | 只读静态展示 | `<button open-type="chooseAvatar">` + `type="nickname" input` + syncUser 云函数写库 | 编辑后刷新页面、重启小程序数据仍保留；users 表对应字段变更 |
| 📱 手机号绑定 | 无 | `<button open-type="getPhoneNumber">` → 云函数 `cloud.openapi.phonenumber.getPhoneNumber` 解密 → 写 users.phone | 企业主体真机点击授权，手机号写入 users 表 |
| 📊 学习进度 | localStorage，清缓存丢失 | `progress` 集合按 openid 唯一键读写，本地先显示 + 云端异步覆盖 | 清缓存后重新登录，进度数据恢复 |
| 🎤 录音 | wx.getRecorderManager 本地文件 | 本地录音 → `wx.cloud.uploadFile` 上传到云存储 → `records` 集合写元数据 | 云存储 `records/` 目录出现 mp3 文件；records 表有记录 |
| 🎯 语音评分 | `Math.random()`，结果随机不可信 | ①同声传译插件实时ASR → ②`evaluateSpeech`云函数 Levenshtein 编辑距离 + 多语言语速基准 → 稳定非随机 | 同样句子同样朗读 2 次，分数差 ≤ 10 分；不是 50±30 的乱跳 |
| 📝 上传文本 | 内存变量，刷新丢失 | `uploadContent` 云函数写 `contents` 集合 | 云控制台 contents 表有新记录；历史列表可回溯 20 条 |
| 📎 上传文件 | 本地文件名假记录 | 先上传云存储 → 云函数 `cloud.downloadFile` → UTF-8 txt 解析分句 → 入库 | 云存储 `uploads/` 目录有文件；contents 表 sentences 字段正确拆分 |
| 🔍 发现页课程 | 纯静态写死在页面 JS | 优先查 `courses` 集合（运营可后台录入）；空时返回内置静态多语言数据；最后前端静态兜底 | courses 集合插一条，发现页能显示出来；删掉就回内置数据 |
| 🌐 多语言 | 界面 5 国语 | 界面 + 课程名称 + 难度 + 评分建议，**全部 5 国语**；用户偏好语言同步到 users.lang | 切换日语/韩语/法语，课程名、Tab、按钮、评分建议全变对应语言 |

> ✅ **以上 10 个核心模块全部从"模拟"升级为"真实"，达到发布到微信小程序供客户使用的标准。**

---

## 第六部分：后期运营扩展（可选进阶）

1. **运营课程录入**：云控制台 → 数据库 → courses 集合 → 添加文档。字段建议：
   ```json
   {
     "name_zh": "商务英语演讲",
     "name_en": "Business Speech",
     "name_ja": "ビジネス英語スピーチ",
     "difficulty": 2,
     "students": 35120,
     "lessons": 18,
     "duration": "10h",
     "category": "career",
     "color": "#9b59b6",
     "recommend": 100,
     "hot": true,
     "createdAt": 1740000000000
   }
   ```
2. **消息订阅**：在「设置」页每日提醒接入 wx.requestSubscribeMessage，实现每日定时推送训练提醒
3. **好友PK**：基于 records 集合的 accuracy / pronunciation 分数做排行榜
4. **付费课程**：接入微信支付，高级课程走 virtualPayment 或 IAP

---

**编写版本**：LinguaSpeak v1.0.0 — 最后更新：2025
