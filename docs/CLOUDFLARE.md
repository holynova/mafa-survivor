# Cloudflare 子路径发布

## 最新发布：alpha.49（2026-11-17）

- 游戏main：d6184b62ad94c14bc10e068740317099e9a7e4f8；作品集master：b52d08e92be627e34f8f18cd61dadc88bffa98ab。
- 共享Worker：xiaosang-portfolio；version ID：6ed3dac0-b0fa-4b91-8974-5a7fde68e36c；地址https://xiaosang.cc/mafa-survivor/?survivor，original，builtAt2026-11-17T13:02:51.886Z。
- 1245测试、构建/原图校验、版本/README及Source checks44088827056通过；dry-run与部署通过，5文件上传/19935复用，完整共享项目产物保留。
- 线上旧存档恢复、自然升级、战斗原图与半月刀光截图、暂停保存退出通过；五项存储恢复、Ego101关闭。完整作品集JSON及图库/吴军回执匹配，卡片截图和Demo正确，Homepage/README/二维码沿用。作品集旧Pages例外仍保留，详见QA.md。

以下为发布约定与历史记录。

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

## alpha.45 阶段测试版发布（2026-11-17）

- 构建源码main `41fd6411b03913a7cb7cbf7daa309a2c37aa1163`，v0.1.0-alpha.45/original；作品集master `4c21a5fe77a7340f899b0e84af04ee53b824d84e`。
- 共享Worker xiaosang-portfolio，version ID `7425bbf4-d40f-4be8-b8bf-530cc2c5afa3`。现有Node24/Wrangler4.128.0，完整共享站点dry-run与deploy通过；上传6文件，19931复用。保持既有main/master手动子路径发布。
- 本地111文件/1226测试、素材与构建、README与版本校验通过。首个CI44074182558道士长局超20秒（其余1225通过）；改既有Source checks为maxWorkers=1，保留全部断言和20秒限制，CI44074633842全部成功。该CI四项长局合计12.671秒，本地串行完整23.77秒；不将测试执行时间当游戏性能预算。
- 作品集check-demo-links仍报告上游web-motion-showcase既有Pages例外，保持2ed9181决定，没有改链接或放宽检查；verify-data-source通过。未改其他项目或.impeccable。README、QR、作品卡片截图/链接和Homepage已满足并复用；Profile不在本次范围。
- 线上HTTPS版本与完整SHA一致，页面可见alpha.45，production __MAFA__为undefined。390px实际选择道士/骷髅，开局唯一1级技能、16秒召唤已满，管理面板显示火符与神兽两项主修且均0/8，说明没有免费赠送；保存退出通过。解锁是roleBest=300界面夹具，不冒称自然5分钟测试。
- 已查看alpha45-online-guide-390.png、alpha45-online-battle-390.png。线上repos.json与master完整结构相等，作品卡片currentSrc为390×844 WebP且Demo正确；图库ee4df095/1.0.2和wujun1897dda/1.0.2发布前后完整receipt相同。
- 五项线上存储在导航退出游戏后精确恢复true，独立Ego89关闭；无遗留测试服务。
- 仍未完成：后两章/多构筑/真人平衡、物理键盘/实体手机性能与操作、独立环境声与其他章节事件等；完整范围保留在OPTIMIZATION-ROADMAP，不把本次发布当全目标完成。

## alpha.46 阶段测试版发布（2026-11-17）

- 构建源码main `06f9bb4e0287043b43ab08158978819dfaaed599`，v0.1.0-alpha.46/original；作品集master `24e5771ee627379da2dbd87cdc7f48817d4db631`。共享Worker xiaosang-portfolio version ID `b8bb5d09-1883-400d-9b69-b129e09c589c`。
- 1230测试、素材校验、生产构建与README/版本校验通过；Source checks 44077301005成功。沿用现有Node24/Wrangler4.128.0，完整共享站点dry-run与deploy通过；9文件上传、19931复用，组装文件数19972。新增三MP3来自同一授权固定源，无其他项目改动。
- 作品集数据源检查通过；check-demo-links保留上游web-motion-showcase Pages例外，没有弱化检查或修改无关链接。.impeccable未动；README/QR/Homepage/作品卡片截图与链接已满足并复用，Profile不在范围。
- 真实线上版本与SHA匹配。Ego92逐章实际按钮开普通新局：盟重B300时间0.844626秒/时长149.021406，沃玛BD02时间0.823527/190.901875，赤月BD99时间0.838821/146.255469；三者paused=false、readyState=4、URL带本次SHA。以透传原play函数的临时观察器记录真实media，不调用开发game对象或更改播放行为。
- 三章实际暂停后media全部paused，保存退出后全部src移除；已查看alpha46-online-{mengzhong,woma,redmoon}-390.png。此检查证明部署文件/实际播放链路，不声称耳机/手机/单声道主观听感通过。
- 六项线上存储（普通局、进度、战绩、引导、诊断、声音）已在退出并导航作品集后精确恢复true；临时play观察器已还原，Ego92已关闭，无临时dev服务。
- 线上repos.json与发布master完整结构一致；卡片Demo正确、currentSrc为390×844原WebP。图库ee4df095/1.0.2和wujun1897dda/1.0.2前后完整receipt相同。
- 完整优化目标仍未完成：其他章节事件/平衡、独立环境声、Boss专曲与压力编排、实体设备操作/性能及听感等继续按路线图推进。


