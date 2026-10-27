# 原始素材台账

## 已接入

源仓库：[etorth/mir2x_res](https://github.com/etorth/mir2x_res)，固定提交 `9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6`。导入 4,173 帧，622 组动画，分成 8 张最大 2048×4096 的图集。图片本体仅无损合并为纹理图集，不重绘造型、颜色或动作。转换脚本 `tools/import-assets.py` 校验 Git blob SHA-1，并记录 SHA-256。

| 对象       | 源路径/映射依据                                                  | 当前覆盖                                               |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 法师形象   | texture/hero；男性、dress=4；mir2x itemrecord 中的魔法长袍（男） | 八方向站立、行走、施法、普攻、受击、死亡；固定外观     |
| 战士形象   | texture/hero；男性、dress=3；重盔甲（男）shape=3                 | 八方向站立、行走、施法、普攻、受击、死亡；固定外观     |
| 稻草人     | texture/monster；lookID 0x28                                     | 八方向站立、行走、攻击、受击、死亡                     |
| 多钩猫     | texture/monster；lookID 0x26                                     | 同上                                                   |
| 钉耙猫     | texture/monster；lookID 0x27                                     | 同上                                                   |
| 半兽人     | texture/monster；lookID 0x16                                     | 同上                                                   |
| 骷髅精灵   | texture/monster；lookID 0x24                                     | 同上；战斗行为目前为基础追击                           |
| 火球术     | texture/magic；0x1A4 起，16 方向，每方向 5 帧                    | 原始飞行帧；施法/爆裂完整组合尚未接入                  |
| 雷电术     | texture/magic；0x5AA 起，5 帧                                    | 原始落雷效果                                           |
| 火墙       | texture/magic；0x398 起，5 帧                                    | 复用原始帧组成范围区域                                 |
| 魔法盾     | texture/magic；0x352 起，3 帧                                    | 原始持续帧；开启/结束帧待补                            |
| 地面与装饰 | texture/map；源 Tilesc / SmObjectsc 目录编码                     | 原始瓦片、枯木、路牌、灌木；当前为重新排列的小型竞技场 |
| 装备与金币 | texture/item；对应源 common/src/itemrecord.inc 的 pkgGfxID       | 海魂、偃月等已核对图标；见逐帧 manifest                |

编码与偏移的参考实现：

- [hero.cpp](https://github.com/etorth/mir2x/blob/main/client/src/hero.cpp)
- [clientmonster.cpp](https://github.com/etorth/mir2x/blob/main/client/src/clientmonster.cpp)
- [monsterrecord.inc](https://github.com/etorth/mir2x/blob/main/common/src/monsterrecord.inc)
- [magicrecord.inc](https://github.com/etorth/mir2x/blob/main/common/src/magicrecord.inc)
- [pngtexoffdb.cpp](https://github.com/etorth/mir2x/blob/main/client/src/pngtexoffdb.cpp)
- [itemrecord.inc](https://github.com/etorth/mir2x/blob/main/common/src/itemrecord.inc)：图标字典的源文件 SHA-256 保存在 tools/item-icon-map.json。

这些链接用于解释映射，不表示目标 1.76 素材已经全部核准。资源包沿用 mir2x 的 1.45 参考语境。

## 尚缺

- 14 法师技能均已接入来自 magicrecord 索引的运行帧；全职业正式技能图标，以及部分技能的启动/命中/结束组合仍需补齐。
- 武器、头发、头盔与人物分层联动；当前装备改变战斗数值，不改变角色外观。
- 玻璃戒指、六角戒指在该源字典中未找到同名映射，当前显示明显的中性几何占位，不冒认其他戒指贴图。
- 新增无格道具没有原版对应物，当前使用中性几何标记；经验微光为程序圆点标记。它们属于开发占位，未使用生成式图片。
- 完整原版地图层、地形遮挡、矿洞和寺庙；当前地图物件与原版瓦片仅组成玩法试验场。
- 三职业完整动作阶段、武器/头发/头盔联动、剩余音效和音乐。现已接入 28 个原版 WAV、29 个事件映射；神兽喷火在当前源记录中没有可核验音效映射，未冒用其他声音。

## 权利状态

当前统一标记 `UNVERIFIED_THIRD_PARTY_ART` / `LOCAL_EVALUATION_ONLY`，发布状态 `BLOCKED_BY_ASSET_RIGHTS`。

候选仓库可下载、附带的开源许可证和解析器代码许可证，不等于传奇原作美术的分发授权。尚未取得可核实的原作权利依据；原始图片、图集、缓存不上传仓库或托管服务。

`npm run build` 只生成本地验证目录；`npm run build:release` 在缺少权利确认时退出失败。后续发布必须逐项核实使用范围；若无法取得许可，按 GDD 向产品负责人列明缺口，不能擅自改画风。

逐帧机器清单另提供 `docs/asset_manifest.csv` 和 `data/assets.json`。源包 LICENSE 原文保存在 `docs/licenses/mir2x_res-LICENSE.txt`，随本地图集保留 `SOURCE_LICENSE.txt`；这不代替第三方原作权利核验。

新增运行帧：抗拒火环 0x5A、诱惑之光 0xA、地狱火 0x76C、瞬息移动 0x6E、爆裂火焰 0x3B6、地狱雷光 0x010003D4、圣言术 0x8C、冰咆哮 0x30C、疾光电影 0x0100049C（八方向）、大火球 0x668（十六方向），均依据已检查的 mir2x magicrecord.inc 映射；权利状态继续为 permission_pending。

战士新增原始运行帧：攻杀剑术 0x546、刺杀剑术 0x140、半月弯刀 0xE6、烈火剑法 0x5BE；各 8 方向、每方向 6 帧、方向步长 10。依据 magicrecord.inc 的 gfxID/frameCount/gfxIDCount/gfxDirType；野蛮冲撞源记录没有独立 magic gfx，当前使用原人物动作与位置变化，不冒用法师火焰。新增战士装备和六种技能书图标来自相同 itemrecord 字典。武器/头发叠层与装备外观变化仍未完成。

本轮参考源文件的内容哈希及 URL 归档于 `tools/asset-mapping-references.json`，用于追踪编码与技能索引依据；它们不能代替原作美术权利证明。

## 2026-10-27 画面与音效修复

- 人物图不是单层完整图片。源 hero.cpp 同时绘制 bodyLayer0 与 bodyLayer1；导入阶段按同一偏移无损合成，816 个有人物衣服叠层的动作帧均逐像素对照原始两层通过。`layers` 字段与 CSV `source_layers` 保存每层原路径和哈希。
- 原地图物件是 48 px 宽的竖条，不能孤立当成完整树木。现在解析固定资源提交中的 `map/0.bin`（zstd+cereal），采用源区域 x552/y432、46×48 格，保留瓦片、物件竖条与通行数据。552 块地面、源布局的 631 条物件条带按原坐标组装；具体实时计数以 manifest.world 为准。地面先绘入一张 Canvas 纹理，消除独立图集瓦片的采样接缝。人物被树冠遮挡时降低遮挡条带透明度。
- 音效来自相同固定资源提交的 `sound/seff`，WAV 原文件未改编码。`docs/audio-manifest.json` 记录 28 个 WAV 的 SHA-1/SHA-256 与 29 个映射；magicrecord 的 seffBase/引用关系按源格式解析。人物脚步、挥砍、受击来自 hero.cpp 的明确索引。所有音效仍是本地验证，权利状态未变。
- 版本是 mir2x 参考包语境；原地图区域的恢复不等于全部章节地图和 1.76 版本验收已完成。
