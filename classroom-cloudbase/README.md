# 第七讲课堂答题后台

已实现第七讲第一题：学生扫码进入同一课堂，姓名及学号登记，持久登录，教师发题60秒、加30秒、提前收题、手动公布匿名选项分布、显示解析、导出全部轮次的具名CSV。原课件题面、答案分步及翻页顺序保持原样。题目来源为 `quantum-slides/lecture07.qmd` 的 `l07-q1`，正确选项 C。

## 当前可用范围

- 正式课件已增加“扫码答题”入口。CloudBase 公共配置为空时明确显示待开通，不能收集真实手机数据。
- 本机联调服务复用同一份后端业务逻辑，记录落在被 Git 忽略的 `.local/records.json`；不是云数据库模拟器，也不能证明腾讯云并发性能。
- 学生端和教师端已通过独立浏览器会话联调。云端真实 SDK 身份、数据库事务、权限规则、设备网络和容量必须在环境开通后再验收。
- 不包含真实 AI 调用。统计是确定计数，教师负责判断误区和调整讲授。

## 教师的使用流程

1. 在第七讲第一道思考题点击“扫码答题”。教师登录后，新建本堂课堂；课件显示学生二维码。
2. 学生扫码首次登记姓名、学号。后续刷新或再次进入同一个网站，会保持登录，最长120天。微信与外部浏览器的存储互不共享；换浏览器需要重新填写，但相同学号仍关联同一学生记录。
3. 点击“发题 · 60秒”。学生选择后提交，截止前可修改；重复提交覆盖本轮自己的选择，不增加人数。
4. 到时后服务端停止接收，统计不会自行公布。教师点击“公布统计”后展示分布，再用“显示解析”或返回原课件推进答案分步讲解。学生端只看匿名分布，不自动收到解析。
5. 再次发题创建新一轮，保留之前的答卷。新建课堂用于下一次上课；导出按课堂包含各轮次，不混入其它课堂。

姓名和学号是低门槛课堂身份登记，不证明持有人身份，不适合高风险考试。相同学号必须匹配已有姓名，姓名误填由教师在后台核对修正。此版本没有公开学生名单接口；教师口令独立于学生身份，只有教师会话可开题、看实时人数和导出记录。公开投影不展示姓名、学号。

## 等账号开通后，由 Codex 完成的步骤

用户只需完成腾讯云注册、实名认证，创建 CloudBase 环境，并告知环境 ID 和地域。后续使用本机 CLI 的浏览器授权，不在聊天中粘贴腾讯云 SecretId / SecretKey。

1. 确认该环境已启用**文档型数据库**、云函数和身份认证。此实现使用 CloudBase JavaScript SDK 调用事件型云函数，不使用自建 HTTP 网关，不需要迁移课程网站。实际 SDK 访问仍需完成安全域名和鉴权配置。
2. 在身份认证中允许匿名连接，创建用于 Web SDK 的 **Publishable Key**。它是可公开的客户端标识，不是腾讯云 SecretKey。匿名身份只用于 SDK 连接；业务端教师/学生的权限另行校验。
3. 安全域名按当前控制台要求添加 `zimin.li`，联调时添加 `localhost` / `127.0.0.1`；不要添加通配来源。仅允许调用 `classroom` 云函数，不开放数据库客户端读写。
4. 创建文档集合 `qo_classroom`，将 `database.rules.json` 设为该集合的安全规则：客户端读写全部拒绝，仅服务器 SDK 访问。没有完成这一项不得用于真实课堂。
5. 根据控制台实际查询提示，为 `{kind,roomCode,_id}` 的导出查询、`{kind,roundId,choice}` 的计数查询建立所需组合索引。核对前端直读/直写数据库确实失败。
6. 运行配置准备脚本，再使用已登录的 CloudBase CLI 部署。秘密文件不进入公开网站。

```sh
node scripts/prepare.cjs --env-id ENV_ID --region ap-shanghai --publishable-key PUBLISHABLE_KEY
tcb login
tcb fn deploy classroom
```

准备脚本会生成 Git 忽略的 `cloudbaserc.json`，函数环境变量中只放教师口令的 scrypt 哈希；原始教师口令仅保存在权限600的 `.local/teacher-login.json`。已有口令文件会保留。不要启用云函数请求体或响应体全量日志，以免记录学生信息、口令和会话令牌。生产云函数仅部署 `functions/classroom/`，不部署 `.local/` 或本机开发服务。

7. 部署后验证：SDK 匿名连接、学生身份保持、教师权限拒绝测试、数据库规则拒绝测试、服务端截止、并发提交、重新发题归档、具名CSV。用至少两部真实手机分别测试微信和系统浏览器，再同步公共配置到课程网站。公共配置未验证前，不宣称云端已接通。

## 本机开发与验证

```sh
npm ci
npm ci --prefix functions/classroom
npm test
npm run dev
```

打开 `http://localhost:8765/lecture07.html#/l07-q1`。点击“扫码答题”，再点击“本机演示登录”和“新建课堂”。此本机入口仅由绑定回环地址的开发服务提供；正式云函数没有该操作。二维码在本机指向 localhost，不能用真实手机扫描作联调。独立浏览器会话可以验证跨浏览器提交，但不代表跨手机云端接通。

真实浏览器检查：`node test/browser.cjs`。测试依赖宿主 Playwright QA 环境和已安装的 Microsoft Edge，可通过 `QO_PLAYWRIGHT` 指定 Playwright 路径。覆盖二维码解码、两个独立学生会话、刷新保持、真实课件浮层、手动公布、具名导出、下一轮以及越权拒绝。

`npm run build:vendor` 根据锁定版本生成客户端 SDK 和二维码脚本。自托管依赖，不调用第三方二维码网站；二维码只含随机课堂编号。KaTeX及许可证来自课程既有依赖。CloudBase/node-sdk 的旧 axios、lodash.set/unset 依赖通过 package.json overrides 升级或兼容封装到维护中的版本，当前依赖审计无已知漏洞；云端仍需实际 SDK 冒烟测试。

## 数据与权限实现

单集合按 kind 分 room、round、student、session、answer、limit。学生学号只在受保护的数据库及教师导出中出现，学生主键为学号 SHA-256；会话是随机256位令牌，服务端仅存其哈希。学生会话120天、教师会话12小时，退出时服务端撤销会话。前端凭据保存在同源 localStorage，清除浏览器数据后需重新登记。

服务器每次提交都在事务中读取当前轮次和截止时间，然后写入该学生独立答卷，并更新按学生散列分配的16个提交门之一。教师收题会在事务中关闭全部提交门，使并发旧请求产生写入冲突并重试；不依赖数据库把单纯读集合也作为冲突。没有全班争写的单一计数器；教师实时计数使用服务端查询，公布时先完成收题事务，再保存匿名聚合快照。浏览器关闭不影响服务端截止判断。

学生5秒轮询，教师3秒轮询；隐藏页面暂停查询，回到前台刷新。它是近实时显示，不是 WebSocket 毫秒推送。具体上课人数对应的云额度、数据库事务隔离行为及突发并发，待真实环境压测。

## 官方依据

- [Web SDK 初始化](https://docs.cloudbase.net/api-reference/webv3/initialization)
- [匿名连接与身份认证](https://docs.cloudbase.net/api-reference/webv3/authentication)
- [服务端事务](https://docs.cloudbase.net/database/transaction)
- [数据库安全规则](https://docs.cloudbase.net/database/security-rules/)
- [云函数配置](https://docs.cloudbase.net/cli-v1/functions/configs)
- [CLI 部署](https://docs.cloudbase.net/cli-v1/functions/deploy)
