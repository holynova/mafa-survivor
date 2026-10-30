# 原始素材台账

## alpha.25 原生白日门与石墓一层

新增两个独立源地图选区，各46×48格／2208×1536，白日门`Mir200/Map/11.map`取(200,280)，石墓一层`Mir200/Map/d711.map`取(150,160)。原生52／12字节格式按列读取，保留地图索引、物件整条、底部锚点和存储的通行／门状态；安全出生点位于裁剪后最大连通区的3×3空地。当前仅导入静态地貌，未实现原客户端动态门交互与完整环境动画。

地图数据固定`mirbeta/MirServer@f38deae64c521a28f8e0d86f2bf24d4ba7c9ea5c`；导出图固定`fluttergo/mir2-client-js@c2419cb7803cafe5dea2d366c1948480e944cb09`的Tiles.wil、Objects.wil、Objects5、Objects7四个PNG／JSON库。1369帧仅裁剪，不改源像素；8个源文件126,723,091字节保留于导入缓存，浏览器只下载两张新增分章图集。每帧保存源库／稀疏索引／源PNG与JSON哈希／裁剪矩形，另登记地图源提交与SHA-256；门禁逐项核对额外固定源与类型／公开范围，不能用主源身份冒认。

图集JSON数字键与同提交TSX显式图片编号对应；空编号与empty.png也已交叉核对。来源、哈希和版本限制见[研究记录](research/alpha25-original-maps.md)及`tools/native-map-sources.json`。未找到原WIL／转换器，故只能验证本项目与已发布PNG导出矩形的像素一致，不能声称与某官方1.76发行包逐字节／逐像素相同。分发沿用用户既有原版素材公开授权，未引入第三方实现代码或生成素材。

## 已接入

