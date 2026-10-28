# 开发路线与进度管理

本项目的进度由 git 仓库、阶段标签、GitHub 预发布、文档证据与 GitHub Issues 共同管理；本文件是总入口。

## 进度载体

| 载体 | 用途 |
|---|---|
| git 提交 | 每次功能／修复／文档单独提交，提交信息说明动机与验证 |
| 阶段标签 | 每个已验收阶段打递增 `v0.1.0-alpha.N`，标签指向包含文档的最终提交 |
| GitHub 预发布 | 每个标签生成预发布，附截图与 JSON 证据；在线版本为 GitHub Pages |
| `CHANGELOG.md` | 面向玩家的阶段变更 |
| `docs/STATUS.md` | 当前公开版本、阶段增量与剩余缺口 |
| `docs/ACCEPTANCE.md` | GDD 验收项逐条状态（已验／部分／未完成） |
| `docs/QA.md` | 每阶段实机步骤、截图与失败记录 |
| `docs/SIMULATION.md` | 同策略矩阵与逐局对照，禁止把36局当10k |
| GitHub Issues + 里程碑 | 未完成工作的可分配条目；里程碑「后续阶段」为候选池 |

## 已发布阶段

全部标签：`v0.1.0-alpha.1` … `v0.1.0-alpha.16`。

| 阶段 | 提交 | 主要内容 |
|---|---|---|
| alpha.13 | `98434ee` | 击杀回复／生命偷取两类续航道具与同策略对照 |
| alpha.14 | `98db73e` | 存档完整导出、文件／粘贴导入预览、原子恢复与撤回 |
| alpha.15 | `06f5fd2` | 承伤归因、敌对穿墙拦截、玛法天赋、波次边界续玩 |
| alpha.16 | `adb2d99` | 技能／装备统计面板：DPS／占比、购买件数、刷新次数、属性标签、战绩展开 |

在线版本：<https://holynova.github.io/mafa-survivor/>（页脚显示版本与提交号）。

## 待办（GitHub Issues）

| 优先级 | 事项 | Issue |
|---|---|---|
| P0 | 战士与矿洞／沃玛／祖玛通关平衡（当前2／36，均为比奇法师） | [#1](https://github.com/holynova/mafa-survivor/issues/1) |
| P1 | 300敌人性能专项与对象池收益 | [#2](https://github.com/holynova/mafa-survivor/issues/2) |
| P1 | 装备使用率与跨局汇总 | [#3](https://github.com/holynova/mafa-survivor/issues/3) |
| P2 | 头发／头盔与6件高级装备外观缺口 | [#4](https://github.com/holynova/mafa-survivor/issues/4) |
| P2 | 公网商店锁／刷新与续玩实操 | [#5](https://github.com/holynova/mafa-survivor/issues/5) |
| P2 | 移动端与窄屏矩阵 | [#6](https://github.com/holynova/mafa-survivor/issues/6) |

新增工作先建 Issue 并挂到「后续阶段」里程碑，再进入阶段开发；完成一项就在对应阶段关闭并附证据链接。

## 阶段验收门禁

1. `npm test`、`npx tsc --noEmit`、`npm run build` 通过；改画面时另跑 `assets:check`、`assets:visual-check`、`assets:audio-check`。
2. 真实浏览器验证并查看截图（ego-browser 独立任务空间），记录到 `docs/QA.md`。
3. 影响战斗时重跑同策略36局，逐局对照写入 `docs/SIMULATION.md`；只增加展示的阶段需说明为何结果应一致。
4. 更新 `CHANGELOG.md`、`docs/STATUS.md`、`docs/ACCEPTANCE.md`、`docs/SAVES.md`（如涉及存档）与版本号。
5. 提交 → 推送 `main` → 打标签 → Actions 的 build／deploy／release 成功。
6. 核对公网 `version.json`、素材哈希与入口 JS，实机试玩并截图，再补写 `docs/RELEASES.md`。
7. 上传截图与 JSON 到预发布，报告版本链接与已知缺口。
