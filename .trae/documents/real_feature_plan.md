# LinguaSpeak 真实功能改造实施计划

## 一、仓库调研结论

当前 `/workspace/miniprogram` 项目的功能全部为前端本地模拟，存在以下关键"假功能"，无法真实发布：

| 模块 | 当前（模拟）实现 | 问题 |
|---|---|---|
| 登录 | settings.js `onLogin` 仅 `wx.showModal` + `wx.setStorageSync('ls_user')` | 没有真实微信身份（openid），无法服务端鉴权 |
| 进度数据 | app.js `initProgressData` 使用 `wx.setStorageSync('linguaspeak_progress')` 本地持久化 | 换设备/清缓存后丢失，无法跨端同步 |
| 录音评分 | read.js `analyzeResult()` 用 `recordSeconds + Math.random()` 随机生成 accuracy/fluency | 评分不可信，无真实语音识别/评测依据 |
| 朗读回放 | `recordFilePath` 仅为本地临时路径（`tempFilePath`） | 关闭小程序后失效，无法二次播放或存储 |
| 上传内容 | upload.js 仅读取本地文件信息，存入 `ls_upload_history` 本地storage | 无真实文件持久化，无服务器端文本解析 |
| 课程/发现页 | 所有课程写死在 discover.js `loadContent()` 内存对象里 | 无法后台运营上下架，无法动态更新 |
| 用户信息 | 头像/昵称未采集；完全假数据 | 不符合发布型小程序的账号合规要求 |
| 接口域名 | 未配置任何合法request/uploadFile域名 | 真实发布后后端请求会被拦截 |

**已具备可复用真实能力：**
- `wx.getRecorderManager()` 录音是微信原生真实API（只要手机麦克风，可直接录音）
- `wx.chooseMessageFile()` 选文件、`wx.getClipboardData()` 粘贴也是真实API
- i18n多语言模块 `utils/i18n.js` 完整可用
- 全局主题/组件样式系统 `app.wxss` 完整可用

---

## 二、整体技术选型

为了让您零后端运维、直接可发布上线，本次改造使用 **微信云开发 (Cloud Base)**：

- **用户身份**：`wx.login` → 云函数自动返回 `OPENID`（微信唯一身份标识，不需要您维护账号密码体系）
- **手机号真实认证（可选增值）**：云函数 `cloud.openapi.phonenumber.getPhoneNumber` 调用微信官方"获取手机号"能力（需小程序后台开通）
- **头像/昵称**：使用小程序新版 `button open-type="chooseAvatar"` + `input type="nickname"`（符合微信2024新规则，不能再调用已废弃的 getUserProfile）
- **数据库**：云开发 `db` 建 `users/progress/courses/contents/records` 5个集合
- **文件存储**：录音mp3 / 用户上传txt/docx/pdf → 云存储 `cloud://` 永久URL
- **真实评分**：集成 **微信同声传译插件 (WechatSI)** 做语音→文字识别，再与目标文本按Levenshtein距离计算准确度；后续如需更专业打分，本结构预留了"腾讯云智聆口语评测"接入位
- **课程运营**：`courses` 集合按 `{langCode, difficulty, ...}` 存，云函数按当前语言返回；首次部署自动注入10门种子课程（多语言）

---

## 三、变更文件与模块清单

### 3.1 新增文件

| 路径 | 用途 |
|---|---|
| `miniprogram/config.js` | 集中配置：云开发环境ID、同声传译插件AppID、功能开关 |
| `miniprogram/utils/cloud.js` | 云能力封装：`callFunction / uploadFile / db(collection)` + 统一错误处理 |
| `miniprogram/utils/api.js` | 业务接口封装：`api.login / api.getUser / api.updateProgress / api.evaluateSpeech ...` |
| `miniprogram/app.json#plugins` | 新增 `WechatSI` 同声传译插件声明 |
| `miniprogram/cloudfunctions/login/index.js` + `package.json` | 云函数：返回 `{openid, appid, unionid}`（微信官方模板） |
| `miniprogram/cloudfunctions/syncUser/index.js` | 云函数：拉取openid后，自动初始化users文档；支持传入avatar/nickname/phone更新 |
| `miniprogram/cloudfunctions/getPhone/index.js` | 云函数：拿前端传的 `getPhoneNumber` code → 调用 `cloud.openapi.phonenumber.getPhoneNumber` → 返回纯手机号 |
| `miniprogram/cloudfunctions/uploadRecord/index.js` | 云函数：接收tempFileURL → 转存云存储 → 在records集合写记录 |
| `miniprogram/cloudfunctions/evaluateSpeech/index.js` | 云函数：预留腾讯云智聆评测调用 + 本地Levenshtein双保险评分逻辑 |
| `miniprogram/cloudfunctions/syncProgress/index.js` | 云函数：读/写progress集合（校验openid，不可伪造他人） |
| `miniprogram/cloudfunctions/listCourses/index.js` | 云函数：按langCode+category分页查询courses；首次调用无数据时自动初始化种子 |
| `miniprogram/cloudfunctions/uploadContent/index.js` | 云函数：接收云存储fileID → 解析txt/docx/pdf（`pdf-parse`/`mammoth`）→ 返回分句+存contents集合 |

