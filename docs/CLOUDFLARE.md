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


## alpha.38 发布核验（2026-11-16）

- 新版入口：https://xiaosang.cc/mafa-survivor/?survivor；原版入口 https://xiaosang.cc/mafa-survivor/ 保留。
- 应用版本 v0.1.0-alpha.38，构建源码 main `6b0ef5a9d2f6139427256bb1c3e7e42af88a5c9f`；文档后续提交不改变产物来源。
- 游戏及作品集更新提交 `f2f7bbf55fab4a945e4f552ab8571b2affcd8d07`；发布前合入其他项目的最新更新，实际发布作品集 master 快照 `0196a82e241b6ce5a2dc3d3749f6c98d4d29aba7`，使用干净 detached worktree。
- 共享 Worker `xiaosang-portfolio` 手动部署成功，Cloudflare version ID `2e0300a7-e7c9-4458-a616-1e59a2398a92`。游戏与作品集共用此部署，不另建 Worker。
- 共享图库保留版本 1.0.2 / `ee4df09520706aac342e9324356858ab15d9a825`，3666 originals、11898 media 文件；本地缺少的 _headers 从同提交源文件恢复到独立 staging，未修改图库源目录。线上 release.json 与发布前一致。
- 发布前 80 文件 / 772 测试通过；资源、音效、类型检查、生产构建、README/版本校验、作品集数据校验及 Wrangler dry-run 通过。旧 Pages 沿用原版本作为回退，未触发标签部署。
- HTTPS 线上 version.json 的版本、SHA、original 模式核对通过；分享截图、半月技能图标请求成功。390×844 真实浏览器进入战士战斗，人物/地面/底部 HUD 截图已查看；页面宽度390，无横向溢出，生产版无 __MAFA__ 调试对象。
- 线上暂停、保存退出、原版主菜单与新版跳转入口已检查。分享 PNG 成功下载并查看，1080×1380，二维码经 Vision 解码为新版完整 URL。
- GitHub Homepage 回读为新版 URL；作品集线上 JSON 的简介、截图和 Demo URL 已更新，卡片图片已加载（naturalWidth1440），Repo/Demo 目标正确。GitHub Profile 本次不在范围。
- alpha 阶段平衡限制仍见 SURVIVOR-PACING-REVIEW.md；本次短时浏览器验收不代表全地图真人通关或性能压力测试。

## alpha.39 全技能修复发布（2026-11-16）
- 构建源码 main `1bffb3188398ef31851502f1e203762c8215defa`；作品集 master `6e594250a237470f727f75b63aa7fcb782bff587`。仅更新游戏子目录，原有 Repo/Demo/二维码/作品集条目复用。
- Worker `xiaosang-portfolio`，version ID `9838c7ec-5f53-4a98-9aa8-e28bb2a4c1b8`；干净主分支提交的 detached worktree 手动 dry-run / deploy 成功。线上 version.json、build-source.json 返回 alpha.39 / 对应 SHA；图库 release.json 保持1.0.2/ee4df095。
- 全量1087项中1084通过、3项长模拟并发超时；针对这3个文件单worker复测82项全部通过，未调整测试超时或跳过断言。新增技能审计315项通过；资源检查、类型检查/生产构建、版本验证、作品集校验、GitHub Source checks通过。既有大包提示保留。
- 新入口仍为 https://xiaosang.cc/mafa-survivor/?survivor，原版入口保留。线上390×844真实浏览器查看alpha.39大厅与群体治疗成长图鉴，70%/80%条件已同步，宽度390，无调试对象；截图 `.artifacts/skill-audit/online-alpha39-growth.png` 已查看。
- 逐技能施法截图与行为断言在本地相同源码完成；线上没有强行注入生产存档或调试对象来伪造技能解锁，不宣称已在公网正常局逐项随机抽到33技能。完整结果见 SKILL-AUDIT.md。


