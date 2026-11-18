# 旧城铜铸界面素材

素材位于 `src/assets/bronze/`，用于连续生存入口的 React 界面。战斗地图、角色和敌人继续由 Phaser 绘制。

## 方案 1 设计稿

选定的方案 1 设计图由本项目会话生成，生成记录为 `exec-e1969729-66ac-4b59-8b52-a769fbdc4ee1`。项目中的切片裁自该图稿，按用途清除了示例文字或数值，并保留了可伸缩边框或透明底。

| 文件 | 用途 |
| --- | --- |
| `lobby-gate.webp`、`lobby-title.webp`、`lobby-floor.webp` | 大厅背景、题字与地面 |
| `panel-frame.webp`、`panel-surface.webp`、`entry-frame.webp` | 弹窗铜框、内底及列表铜边 |
| `button-gold.webp`、`button-dark.webp` | 主操作与次级操作的按钮材质 |
| `clock-plaque.webp`、`title-plaque.webp`、`result-plaque.webp`、`boss-frame.webp`、`pause.webp` | HUD 和页面标题铭牌、首领框与暂停按钮 |
| `health-orb.webp`、`health-orb-empty.webp` | 生命球的充填和空态 |
| `icon-*.webp`、`skill-cleave.webp`、`skill-firesword.webp`、`charm-edge.webp` | 设计稿里的战士、设置、结算、半月弯刀、烈火剑法和锋锐戒指图标 |
| `illustration-{bairimen,biche,mine,shimu,woma}.webp` | 设计稿对应章节的菜单插画 |

## 现有游戏截图与图集

以下章节缩略图以 alpha.52 的项目手机视口实拍为源，裁切并缩放至 300 × 125。坐标采用原始截图的左、上、右、下顺序，单位为像素。

| 文件 | 源截图 | 裁切 |
| --- | --- | --- |
| `chapter-centipede.webp` | `16-centipede.png` | 0, 74, 310, 204 |
| `chapter-mengzhong.webp` | `15-mengzhong.png` | 24, 476, 384, 626 |
| `chapter-redmoon.webp` | `21-redmoon-valley.png` | 2, 88, 362, 238 |
| `chapter-stone.webp` | `20-stone.png` | 0, 36, 360, 186 |
| `chapter-zuma.webp` | `19-zuma.png` | 28, 67, 388, 217 |

装备页角色正面站姿、武器层及装备槽图标通过 `drawSurvivorArt` 读取当前 Phaser 已加载图集。角色外观与装备来自游戏状态，其来源沿用项目的 [原版素材清单](asset-manifest.json) 和 [授权记录](asset-authorization.json)。

章节页全高底图 `chapter-background.webp` 来自同一组 alpha.52 实拍中的比奇郊外截图。裁下原场景并以附近地面像素覆盖角色、触控圈和浏览器浮标，独立保存为 390 × 708 WebP 供菜单使用。
