# 玛法幸存者

网页优先的单机 2D 幸存者游戏，使用 Phaser 3、TypeScript、React、Vite。以完整 GDD V1.0 为需求基线，当前可选法师（14 技能）与战士（6 技能），共享独立普通攻击和六槽构筑。

## 本地试玩

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/import-assets.py
npm run dev
```

默认地址：[http://127.0.0.1:5178/](http://127.0.0.1:5178/)。开发界面有正常局（12×75 秒）和短局试玩（3×35 秒）；商店与升级暂停计时。

素材导入脚本需要 Python 3 与 Pillow。推荐隔离环境：

```sh
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/import-assets.py
```

本机已完成依赖安装与素材导入，可直接运行 `npm run dev`。`npm run assets:fetch` 使用 PATH 中的 Python；未激活虚拟环境时请用上面的显式路径。

## 当前可玩内容

- WASD / 方向键移动，触屏拖动移动，边界与场景物件碰撞。
- 战士完整 6 技能池、半月与刺杀方向判定、攻杀/烈火蓄力、手动冲撞和撞墙反伤。
- 三攻/防御/魔御区间、准确与幸运规则、职业装备过滤；普通攻击不占技能槽。
- 法师完整 14 技能池，技能升级与通用属性三选一、6 槽替换、手动瞬息移动和诱惑宝宝。
- 稻草人、多钩猫、钉耙猫、半兽人、骷髅精灵；近战追逐、攻击预警、伤害、经验与金币。
- 12 波计时、波间商店、刷新、锁定、购买、自动穿戴与卖出；8 个装备槽与无格叠加道具。
- 最终 Boss、胜负结算、每技能伤害统计、IndexedDB 本机战绩。
- 固定 60 Hz 战斗步长、可复现种子、空间哈希、精灵复用、掉落数量限制。

这是开发预览，尚未达到完整游戏验收。道士、完整地图、复杂 AI、装备外观联动、音频、平衡与发布工作见 [进度与缺口](docs/STATUS.md)。

## 验证

```sh
npm test
npm run assets:check
npm run build
```

- `tests/game.test.ts`：技能、经济、幂等结算、软硬上限与波次转换。
- `tests/warrior.test.ts`：职业与装备过滤、普攻和蓄力、方向限制、冲撞碰撞、伤害区间与幸运。
- `tests/save.test.ts`：IndexedDB 事务、并发重复结算与持久化。
- `tests/long-run.test.ts`：固定种子的机器人战斗回归；用于查卡局与数据错误，不能代替人工平衡测试。
- `docs/QA.md`：浏览器操作和截图验证记录。

`npm run build` 是本地验证构建，不代表素材获准发布。`npm run build:release` 会执行素材授权门禁；当前应返回 `BLOCKED_BY_ASSET_RIGHTS`。

## 美术与需求来源

需求来自 ChatGPT 聊天[《传奇幸存者策划方案》](https://chatgpt.com/c/6adeb457-b830-83e9-99fa-85fe46937cc2)，2026-10-26 导入：

- [完整 GDD V1.0](docs/GDD.md)：优先依据，包括原版美术规范。
- [设计数据 V0.9](docs/design-data-V0.9.json)：原聊天数据草案，保留原始内容；运行时由 `src/content.ts` 选取当前已实现子集并校验。
- 原始图片来自 [etorth/mir2x_res](https://github.com/etorth/mir2x_res)，固定提交 `9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6`。参考客户端为 mir2x 的 1.45 语境，不能标为已核准的 1.76 全量素材。
- [资产登记表](docs/asset-manifest.json) 记录每帧源路径、哈希、偏移及动画；资产导入仅做无损图集整理，不使用 AI 生成的传奇风替代图。
- [素材来源与授权状态](docs/ASSETS.md)。原始图片及缓存不纳入 Git；目前没有已核实的第三方原作分发授权。

## 工程边界

`src/game.ts` 与 `src/rules.ts` 管理可序列化规则；`src/renderer.ts` 将状态映射到 Phaser 图像；`src/App.tsx` 管理 DOM 菜单和面板；`src/save.ts` 使用 IndexedDB 事务保存战绩。React 不逐帧驱动战斗；UI 约每 100 ms 更新。

开发版 `window.__MAFA__` 是浏览器 QA 的模拟句柄，生产构建不暴露它。不要将此调试入口当作正式游戏 API。
