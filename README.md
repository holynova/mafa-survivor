# 玛法幸存者

网页优先的单机 2D 幸存者游戏，使用 Phaser 3、TypeScript、React、Vite。以完整 GDD V1.0 为需求基线，当前可选法师（14 技能）、战士（6 技能）与道士（13 技能），共享独立普通攻击和六槽构筑。

## 本地试玩

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/import-assets.py
npm run dev
```

默认地址：[http://127.0.0.1:5178/](http://127.0.0.1:5178/)。开发界面有正常局（12×75 秒）和短局试玩（3×35 秒）；商店与升级暂停计时。

首页新增「快速测试模式」：默认无敌，可刷怪/Boss、装配六槽技能、清冷却、增加金币、跳到商店/下一波、1/2/4 倍速、切换人物动作与八方向，并直接更换真实武器和衣服。面板显示坐标和实际按键事件，可直接检查 D 键。可开启「自动走位」避敌和拾取，方向键与拖动优先接管；升级和商店仍手动选择。测试局不写入战绩、不发放结晶；「动作检查」会冻结战斗模拟，切回「实战」恢复。

原始资源导入现包括人物双层合成、原地图地面/完整物件布局和原版 WAV 音效。首次安装仍需运行导入脚本；音效在点击出征后解锁，可在战场左下角关闭。

素材导入脚本需要 Python 3 与 Pillow。推荐隔离环境：

```sh
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/import-assets.py
```

本机已完成依赖安装与素材导入，可直接运行 `npm run dev`。`npm run assets:fetch` 使用 PATH 中的 Python；未激活虚拟环境时请用上面的显式路径。

## 当前可玩内容

- WASD / 方向键移动，触屏拖动移动，边界与场景物件碰撞。
- 开局携带木剑；武器/衣服随实际装备切换原版场景模型，人物、怪物与召唤物具备动作阴影。树后以淡色轮廓提示角色位置，树冠保持完整。
- 战士完整 6 技能池、半月与刺杀方向判定、攻杀/烈火蓄力、手动冲撞和撞墙反伤。
- 三攻/防御/魔御区间、准确与幸运规则、职业装备过滤；普通攻击不占技能槽。
- 法师完整 14 技能池，技能升级与通用属性三选一、6 槽替换、手动瞬息移动和诱惑宝宝。
- 道士13技能池，火符／红绿毒、治疗、骷髅与神兽、隐身／增益与困魔；装备面板可切毒及治疗优先级。
- 比奇、矿洞、沃玛、祖玛四个原版场景，22类敌人／四Boss；远程预警、冲锋、雕像苏醒、连段攻击与无奖励援军。正常章节使用结晶解锁，试玩和测试可直接进入。
- 12 波计时、波间商店、刷新、锁定、购买、自动穿戴与卖出；8 个装备槽与无格叠加道具。
- 最终 Boss、胜负结算、每技能伤害统计、IndexedDB 本机战绩。
- 固定 60 Hz 战斗步长、可复现种子、空间哈希、精灵复用、掉落数量限制。

这是开发预览，尚未达到完整游戏验收。三职业多构筑通关、完整章节平衡、高级装备/头发/头盔外观、音频缺口、存档恢复和设备性能见 [进度与缺口](docs/STATUS.md)。

## 验证

```sh
npm test
npm run assets:check
npm run assets:visual-check
npm run assets:audio-check
npm run build
```

- `tests/game.test.ts`：技能、经济、幂等结算、软硬上限与波次转换。
- `tests/warrior.test.ts`：职业与装备过滤、普攻和蓄力、方向限制、冲撞碰撞、伤害区间与幸运。
- `tests/save.test.ts`：IndexedDB 事务、并发重复结算与持久化。
- `tests/long-run.test.ts`：固定种子的机器人战斗回归；用于查卡局与数据错误，不能代替人工平衡测试。
- `docs/QA.md`：浏览器操作和截图验证记录。

`npm run build:release` 校验资源来源与项目所有人的授权记录。Pages 使用 `PAGES_ASSET_MODE=original npm run build:pages`，核验图片、地图和音效记录并生成带版本号的子路径产物。

## 美术与需求来源

需求来自 ChatGPT 聊天[《传奇幸存者策划方案》](https://chatgpt.com/c/6adeb457-b830-83e9-99fa-85fe46937cc2)，2026-10-26 导入：

- [完整 GDD V1.0](docs/GDD.md)：优先依据，包括原版美术规范。
- [设计数据 V0.9](docs/design-data-V0.9.json)：原聊天数据草案，保留原始内容；运行时由 `src/content.ts` 选取当前已实现子集并校验。
- 原始图片来自 [etorth/mir2x_res](https://github.com/etorth/mir2x_res)，固定提交 `9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6`。参考客户端为 mir2x 的 1.45 语境，不能标为已核准的 1.76 全量素材。
- [资产登记表](docs/asset-manifest.json) 记录每帧源路径、哈希、偏移及动画；资产导入仅做无损图集整理，不使用 AI 生成的传奇风替代图。
- [素材来源与授权状态](docs/ASSETS.md)。2026-10-27 项目所有人已明确确认拥有原版授权并要求公开发布，依据记录在 [授权确认](docs/asset-authorization.json)。原始图片及缓存由 CI 导入，不纳入源码 Git。

## 工程边界

`src/game.ts` 与 `src/rules.ts` 管理可序列化规则；`src/renderer.ts` 将状态映射到 Phaser 图像；`src/App.tsx` 管理 DOM 菜单和面板；`src/save.ts` 使用 IndexedDB 事务保存战绩。React 不逐帧驱动战斗；UI 约每 100 ms 更新。

开发版 `window.__MAFA__` 是浏览器 QA 的模拟句柄，生产构建不暴露它。不要将此调试入口当作正式游戏 API。

## GitHub 与阶段测试版本

[源码仓库](https://github.com/holynova/mafa-survivor) · [阶段版本记录](https://github.com/holynova/mafa-survivor/releases)

GitHub Pages 使用 Actions 发布，在线测试地址为 [holynova.github.io/mafa-survivor](https://holynova.github.io/mafa-survivor/)。公开展示版使用原版图片、地图和 WAV 音效；当前公开版本为 **v0.1.0-alpha.8**。

每个阶段通过测试与截图验收后，更新 CHANGELOG、推送递增的 `v0.1.0-alpha.N` 标签；工作流部署成功后自动创建预发布版本。页面显示版本和提交号，可通过反馈入口报告问题。配置与门禁见 [阶段发布说明](docs/RELEASES.md)。

## 真实战斗模拟

```sh
npm run simulate -- --seeds=176,17,991 --maps=biche,mine,woma,zuma --classes=wizard,warrior,taoist --mode=normal --out=.artifacts/simulation.json
```

使用原地图通行夹具、真实1/60秒步进及合法升级／交易，不修改生命、时钟或掉落。报告保存策略哈希、地图源SHA、逐波成长和失败原因；不是人类通关率。运行方式、对照数据和未达标项见[模拟记录](docs/SIMULATION.md)。
