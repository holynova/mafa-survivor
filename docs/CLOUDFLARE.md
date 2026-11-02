# Cloudflare 子路径发布

用户于2026-11-02调用 hn-project-publisher，随后明确选择子路径。最终入口为 **https://xiaosang.cc/mafa-survivor/**，复用已有 `xiaosang-portfolio` Worker，不创建游戏独立 Worker，不新增域名、发布分支、Cloudflare Action 或 Workers Builds/Git 集成。旧 GitHub Pages 作为回退，本次不触发 Pages 标签发布。

## 来源与边界

- 游戏唯一源码分支：`holynova/mafa-survivor` 的 `main`。
- 生产产物、作品条目与实际部署来源：`holynova/holynova.github.io` 的 `master`，生成目录 `mafa-survivor/`。
- 游戏仍用同一批固定原版图像、地图和WAV；资源公开托管范围按用户现有确认及本次发布请求记录，游戏规则沿用alpha.35。
- `build:cloudflare` 以 `/mafa-survivor/` 构建，保留版本／完整源码SHA；生成目录的 `build-source.json` 记录来源。上传边界沿用作品集 `.assetsignore`，不复制项目缓存、测试、源码、存档和凭据。
- 原版资源289个，最大manifest约18.5MB，符合[Cloudflare单文件限制](https://developers.cloudflare.com/workers/platform/limits/)。账户API最初拒绝创建新Worker（10037），该独立Worker／域名未创建；改子路径后仅更新现有Worker。

## 本地手动流程

要求项目是干净 `main`、作品集是 `master`。默认作品集位于同级 `../holynova.github.io`，可用 `PORTFOLIO_DIR` 指定路径。

```sh
npm ci
# 首次原版资源准备见 DEVELOPMENT.md
npm test
npm run deploy:prepare
# 在作品集仓库检查 mafa-survivor/，提交并推送 master
npm run deploy:check
npm run deploy
```

`deploy:prepare` 只覆盖本项目已标记的生成目录，拒绝未标记目录及该目录已有修改。`deploy` 检查两个仓库分支／干净状态、源码祖先和运行代码是否一致，并验证目标Worker为xiaosang-portfolio；使用锁定Wrangler4.128.0在本地发布作品集的同一提交。Git推送不触发Cloudflare发布。

首次采用两步：先发布游戏子目录并验证HTTPS／版本／JS/CSS／原版素材及交互，再加入作品集条目与截图、提交master并再次手动发布。同一个Worker的两个deployment ID分别记录；不冒称创建了两个Worker。游戏无history路由，不启用缺失资源SPA回退。

## 材料与状态

可见GitHub入口和唯一统一Umami脚本已补齐；短双语README、原版生产预览截图与最终子路径二维码已准备，旧完整README保存在DEVELOPMENT.md。README与仓库assets不在游戏生产产物中，单独修订无需重建游戏。

## alpha.36 核验记录（2026-11-02）

- 游戏构建源码：`7cd9bc6a560044fe112b3a5e9548673f96b4e4af`，版本 `v0.1.0-alpha.36`；后续文档和截图提交不改变这一产物来源。
- 第一次共享Worker部署：作品集 `master` 的 `5cf4e18c9a588990df0ce7b8a8742b523d359d94`，Cloudflare version ID `608f6321-3e3c-4c39-b2f6-6979a125cec7`。该次先提供游戏子目录，再做作品集收录。
- HTTPS、线上版本／完整SHA／original模式、正确JS/CSS和缺失JS返回404均通过。原版图片manifest（32,403帧、66页）与音效manifest（137 WAV、141映射）线上完整结构等于本地；两个WAV样本大小及SHA256相符。全137个线上WAV逐文件哈希审计遇网络超时，未计为通过。
- 真实公网页面进入快速测试模式；烈火优先精英诊断为精英伤害41、普通怪0、烈火归因29；原生D输入让x从1080.0增至1097.1。上述操作期间捕获异常0；这些定格／高血量场景不代表普通局通关。
- 查看线上桌面1440×900与移动390×844实机截图；文档宽度分别1440／390，无横向溢出。Repo链接可见，Umami脚本恰好1个。操作栏未出现额外底部黑条；沃玛地图下沿样例右下仍有源地图边界黑区，不能据此宣称所有边界铺满。
- 复用本次已通过的680项游戏测试、19项工具测试、资源／像素检查及生产构建；源码CI通过。截图只展示测试模式，不作为平衡或性能压力测试证据。

## 作品集与仓库同步

- 第二次同Worker部署：作品集 `master` 提交 `7d1536cfab1244715724c7c89e75a83f4fce3080`，Cloudflare version ID `812d8076-b98a-446b-babc-45bcb42a3f6c`。只新增／更新目录JSON、PNG和WebP三个资产，游戏构建来源保持不变。
- 线上 `/data/repos.json` 完整结构与该提交一致，共139项；原有138项及属性完整保留。新增 `mafa-survivor` 与已有另一仓库 `mafa-survivor-game` 分开记录。
- 真实浏览器检查新增卡片的WebP图片、简介和Repo／Demo地址；点击Demo进入正确子路径及alpha.36。GitHub Homepage回读为同一地址。
- Profile `holynova/holynova` 的 `main` 提交 `a2a7fd55e90061a41a3ddbc91e2ba41a688998a1`：公开渲染的项目行、真实缩略图及Repo／Demo链接已验证。
- 额外请求旧项目 `/origami-studio/` 遇网络超时，未记为页面回归通过；已通过JSON完整比较确认旧条目和链接没有变更。

职业／章节平衡仍有alpha.35的已知限制，本次不宣称修复通关平衡。旧Pages沿用原已发布版本作回退，不表示与Cloudflare的alpha.36同步。