### 3.2 改造现有文件

| 路径 | 改造内容 |
|---|---|
| `app.json` | 加 `"cloud": true` + `plugins: { WechatSI: { version, provider } }` |
| `app.js` | 启动时 `wx.cloud.init({ env })`；登录态从云同步；`globalData` 增加 `openid / token / wechatSIPlugin` |
| `pages/settings/*` | 新增三块真实登录UI：① 微信一键登录 ② 手机号授权按钮 ③ 头像昵称选择框；退出登录同步清云态 |
| `pages/read/*` | `onStopRecord` 停止后立即上传 `recordFilePath` 到云存储获取永久fileID；调用 `api.evaluateSpeech(fileID, 目标文本, lang)` 获取真实评分；回放播放云端临时URL |
| `pages/upload/*` | 选文件后 `wx.cloud.uploadFile`；提交后调用 `uploadContent` 云函数解析内容分句；历史从 `contents` 集合按 openid 拉取（不存本地） |
| `pages/discover/*` | 去掉本地 `loadContent` 静态数组，改为 `onLoad + onShow` 调 `api.listCourses({lang, category})` |
| `pages/index/*` | `loadProgress` 改为调用 `api.getProgress()`（云库）；完成朗读 `onFinishAll` 调 `api.updateProgress()` 写入云端 |

---

## 四、依赖顺序的实施步骤

> 以下步骤按依赖关系严格排序，每步完成后有验证点

### Step 0：初始化云开发配置
1. 新建 `miniprogram/config.js` 暴露 `CLOUD_ENV = 'your-env-id'`（占位，提供部署说明让用户填自己的）
2. 新建 `miniprogram/utils/cloud.js` 封装 `call(name, data) / upload(localPath, cloudPath) / db(col)`，含 loading + 错误提示
3. 新建 `miniprogram/utils/api.js` 暴露所有业务接口（空实现占位 → 后续各step逐步填）
4. 修改 `app.js` onLaunch 里 `wx.cloud.init({ env: require('./config').CLOUD_ENV, traceUser: true })`，若env未配置给出toast提示但不阻塞本地调试（降级模式）
5. 修改 `app.json` 加入 plugins 声明 + `"cloud": true`
6. 新建 `project.config.json#cloudfunctionRoot: "cloudfunctions/"`

**验证**：微信开发者工具中"云开发"按钮可点开，`utils/cloud.call('login')` 不抛错（失败返回降级结构）

### Step 1：实现登录系统
1. 写云函数 `cloudfunctions/login/index.js` → `return { openid: cloud.getWXContext().OPENID }`
2. 写云函数 `cloudfunctions/syncUser/index.js`：
   - 从 context 拿 openid
   - `db.collection('users').where({_openid}).get()`
   - 无则插入 `{ _openid, nickName, avatarUrl, phone, lang, createdAt, lastActiveAt }`
   - 有则更新 `lastActiveAt` 及入参字段
   - 返回完整用户对象
3. 写云函数 `cloudfunctions/getPhone/index.js`：用 `cloud.openapi.phonenumber.getPhoneNumber({ code })` 返回手机号（注意错误码处理：未开通/参数错）
4. 改造 `pages/settings`：
   - 未登录态展示"微信一键登录"大按钮 → 点击 `wx.login()` + `call('login')` + `call('syncUser', {})` → 拿到openid后写 `globalData.openid + storage`
   - 已登录态下方展示 `button open-type="getPhoneNumber"` 按钮（未绑手机号时高亮），点击后 `call('getPhone', {code})` → 回写users并刷新
   - 头像区新增 `button open-type="chooseAvatar"` + `<input type="nickname">`，变更后立即 `syncUser({avatarUrl, nickName})`
   - 退出登录：清 storage + 重置 globalData + 回到未登录UI