## alpha.40 精英首领与构筑管理（2026-11-17）
- 构建源码 main `326e00f045c576c6fe7e9d24ad241254ab226631`；作品集 master `b3feca0d245dad33a9dd06b1217170a208f68d12`，保留其上其他项目的最新提交。
- Worker `xiaosang-portfolio`，version ID `571733c2-f66b-47b9-aa9b-99c77dca23f4`；同一干净主分支快照的 detached worktree 手动 dry-run/deploy 成功。线上 version.json 为alpha.40、对应SHA、original素材。图库release.json仍为1.0.2/ee4df095。
- 1099测试、素材、类型/构建、README/版本校验、作品集数据校验与GitHub Source checks通过。旧Pages不触发标签部署，域名/二维码/Repo/Demo条目复用。
- 390×844线上继续已有17秒战士存档，暂停技能管理显示图标、替换为1级/清除进化说明、最后一个技能不可移除；页面宽度390，无调试对象。截图 `.artifacts/alpha40-online-skills.png` 已查看；公网没有注入测试对象强行生成Boss，战斗预警与换装由同源码本地场景验收。
- 本轮原生D键位移自动断言未通过，完整职业/章节平衡仍需真人反馈，详情见QA。独立Ego测试空间33已finish({keep:[]})关闭，用户原页面保留。


## alpha.41 第一批基础优化（2026-11-17）
- 构建源码 main `9e31033997c6dfdccec75d8d51b904bc1fad17c3`；作品集 master `5c0e1f3a736a15fe19e4ae611e3a1aedf1e85203`。
- Worker `xiaosang-portfolio` version ID `523caedc-9789-40e4-b51c-abb3f708fce3`。完整共享站点从干净master快照手动dry-run与deploy；图库仍1.0.2/ee4df095，沿用当前staging脚本保留作品集与wujun等项目。
- 1104测试、资源/类型/生产构建、README/版本校验与Source checks 44033244539成功。HTTPS version.json匹配alpha.41/SHA/original。
- 390px线上恢复原17秒战士存档、保存并退出均正常，宽度390/viewport390，无调试对象，无存档错误提示；alpha41-online-resume.png已查看。本地十章回收与重载见QA。
- 独立Ego空间52已关闭，本次5186临时服务已停止，用户页面保留。发现发布暂存目录引起开发HMR风暴，随后仅调整Vite开发监听忽略.artifacts/.cache；该配置不影响已部署生产产物，不因此重部署。
- 整体最佳实践改版尚未完成；第一批只做资源回收/存档开销，首屏拆包和真机性能仍待办，详见OPTIMIZATION-ROADMAP。

## alpha.42 资源拆包与音频预算（2026-11-17）
- 构建源码main `8175ae8da853e0e5bc9ba66925214bb8982a448d`；作品集master `7a79cfa026a6e0ad1e46f7ed347efe168d307c72`。
- 共享Worker xiaosang-portfolio，Cloudflare version ID `70be5e69-d6e2-4d9a-b9e4-d835c5d561ab`；完整共享站点干净快照dry-run/deploy通过，画廊仍1.0.2/ee4df095，wujun仍1897dda，其他作品集条目未改。
- 1107项测试、原版像素/素材校验、类型/生产构建、README/版本校验及Source checks 44035991845通过。
- HTTPS version.json对应alpha.42/SHA/original；390px生产恢复原17秒战士存档，保存退出正常，无横向溢出、无生产调试对象；alpha42-online-resume.png已查看。
- 一次等待“开始游戏”超时是验收选择器错误：有存档时实际按钮是“另开新局（覆盖存档）”，不是游戏加载失败；纠正后从“继续上局”验收。
- 原生D键工具未向页面产生可观测keydown事件，仍未宣称原生键盘验收通过。像素预算不是实际手机显存，硬件压力及后续玩法/视听阶段继续待办。
- Ego测试空间56关闭，临时5186服务停止；域名、二维码、README截图及收录沿用，用户页面保留。


## alpha.43 阶段测试版发布（2026-11-17）

