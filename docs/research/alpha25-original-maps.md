# 白日门／石墓原版地图来源核查

核查日期：2026-10-29。本文记录可复现的资源候选与缺口，不表示新章节已接入，也不把第三方服务端仓库中的文件冒称盛趣官方原始发行包。

## 结论

找到带实际地图数据和同仓名称配置的白日门、石墓候选，已固定提交、下载并校验 Git blob；尚未找到并核实这些地图对应的原始客户端 `Tiles / SmTiles / Objects` 图像库。不能只按 `11`、`D711` 文件名把现有地貌改名，也不能只按图像索引相同认定不同资源包兼容。

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

预检不改运行素材 manifest、不导入地图、不新增章节。当前公开游戏仍为 alpha.24；在匹配图像库与实机画面验收完成前，白日门与 1.76 石墓仍是未完成项。
