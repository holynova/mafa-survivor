# 白日门／石墓原版地图来源核查

核查日期：2026-10-29。本文记录资源来源、索引证据与实际核查边界；章节发布和实机验收以 QA／版本记录为准，不把社区仓文件冒称盛趣官方原始发行包。

## 结论

已找到带实际地图数据和同仓名称配置的白日门、石墓候选，并进一步找到可按原生地图索引拼接的社区导出 PNG／JSON 图像库，均固定来源并校验 Git blob。新证据详见末尾“导出图像库核查更新”。仍未取得可独立对照的官方 1.76 原始 WIL／安装包，因此不能宣称与某一官方发行逐字节相同；也不能仅凭文件名、索引或社区仓说明作这种推断。

## 实际地图候选

来源：[mirbeta/MirServer 固定提交](https://github.com/mirbeta/MirServer/tree/f38deae64c521a28f8e0d86f2bf24d4ba7c9ea5c)，提交时间 2022-08-30。此仓是服务端文件仓，不是官方客户端发行站。仅下载下表四个数据文件，没有执行仓内程序，也没有复制其实现代码。

| 文件 | 字节数 | 地图尺寸 | Git blob SHA-1 |
| --- | ---: | --- | --- |
| `Mir200/Map/11.map` | 3,000,052 | 500×500 | `6ff6b41cacd9640c6924b548849fc1b9f2b8a11d` |
| `Mir200/Map/d711.map` | 1,920,052 | 400×400 | `a392b3eb2ba69b5cc09950c964ff802bc3b24ea6` |
| `Mir200/Map/D717.map` | 120,052 | 100×100 | `3ffc4e5bbb8f152d9c064e044dd47fd708410b91` |
| `Mir200/Envir/MapInfo.txt` | 81,772 | 名称／连接配置 | `c697f70e01582b389577a2933aabe7de805bf9a0` |

同一提交的 [MapInfo.txt](https://github.com/mirbeta/MirServer/blob/f38deae64c521a28f8e0d86f2bf24d4ba7c9ea5c/Mir200/Envir/MapInfo.txt) 将 `11`、`D711`、`D717` 分别配置为白日门、石墓一层、石墓七层。这是同包名称对应的证据；不能单凭此配置证明它们与某一官方 1.76 发行文件逐字节相同。

实际二进制检查：三个文件均为前四字节 little-endian 宽／高，头部包含 `Legend of mir`，长度恰为 `52 + width × height × 12`。校验时按 Git blob 的 `blob <length>\0` 前缀计算 SHA-1，与固定提交的树记录逐一相符。

SHA-256：

- `11.map`：`d8493009ad70fbca5eda276988c7c9c8027ccdfbc4cbba4c433e8ad7a627e354`
- `d711.map`：`3321518ad2f337cabe4db323303cd39e6827f7f54c13c86a8dc5fa5552f90fe6`
- `D717.map`：`9633461c756c0d152f412d08e33012df6fa72c885509a57a85b81463070f0020`
- `MapInfo.txt`：`86a6a68ca3604171ab92a706a102f4083fce94bcd1449bc3a211bc5e983c0c06`

本机缓存位于忽略目录 `.cache/alpha25-mirserver-11.map`、`alpha25-mirserver-d711.map`、`alpha25-mirserver-D717.map`、`alpha25-mirserver-MapInfo.txt`。这些是研究缓存，未进入公开资源 manifest 或发布包。

## 交叉核查与图像库缺口

[cjlaaa/Mir2-GeeM2 固定提交](https://github.com/cjlaaa/Mir2-GeeM2/tree/9981a8d7aeccadd4a7fb786055ff612ceccda035) 的 `Map/d711.map` 与 `Map/D717.map` Git blob 与上表相同，`Map/11.map` 则不同（`3cd1d1cc958084fe3a0559009d1bfe7fa97804f4`）。其 [mapinfo.txt](https://github.com/cjlaaa/Mir2-GeeM2/blob/9981a8d7aeccadd4a7fb786055ff612ceccda035/Envir/mapinfo.txt) 也有对应中文名称。两个社区仓相同的文件可用于交叉比对，仍不能代替官方发行包校验。

递归树核查：上述两个服务端仓，以及 [mirbeta/MirClient 固定提交](https://github.com/mirbeta/MirClient/tree/3dbba7d20f647e2716a1cacacdfe233e1695c33f)，均没有可直接配套使用的 `Tiles / SmTiles / Objects` WIL/WIX/WZL/WZX 图像库。后者主要是 Delphi 客户端代码与组件；未复制其实现。

地图原始索引抽查（未减一）：白日门大地砖常用 1451–1455，前景最大值 8654；石墓一层常用 45、1951–1955、2501–2505，前景最大值 7941。需要用实际客户端图像库、源映射、可视拼接和通行布局共同核验，不能只匹配编号。

现有 [etorth/mir2x README](https://github.com/etorth/mir2x) 将参考版本描述为 classic v1.45；固定地图记录使用“石阁”等名称。该说明不能证明现有 `D711.bin` 等同于国服 1.76 的石墓，也没有补出缺失的白日门 `11.bin`。

## 原生 12 字节格式的主源证据

独立实现离线预检时可参考固定 [lzxsz/MIR2 提交](https://github.com/lzxsz/MIR2/tree/98711dad31567d9a7e272956f6c5a2487000848b) 中的格式事实。这里只核查字段与读取约定，没有复制实现代码：

| 文件／位置 | 核查结果 | Git blob SHA-1 |
| --- | --- | --- |
| [Client/MapUnit.pas L30–48](https://github.com/lzxsz/MIR2/blob/98711dad31567d9a7e272956f6c5a2487000848b/GameOfMir/Client/MapUnit.pas#L30) | packed 52 字节头；cell 偏移0/2/4为三层uint16索引，6/7门编号／状态，8/9动画帧／节拍，10图库选择，11光照 | `3752e0311d64603d5d644ab89abf1903d241dabd` |
| [MapUnit.pas L177–182](https://github.com/lzxsz/MIR2/blob/98711dad31567d9a7e272956f6c5a2487000848b/GameOfMir/Client/MapUnit.pas#L177) | 按列存储，单元字节偏移为 `52 + (x × height + y) × 12` | 同上 |
| [MapUnit.pas L311–343](https://github.com/lzxsz/MIR2/blob/98711dad31567d9a7e272956f6c5a2487000848b/GameOfMir/Client/MapUnit.pas#L311) | 背景或前景索引的高位阻止行走；门编号高位存在且门状态高位未开也阻止行走。飞行仅检查前景高位与门 | 同上 |
| [MapUnit.pas L427–468](https://github.com/lzxsz/MIR2/blob/98711dad31567d9a7e272956f6c5a2487000848b/GameOfMir/Client/MapUnit.pas#L427) | 非零背／前景索引掩掉高位再减1，中景非零索引减1；分别选Tiles／SmTiles／Objects系列，前景由Area选择图库 | 同上 |
| [Client/MShare.pas L791–808](https://github.com/lzxsz/MIR2/blob/98711dad31567d9a7e272956f6c5a2487000848b/GameOfMir/Client/MShare.pas#L791) 和 [Share.pas L68](https://github.com/lzxsz/MIR2/blob/98711dad31567d9a7e272956f6c5a2487000848b/GameOfMir/Client/Share.pas#L68) | Area0选`Objects.wil`，Area1选`Objects2.wil`，依次类推；实际支持范围由客户端对象数组决定 | `8bc5bb00977d427c8e384d12cd9c9861a22fc3b1`／`a30cd301c9e812513c14b5579333dccbbc5bb6a2` |

预检只应接受已明确核查的这一种格式；其他版本、额外字节、截断或无法判断的标题需要明确拒绝。门开闭／动画字段应保留，不以普通“非零就阻挡”的近似判定替代。

## 下载来源核查

| 来源 | 本次实际结果 | 用途与限制 |
| --- | --- | --- |
| [盛趣旧客户端下载页](https://actmir2.web.sdo.com/project/download/index.asp) | 页面可读，含 2013 轻客户端链接；HTTPS HEAD 发生 SSL EOF，原 HTTP 链接 Range GET 返回 500 | 未获得安装包，不执行安装程序，不声称核验内容／MD5 |
| [Mirfiles 地图目录](https://mirfiles.com/resources/mir2/Maps/) | 目录列出 `Latest_Maps.rar`，实际下载返回 403 | 没有绕过访问限制；目录记录不等于已经取得文件 |
| [C#Mir 旧资源页](https://mir2.ueuo.com/index.php) | 页面有 `ShandaMir2.7z` 地图包链接；请求超时，单文件页报告目录缺失 | 未下载到可验数据 |
| [c-zhuo/Mir2 README](https://github.com/c-zhuo/Mir2) | 作者说明数百 MB 图片没有上传，且素材混合来自游戏与素材站 | 没有采用未提供或来源混合的美术 |
| [luxuia/testgame1 的地形工具](https://github.com/luxuia/testgame1/tree/91f96484c74cf873d05ba5e3688b745e6e0bde75/proj/Assets/LegendaryTerrain) | 下载器指向 Crystal.Database；工具以方块占位生成 3D 地形 | 没有把方块／生成贴图当作原版地图资源 |

## 接入前仍需完成

1. 获取与候选 `.map` 对应的原客户端地图图像库，保留固定来源、文件哈希和本项目授权记录。
2. 核对原格式、列／行顺序、索引起点、遮挡／动画／碰撞标记；发现不兼容时拒绝静默替换纹理。
3. 以原图实际渲染裁剪区域，截图检查完整物件、接缝、树冠遮挡与角色移动，再接入章节怪物配置。

本次实现范围限于离线 `tools/native_map_audit.py` 预检与 `tools/test_native_map_audit.py` 格式／通行测试。新增测试同时接入 Source checks，不依赖下载游戏素材。输出固定标记 `diagnosticOnly=true`／`runtimeReady=false`，诊断图不是游戏美术。

实际执行并查看三个通行诊断图（白色为按存储状态可走，黑色为阻挡；一像素对应一格）：

| 候选 | 可走格 | 最大四邻接连通区 | 门格／存储为关闭 | 本机JSON／PNG |
| --- | ---: | ---: | ---: | --- |
| 白日门 | 116,344 | 116,332 | 92／25 | `.artifacts/alpha25-white-day-audit.*` |
| 石墓一层 | 55,130 | 55,126 | 0／0 | `.artifacts/alpha25-stone1-audit.*` |
| 石墓七层 | 3,758 | 3,757 | 0／0 | `.artifacts/alpha25-stone7-audit.*` |

白日门有60个非空前景单元的Area为255。已核对同一读取参考的 `MShare.pas` L174 对象数组范围为0–14、L796越界回退0；报告保留原始Area／计数，按这个明确的客户端读取配置统计进Objects，不虚构Objects256图库。这也是仅凭索引猜配套图像库不可靠的实际例子；其他客户端配置仍须另行验证。

复现白日门预检（先从上方固定提交取得并校验缓存文件）：

```sh
.venv/bin/python tools/native_map_audit.py .cache/alpha25-mirserver-11.map \
  --expected-sha256 d8493009ad70fbca5eda276988c7c9c8027ccdfbc4cbba4c433e8ad7a627e354 \
  --out .artifacts/alpha25-white-day-audit.json \
  --walk-png .artifacts/alpha25-white-day-audit.png
```

工具仅验证已核查的标题／52字节头／12字节单元格式，严格拒绝截断、额外字节、未知签名与过大尺寸。JSON保留每种所需图库的原始一基索引，不把索引改写为当前etorth纹理编码。`--expected-sha256`不匹配时拒绝输出。普通通行掩码遵照上述读取参考，不能代替门动态、飞行碰撞、动画、截图与章节实战验收。

上述离线预检阶段不改运行素材 manifest，也没有据此新增章节。后续已找到可拼接的导出图像并开始独立章节接入，见下文更新；公开版本与实机验收仍以 QA／Release 实际记录为准。


## 导出图像库核查更新

在上述“缺配套图像库”的初次结论后，找到 [fluttergo/mir2-client-js 固定历史提交](https://github.com/fluttergo/mir2-client-js/tree/c2419cb7803cafe5dea2d366c1948480e944cb09/res/map) 的地图导出图。它是社区 Egret 客户端资源仓的历史公开内容，不是官方安装包或官方 1.76 原 WIL 的独立校验件。

### 历史来源

- 资源固定提交为 `c2419cb7803cafe5dea2d366c1948480e944cb09`，时间2019-05-22；其后紧邻 [6383598 删除 res 的提交](https://github.com/fluttergo/mir2-client-js/commit/6383598dac5ea0f8edf2b5dac7c4dbeeb58c6878) 的父提交就是该固定提交。删除提交说明仅写“delete res”，没有提供原版发行或版权核验声明。
- [固定当前 README](https://github.com/fluttergo/mir2-client-js/blob/695c237376f770d0e7a4fd5e1dfe15f7ea426589/readme.md) 说明客户端文件达数GB、GitHub经常同步失败，迁往Gitee。这可以解释项目迁移背景，不能由此证明删除的每个资源都是未修改官方原图。README同时描述副本、擂台等社区游戏功能，也不能据游戏功能判断某张地图图像是否修改过。
- 历史树中未找到原始 `.wil`／`.wix` 文件或把 WIL 导出为本组 PNG／JSON 的转换器。没有执行其程序，也没有复制其客户端实现代码。

### 可核验的索引保留证据

PNG旁的 JSON 不是以数组位置作为图像索引：`frames` 是单键对象列表，数字键才是稀疏编号，另有明确的 `empty` 帧。该结论直接来自固定 JSON 文件；例如 `Objects.wil` 首个数值编号是62，不能误作0号图像。

同一提交还保留 Tiled TSX 图集描述：`tile id=N` 对应 `<图库名>/N.png`，空编号指向 `empty.png`。已下载并按 Git blob 验证四个 TSX，随后逐项比较 JSON 数字键、TSX tile id、图像宽高和数字文件名：

| 图库 | JSON数值帧 | TSX tile数 | 数字键／尺寸／路径差异 | JSON未收录且TSX标为空的编号 | TSX Git blob SHA-1 |
| --- | ---: | ---: | ---: | ---: | --- |
| [Tiles](https://github.com/fluttergo/mir2-client-js/blob/c2419cb7803cafe5dea2d366c1948480e944cb09/res/map/Tiles.tsx) | 17,571 | 31,725 | 0 | 14,154 | `d119d0ef6e5763ebf0124eb28d444f65867ad465` |
| [Objects](https://github.com/fluttergo/mir2-client-js/blob/c2419cb7803cafe5dea2d366c1948480e944cb09/res/map/Objects.tsx) | 8,359 | 9,999 | 0 | 1,640 | `bf3c356591c2765f28e6dba64336409c9239bd23` |
| [Objects5](https://github.com/fluttergo/mir2-client-js/blob/c2419cb7803cafe5dea2d366c1948480e944cb09/res/map/Objects5.tsx) | 8,682 | 10,872 | 0 | 2,190 | `54c420dfb71584fb66fcd6dc6138036cfffa8392` |
| [Objects7](https://github.com/fluttergo/mir2-client-js/blob/c2419cb7803cafe5dea2d366c1948480e944cb09/res/map/Objects7.tsx) | 5,503 | 9,984 | 0 | 4,481 | `d53f82cb803b0ff3fdba4165d29d8bf642155871` |

这证明该导出包内部保留了明确编号及空洞，而不是把有效帧重新顺序编号；再结合上方原生地图一基索引减1的读取规则，可建立可复查的映射。**它不单独证明这些编号源于哪个版本的原 WIL，也不证明导出像素与官方发行逐像素一致。**

### 本项目已采用的可复现范围

固定来源和8个数据文件（四库PNG／JSON，合计126,723,091字节）的 Git blob、SHA-256、大小已登记在 `tools/native-map-sources.json`。只取地图实际需要的片段；不将其他社区功能或未核验自定义图库混入运行资源。

- 白日门：`11.map`，裁剪左上角200,280，46×48格。
- 石墓一层：`d711.map`，裁剪左上角150,160，46×48格。
- 为避免下方源物件被截断，图像采集还包含裁剪范围下方所需竖条；已有导入日志从31,034帧增至32,403帧，即新增1,369帧。缺图校验和逐像素导出检查以实际资源验证日志为准。
- 本机已生成真实地图拼接图 `.artifacts/alpha25-native-11-200-280.png`、`.artifacts/alpha25-native-d711-150-160.png`。运行接入使用独立ID `bairimen`／`shimu`；旧 `stone` 的“石阁”名称和数据保留，避免把不同来源章节静默改名。

本次没有发现足以证明上述四个图库经过重新绘制／生成的元数据，但“没有发现”不是官方原始像素鉴定。使用依据仍是用户对原版素材公开分发权的明确确认，加上固定社区来源、显式索引、实际地图拼接及项目验收；不冒称独立法律核验或官方 1.76 安装包鉴定。