- 游戏main构建源码：58002165e12348a9b4ea0d8fc856ec1bce17b7e8；作品集master最终来源：ee20ab73ae8a202741f3afcec1217572c3793134。复用子路径https://xiaosang.cc/mafa-survivor/?survivor，无Pages标签或新工作流。
- 共享Worker xiaosang-portfolio，首轮成功version ID 2cdfaf07-f3c6-4f97-b9ad-53fa18f5158a；补齐作品集实际使用的WebP后最终ID c643b44f-eedf-445a-9d7f-7a50d791295b。游戏产物及版本未因缩略图再变化。
- 保留并合并作品集并行更新（首次push因远端前进被拒，未强推）。完整共享站点19969源文件/20365扫描文件；画廊1.0.2/ee4df095、wujun1.0.2/1897dda线上版本保持。用户未跟踪.impeccable/未动。
- Node26下上传报TypeError this._handleRejection is not a function且未退出；中断/TERM无效后仅结束已确认本任务父子PID，确认exit137，线上仍alpha.42。系统Node22缺动态库，未改系统；使用既有ChatGPT内置Node24.22.1运行同一锁定Wrangler4.128.0成功部署。没有升级Wrangler。
- 1190测试、assets:check/release build、README/版本校验及Source checks 44060417781通过。线上version.json与alpha.43/SHA/original一致；GitHub Homepage正确复用，二维码目标未变，README截图/作品集PNG及WebP同步。
- 390px生产旧17秒战士存档恢复成功；实际半月1→2→3、保存退出成功，HUD按钮44×44、无横向溢出、无存档错误、无生产__MAFA__调试对象。alpha43-online-resume-390.png已查看，原版人物/半月刀光/树林/HUD完整。
- 首次等待HUD超时因恢复后停在暂停；后续等图阶段推进到了下一次升级。最终对当前HUD图片调用decode并等两帧后截图成功，不将最初缺图截图算作通过。未据此宣称原生D键或全部手机硬件通过。
- 线上测试前备份run/progress/guide/diagnostics四个键，退出游戏到同源作品集后逐键精确恢复并验证。作品集实际WebP 390×844、Demo链接及卡片截图通过；空间80已关闭，本轮未启动临时dev服务。
- 本版公开供阶段测试，整体最佳实践目标尚未完成。平衡/实机性能/触控/听感、章节事件、横向解锁及独立环境声继续见OPTIMIZATION-ROADMAP。


## alpha.44 阶段测试版发布（2026-11-17）

- 构建源码main `3ad11228526d30968376a44813104935628a596d`，版本v0.1.0-alpha.44/original；作品集master `665d2389fcead3343d4d0f675669a1253defc8e1`，合入最新2ed9181并保留其他项目变化。
- 共享Worker xiaosang-portfolio，version ID `395653b5-9fdd-40af-aadb-ad943317c5e8`；使用现有锁定Wrangler4.128.0和已验证Node24执行完整共享站点dry-run/deploy，未新建分支或部署Action。图库ee4df095/1.0.2与wujun1897dda/1.0.2发布前后相同。
- 1216本地测试、素材/类型/生产构建、README及发布版本校验通过。Source checks44068183563首次1215通过/1项长模拟20.9秒超过20秒；本地单worker4项复测通过，原作业attempt2全量测试及构建成功。未放宽断言/超时。
- 作品集数据源检查通过。check-demo-links因最新上游2ed9181将web-motion-showcase显式恢复GitHub Pages地址而失败；保留这一无关更新，不修改其链接或检查器伪造通过。本次mafa Repo/Demo正确，在线repos.json与发布master逐值完全一致。
- HTTPS version.json匹配alpha.44/完整SHA/original。真实浏览器恢复17秒旧战士存档、继续战斗、半月1→2、诊断下载、保存退出20秒成功。390px战斗截图alpha44-online-battle-390.png已查看；后续升级/下载调用恢复桌面1920px，不能将全部交互写成390px触摸验收。生产__MAFA__不存在。
- 下载alpha44-online-diagnostic.json含journalStorage：正常局，4次实际写入/0失败，p95/max0.3ms（短局桌面样本，不是性能预算）。本地悬赏与转角专场见QA；线上未等到2分钟或注入对象强制验证悬赏，不冒称公网全关验收。
- 作品集首次仅显示12条，等待游戏链接超时后通过现有搜索显示项目；Demo为新版子路径，实际WebP390×844加载成功，素材/二维码/README沿用。备份四个指定存储键，保存退出后导航同源作品集逐键精确还原并核验。空间85已关闭，本轮没有启动本地服务。
- 本版可供用户阶段测试，石墓/白日门平衡、横向解锁、其他章节事件、独立环境声、实体手机及听感等仍按完整路线图开发。