**验证**：开发者工具真机调试 → 点击登录→返回真实openid（形如 oABC123xxx）；同步用户后云开发控制台 `users` 集合出现一条记录

### Step 2：进度数据云同步
1. 写云函数 `cloudfunctions/syncProgress/index.js`：
   - action: 'get' | 'set'
   - 始终用 context.openid 做条件，禁止前端传 openid
   - set 时做原子更新：`consecutiveDays` 用 `lastActiveDate` 判断是否连签（避免前端假数据）
   - 返回最新 progress 对象
2. 改造 `app.js initProgressData`：`await api.getProgress()` 失败才降级本地storage
3. 改造 `pages/index loadProgress / onFinishAll`：全部走云端
4. 改造 `pages/read onFinishAll`：完成时调 `api.updateProgress({ addedMinutes: ... })`

**验证**：两设备登录同一微信号 → 在A设备朗读一次 → B设备首页进度自动同步增加（等几秒刷新）

### Step 3：真实录音上传 + 语音识别评分
1. `pages/read onStopRecord` 停止后：
   - `wx.showLoading('上传中...')` → `api.uploadRecord(tempFilePath, sentenceId)` → 返回 `{ fileID, tempUrl }`
   - `recordFilePath` 替换为 `tempUrl`（可回放）
   - 调用 `api.evaluateSpeech({ fileID, targetText: currentSentence, lang: contentLang, ... })`
   - evaluate 返回 `{ accuracy, fluency, pronunciation, suggestion, recognizedText }`
2. 云函数 `uploadRecord`：`cloud.uploadFile({ cloudPath: 'records/{openid}/{ts}.mp3', fileContent: ... })` + 写 records 集合
3. 云函数 `evaluateSpeech`：
   - **主路径（免费真实）**：使用同声传译插件 `plugin.getRecordRecognitionManager` 或云函数侧调用语音识别HTTP接口；若云函数侧识别不便，则改为**前端先识别**：页面初始化时取 `requirePlugin('WechatSI').getRecordRecognitionManager()` 在录音时并行识别出文字，拿到 `result` 文本后，上传到 evaluateSpeech 云函数只执行 Levenshtein 比对+评分逻辑
   - 评分算法：
     ```
     accuracy = max(0, 100 - editDistance(recognized, target) / targetLen * 100)
     fluency = 按录音时长/字符数基准算（英语≈150词/分，中文≈240字/分），太快/太慢扣分
     pronunciation = 加权(accuracy*0.7 + fluency*0.3)
     suggestion = 基于 accuracy 分档的多语言建议
     ```
4. 页面展示增加"识别原文：xxx"对比区，让用户知道评分是真的不是随机数

**验证**：录音内容与目标句完全一致时 accuracy ≥ 90；故意读错 2 个字 accuracy 降 15~25 分；关闭小程序再打开，点击回放仍能听到（使用云端临时URL）

### Step 4：上传内容真实落地
1. `pages/upload onStartTraining`：
   - 文本：直接调 `api.createContent({ text, lang })` → 服务端分句 → 返回 `contentId` + `sentences[]`
   - 文件：先 `wx.cloud.uploadFile({ cloudPath: contents/openid/ts.ext })` → 拿 fileID → `call('uploadContent', {fileID, lang})` → 云函数端用 mammoth/pdf-parse 解析原文 → 返回 sentences[]
2. 云函数 `uploadContent` 依赖：package.json 加 `"mammoth": "^1.6.0", "pdf-parse": "^1.1.1"`（微信云函数Node环境可直接npm i）
3. 上传历史：`api.listContentHistory()` → 从 contents 集合 where `_openid = openid` 查
4. 朗读页 custom_xxx：由 upload.js 把 sentences 写入 app.globalData.customSentences（保留旧链路，兼容快速跳转）+ 同时写云库 contentId，下次可直接用 contentId 拉取

**验证**：上传一个真实 docx 文件（含10句以上）→ 返回的 sentences 能在 read 页面逐句朗读；关闭小程序后再进来，history 仍能看到（从云库来的不是本地）

### Step 5：发现页动态课程
1. 云函数 `listCourses`：
   - 查 `courses` 集合按 `{ lang: langCode, category? }` + limit/skip
   - 若 count == 0：执行种子初始化（插入 discover.js 已有的30门多语言课程数据，每门5个语言各一条）
   - 返回 `{ list, hasMore, total }`
2. 改造 `pages/discover loadContent`：按当前选中分类调 `api.listCourses`
3. 轮播/分类数据可从 `listCourses({featured:true})` 返回（种子里标部分课程为banner）