源仓库：[etorth/mir2x_res](https://github.com/etorth/mir2x_res)，固定提交 `9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6`。导入 4,173 帧，622 组动画，分成 8 张最大 2048×4096 的图集。图片本体仅无损合并为纹理图集，不重绘造型、颜色或动作。转换脚本 `tools/import-assets.py` 校验 Git blob SHA-1，并记录 SHA-256。

| 对象       | 源路径/映射依据                                                  | 当前覆盖                                               |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 法师形象   | texture/hero；男性、dress=4；mir2x itemrecord 中的魔法长袍（男） | 八方向基础动作、原阴影；外观随已接入的衣服/武器装备切换     |
| 战士形象   | texture/hero；男性、dress=3；重盔甲（男）shape=3                 | 八方向基础动作、原阴影；外观随已接入的衣服/武器装备切换     |
| 稻草人     | texture/monster；lookID 0x28                                     | 八方向站立、行走、攻击、受击、死亡                     |
| 多钩猫     | texture/monster；lookID 0x26                                     | 同上                                                   |
| 钉耙猫     | texture/monster；lookID 0x27                                     | 同上                                                   |
| 半兽人     | texture/monster；lookID 0x16                                     | 同上                                                   |
| 骷髅精灵   | texture/monster；lookID 0x24                                     | 同上；战斗行为目前为基础追击                           |
| 火球术     | texture/magic；0x1A4 起，16 方向，每方向 5 帧                    | 原始飞行帧；施法/爆裂完整组合尚未接入                  |
| 雷电术     | texture/magic；0x5AA 起，5 帧                                    | 原始落雷效果                                           |
| 火墙       | texture/magic；0x398 起，5 帧                                    | 复用原始帧组成范围区域                                 |
| 魔法盾     | texture/magic；0x352 起，3 帧                                    | 原始持续帧；开启/结束帧待补                            |
| 地面与装饰 | texture/map；源 Tilesc / SmObjectsc 目录编码                     | 恢复原地图森林区域，保留地面、物件条带、通行与前后层 |
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
- 已接入可用武器/衣服场景外观；头发、头盔与人物动作叠层仍需补齐，缺少的高级装备模型见 alpha.4 清单。
- 玻璃戒指、六角戒指在该源字典中未找到同名映射，当前显示明显的中性几何占位，不冒认其他戒指贴图。
- 新增无格道具没有原版对应物，当前使用中性几何标记；经验微光为程序圆点标记。它们属于开发占位，未使用生成式图片。
- 完整原版地图层、地形遮挡、矿洞和寺庙；当前地图物件与原版瓦片仅组成玩法试验场。
- 三职业完整动作阶段、头发/头盔联动、剩余音效和音乐。现已接入 28 个原版 WAV、29 个事件映射；神兽喷火在当前源记录中没有可核验音效映射，未冒用其他声音。

## 权利状态

2026-10-27，项目所有人在本开发会话明确确认：“确认拥有原版授权，直接发布公开版本”。[机器可读确认](asset-authorization.json) 覆盖固定资源提交的图片、地图与音效，以及公开 Pages 和阶段发布。当前标记 `AUTHORIZED_BY_PROJECT_OWNER` / `PUBLIC_PROJECT_DISTRIBUTION`。

公开发布依据为项目所有人的明确确认，不是对原作权利的独立法律核验，也不把源代码许可证冒作素材许可证。原始图片、图集和缓存继续忽略于源码 Git；发布时由 CI 从固定提交导入并部署。

`npm run build:release` 和原版 Pages 构建均校验图片、地图与音效的来源、固定提交及授权范围。仅修改构建变量不能覆盖记录不匹配；后续同范围阶段发布无需重复确认。

逐帧机器清单另提供 `docs/asset_manifest.csv` 和 `data/assets.json`。源包 LICENSE 原文保存在 `docs/licenses/mir2x_res-LICENSE.txt`，随本地图集保留 `SOURCE_LICENSE.txt`；这不代替第三方原作权利核验。

新增运行帧：抗拒火环 0x5A、诱惑之光 0xA、地狱火 0x76C、瞬息移动 0x6E、爆裂火焰 0x3B6、地狱雷光 0x010003D4、圣言术 0x8C、冰咆哮 0x30C、疾光电影 0x0100049C（八方向）、大火球 0x668（十六方向），均依据已检查的 mir2x magicrecord.inc 映射；公开使用按上述项目所有人确认记录执行。

战士新增原始运行帧：攻杀剑术 0x546、刺杀剑术 0x140、半月弯刀 0xE6、烈火剑法 0x5BE；各 8 方向、每方向 6 帧、方向步长 10。依据 magicrecord.inc 的 gfxID/frameCount/gfxIDCount/gfxDirType；野蛮冲撞源记录没有独立 magic gfx，当前使用原人物动作与位置变化，不冒用法师火焰。新增战士装备和六种技能书图标来自相同 itemrecord 字典。武器/头发叠层与装备外观变化仍未完成。

本轮参考源文件的内容哈希及 URL 归档于 `tools/asset-mapping-references.json`，用于追踪编码与技能索引依据；它们不能代替原作美术权利证明。

## 2026-10-27 画面与音效修复

- 人物图不是单层完整图片。源 hero.cpp 同时绘制 bodyLayer0 与 bodyLayer1；导入阶段按同一偏移无损合成，816 个有人物衣服叠层的动作帧均逐像素对照原始两层通过。`layers` 字段与 CSV `source_layers` 保存每层原路径和哈希。
- 原地图物件是 48 px 宽的竖条，不能孤立当成完整树木。现在解析固定资源提交中的 `map/0.bin`（zstd+cereal），采用源区域 x552/y432、46×48 格，保留瓦片、物件竖条与通行数据。552 块地面、源布局的 631 条物件条带按原坐标组装；具体实时计数以 manifest.world 为准。地面先绘入一张 Canvas 纹理，消除独立图集瓦片的采样接缝。人物被树冠遮挡时降低遮挡条带透明度。
- 音效来自相同固定资源提交的 `sound/seff`，WAV 原文件未改编码。`docs/audio-manifest.json` 记录 28 个 WAV 的 SHA-1/SHA-256 与 29 个映射；magicrecord 的 seffBase/引用关系按源格式解析。人物脚步、挥砍、受击来自 hero.cpp 的明确索引。当前公开展示按上述项目所有人确认发布，保留全部来源哈希。
- 版本是 mir2x 参考包语境；原地图区域的恢复不等于全部章节地图和 1.76 版本验收已完成。


## alpha.4 装备外观、阴影与遮挡

- `tools/equipment-appearance.json` 记录准确的 itemrecord.shape 映射及2640项源 weaponorder 表；`tools/appearance-sources.json` 固定所需原文件名和 Git blob 哈希，避免超大目录截断影响 CI。生成器 `tools/build-appearance-catalog.py` 保留重建方式。
- 武器编码必须减去 `WEAPON_BEGIN=1`：木剑 shape9 使用图形索引8，而不是9。动作、方向和原始帧号与人物同步，前后层按源 weaponorder 切换；没有拿装备图标代替场景武器。
- 当前27件武器共19种原模型（原版共享模型的装备沿用同一外观），7件衣服共7种；衣服保留 bodyLayer0/1 原色无损合成。基础衣着为布衣，开局实际装备木剑。
- 固定资源包中的 hero/monster 阴影位为 bit23，使用原阴影 PNG 和源偏移绘制在地面层，并跟随动作、方向、缩放、隐身/死亡淡出。没有用生成式素材冒充原版阴影。
- 罗刹、怒斩及天魔神甲、圣战宝甲、天尊道袍、天师长袍在该参考包缺少可核验场景模型，仍保留 GDD/物品定义，暂不进入商店、精英掉落和测试换装列表。原作模型相同与资源缺失是两种独立情况。
- 树木不再因人物靠近而逐条透明化；保留源图固定 alpha，低层物件在同格人物下，高层物件在同格人物上，人物位于树后时自然被树冠遮挡。根据原树图 alpha 检查遮挡，被挡住时显示一层淡色人物/武器轮廓，树冠本体不做局部透明切片。
- 新衣服/武器单独打包，非开局模型在装备时加载，全部相应纹理就绪后整体切换；开局布衣/木剑保持首批加载。

## alpha.5 比奇敌人增量

半兽战士`orcWarrior`、毒蜘蛛`spider`、半兽勇士`orcBrave`分别采用固定客户端`bb6a22287abcd9f248d2aba755074c254c68787a`的`common/src/monsterrecord.inc`中lookID `0x17`、`0x19`、`0x18`。图片继续来自已授权范围内的`mir2x_res@9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6`。每类224身体帧与224阴影帧，原PNG像素/锚点不变，登记在asset-manifest.json及台账。毒弹在幸存者玩法中复用已核验原版施毒术动画`0x46..0x4F`，不宣称这是历史客户端毒蜘蛛弹体；没有生成或替换美术，没有添加未核验音效。

## alpha.6 矿洞来源

- 地图：固定资源提交中的`map/D401.bin`（源客户端地图名“废矿矿山入口”），SHA-256 `486c407e5cb89ebfb4b8a419cfbf40038231adb8add8bf088ae4df0ddc9fa6dd`；选取源坐标(118,112)起46×48格区域作为2208×1536幸存者战场。通行格、瓦片和物件竖条位置均由原cereal/zstd二进制读取，原地形中有1,589个通行格，安全出生点(1080,752)。固定区域及文件哈希见tools/map-regions.json，地图贴图均有Git blob哈希。
- 模型：骷髅战士0x22、骷髅弓箭手0x90、洞蛆0x25、尸王0x35，依据同一固定客户端common/src/monsterrecord.inc，见tools/monster-models.json。四种新增模型共848身体帧与848阴影帧，原PNG像素和偏移不变。
- 箭矢：幸存者玩法复用固定magicrecord.inc中的原版“祖玛弓箭手_射箭”16方向运行帧，gfxID=0x03000578、方向步长10；不冒称历史客户端骷髅弓箭手的精确弹体映射，没有新造图或音效。
- 总资源18,544帧、3,142动画、37图集；11基础图集，2矿洞图集及24换装图集按需载入。3,536怪物身体帧与5,440阴影帧已纳入原图像素校验。矿洞导航测试夹具的通行数据和源SHA由资源门禁与实际导入结果对照，避免测试使用另一张简化地图。

## alpha.7 寺庙源资源

地图、lookID、火焰／电光／箭矢和雕像特殊动作的固定源记录见[TEMPLE.md](TEMPLE.md)。新增内容继续使用原始PNG与原动作阴影，不改变源像素；22,709帧／42图集，寺庙5页按需加载，基础11页不增加。原WAV仍为28个已核验文件，未给新怪伪造未确认音效。


## alpha.32 怪物原版声音

从已授权固定mir2x_res@9e21ea6631317d06e064fbfa7e1ea43af6a2d3e6的sound/seff引入108个未改编码WAV，现共137文件／141事件映射，其中37类敌人占111映射。映射参考客户端bb6a22287abcd9f248d2aba755074c254c68787a的clientmonster.cpp、sysconst.hpp、monsterrecord.hpp及monsterrecord.inc；每份源码SHA-256由导入器锁定，详见audio-manifest.json的monsterSoundReference。

声音索引采用原始lookID，不做图片编码所需的减1：0x02000000＋lookID×16，攻击偏移2、受击4、死亡5。邪恶毒蛇lookID80的3个独立WAV在固定包缺失；只对这三项显式复用同族蝎蛇lookID79原声，台账保留requested、sourceKind、sourceFile与reason。没有合成声音或冒用其他Boss声音。神兽喷火的独立音效仍缺可核验映射。

上文按阶段保存的28／29WAV计数属于历史；当前总量以audio-manifest.json与check-audio.py为准。怪物按当前章节预取，全部音效及攻击／受击／死亡开关在本机保存。