## alpha.47 阶段测试版发布（2026-11-17）

- 构建源码main `a08127694052e3637cd15dd89bddf08c9b4dc69e`，v0.1.0-alpha.47/original；作品集master `1701c3fe593fdc64e8338232e7720d72145acf81`。共享Worker xiaosang-portfolio version ID `4ef5f62f-11f9-42f8-ad33-e48fbbb02554`。
- 1242本地测试、素材/类型/生产构建与README/版本校验通过；Source checks44081158258成功。完整共享站点dry-run/deploy成功，6文件上传、19934复用，组装19972文件。沿用Node24/Wrangler4.128.0及main/master手动子路径流程。
- 线上version.json完整SHA匹配，production __MAFA__不存在。Ego95通过实际继续上局/继续战斗按钮恢复白日门最终首领存档夹具，390px显示“北 · 视线受阻”，无横向溢出，暂停与保存退出通过。夹具明确是离线真实Game生成的合法恢复状态，不是自然20分钟通关或平衡证据。首次截图HUD图片尚未解码，等待实际img.decode与两帧后重拍alpha47-online-bearing-390.png并查看，原版人物/首领/地貌/HUD完整。
- 退出并导航同源作品集后，五项run/progress/records/guide/diagnostics原始存储精确恢复true。Ego95已关闭，无临时开发服务。
- 线上repos.json与master完整结构相等；作品卡片Demo正确、390×844 WebP解码成功；图库ee4df095/1.0.2与wujun1897dda/1.0.2回执前后完整相等。Homepage、README、QR与卡片材料已满足并复用，Profile不在范围。.impeccable保留未动。
- 作品集数据源检查通过；check-demo-links继续报告上游web-motion-showcase的既有Pages例外，未改其他项目或放宽检查。
- 此次提供首领方位和观测可靠性改进，没有调低敌人生命或宣称章节平衡完成；完整优化清单继续执行。


## alpha.48 阶段测试版发布（2026-11-17）

- 构建源码main `b0d4318ecd267b7fd5ff6ef350c38f05fc66d24c`，v0.1.0-alpha.48/original；作品集master `bcccfc3c3c03f21c1900e44017309faa900d37c4`；共享Worker xiaosang-portfolio version ID `78bc3af9-05d1-440b-8cf6-73f96768a795`。
- 1245测试、素材校验/类型/构建与README/版本校验通过；Source checks44083970887成功。完整共享站点dry-run/deploy通过，5文件上传、19935复用，19972组装文件。继续使用既有main/master手动子路径发布，无新部署分支或Action。
- Ego97线上version与完整SHA匹配，production __MAFA__不存在。实际恢复原17.7667秒旧战士存档；CDP触摸使dragging=true/摇杆30px，切横屏触发暂停并清理拖动。恢复后时钟到18.1秒，存档角色仍(1104,768)、moving=false。后续新触摸实际推进至18.6833秒，角色右移到(1138.1667,768)，touchCancel后暂停/保存退出成功。读的是实际保存状态，没有开发对象注入或免费属性。
- 两次工具调用之间默认视口重置导致再次暂停；第一次找暂停按钮未找到后重新读取确认paused，没有绕过暂停。此为浏览器协议触摸/方向切换证据，不等于实体手机及物理D键验收。
- 已查看alpha48-online-rotation-844.png、alpha48-online-restored-390.png。暂停界面及恢复HUD/原版地形正常，人物位于树冠遮挡区，未将此截图称为人物完整动作/遮挡对比验收。手机画面清晰度矩阵仍按路线图推进。
- 原五项run/progress/records/guide/diagnostics在导航退出游戏后精确恢复true；Ego97已关闭，本轮无临时dev服务。
- 线上repos.json与发布master完整结构相等；卡片Demo正确、390×844 WebP正常解码，Homepage正确。图库ee4df095/1.0.2、wujun1897dda/1.0.2完整回执前后一致。README、二维码、卡片材料沿用，Profile不在范围，.impeccable保留。
- 作品集数据源检查通过；check-demo-links保留上游web-motion-showcase旧Pages例外，不改无关项目或弱化检查。此次不改变战斗数值，整体优化目标尚未完成。