**验证**：首次打开会等待2秒（种子写入）后正常展示；进入云控制台courses集合可看到30~50条文档；后续打开<200ms返回

### Step 6：发布前完整性收尾
1. 所有页面"异常分支"补全：无网络/云环境未配置→降级本地模式；云函数返回错误码→toast文案来自i18n
2. 新增 `miniprogram/DEPLOY_CHECKLIST.md`：
   - 如何在公众平台申请AppID
   - 如何在开发者工具开通云开发、填 `CLOUD_ENV`
   - 如何上传并部署9个云函数（勾选"云端安装依赖"）
   - 如何开通"微信同声传译插件"并填插件AppID
   - 如何开通"获取手机号"能力（需个体/企业认证，非个人）
   - 如何配置合法request/uploadFile/downloadFile域名（云开发可省）
   - 提交审核前的10项自检清单
3. 登录态全链路校验：需要登录才能用的功能（上传、评分写库、保存进度）先检查 `globalData.openid`，无则跳 settings 先登录

---

## 五、关键依赖与注意事项

1. **微信同声传译插件**：官方免费插件，AppID `wx069ba97219f66d99`，需在公众平台"设置→第三方设置→插件管理→添加插件"里搜索添加，否则 `requirePlugin` 报错
2. **获取手机号**：个人小程序不可用（微信限制）；若用户未开通，本方案自动降级为"仅微信身份登录（openid）+ 可选手填手机号提示用户，但不做校验"，功能不阻塞
3. **云开发环境ID**：必须用户自己在微信开发者工具开通后获得，形如 `lingua-xxx12`；未配置时所有云调用返回前端本地降级结构（避免白屏）
4. **npm包**：云函数 `uploadContent` 用的 mammoth/pdf-parse 需在对应云函数目录下 `npm install` 或部署时勾"云端安装依赖"（后者更省心）
5. **i18n多语言不丢**：所有新增的 toast/modal 文案需走 `i18n.t()`，禁止写死中英文
6. **不破坏既有 UI 结构**：每个页面只改 JS 数据链路，`wxml/wxss` 仅增量追加必要的登录按钮/识别结果展示区，不重做布局

---

## 六、验证清单（改造完成后执行）

- [ ] 首次打开→设置页点"微信登录"→控制台返回真实 openid 且 users 集合有数据
- [ ] 设置页"获取手机号"→点击→真实验证码授权→ users.phone 更新
- [ ] 设置页"选择头像"+输入昵称→云库同步更新
- [ ] 首页进度数字：完成一次朗读后，刷新页面数字加1
- [ ] 朗读页录音→读错字→accuracy 确实下降（非随机）
- [ ] 朗读页回放→关闭小程序再打开，仍能播放（非本地临时文件）
- [ ] 上传页传 docx → 返回 sentences 数量对得上原文段落
- [ ] 发现页课程：清本地缓存后仍能加载（从云库）
- [ ] 多语言切换：所有toast、modal、设置项、tabBar都跟当前语言走
- [ ] 退出登录：清云态 + 本地缓存，操作后立即回到未登录态
- [ ] 断网：所有接口失败后不崩，降级本地展示并提示"网络异常"

---

## 七、风险与兜底

| 风险 | 触发条件 | 处理方式 |
|---|---|---|
| 未开通云开发 | `wx.cloud.init` 抛错 | 所有 `cloud.call` 走降级分支：返回前端本地mock结构（不丢失现有UI），并toast"请在config.js配置云环境ID" |
| 同声传译插件未添加 | `requirePlugin` 报错 | 评分降级为"基于录音时长+字数估算"模型（仍非随机，比纯随机可信），并在评分卡片下方加小字提示"开通同声传译后可获得真实文字识别评分" |
| 获取手机号未开通 | `cloud.openapi.phonenumber...` 返错码 | 隐藏"获取手机号"按钮，改成显示"该小程序暂未开启手机号认证，登录身份基于您的微信openid"文案 |
| docx/pdf解析包过大 | 云函数冷启动慢 | 先支持txt解析（无依赖），docx/pdf走"云端安装依赖"模式；超时的话前端提示文件过大请分段粘贴 |
| 用户发布时忘记改配置 | 直接提交审核报错 | DEPLOY_CHECKLIST.md 顶部用红色加粗提醒改 `config.js -> CLOUD_ENV`；并在app启动时若CLOUD_ENV为占位字符串自动弹modal提醒 |
