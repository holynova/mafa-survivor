# GitHub 阶段发布

源码仓库：https://github.com/holynova/mafa-survivor

Pages 测试地址：https://holynova.github.io/mafa-survivor/

用户已授权把项目发布到 GitHub、开启 Pages，并在每个已验收开发阶段发布新版本，方便持续测试。发布不需要逐阶段重复请求同范围授权；素材公开分发仍遵循已经确认的范围。

## 发布入口

1. 更新 CHANGELOG.md 与 package.json 的阶段版本；阶段号按 package.json 与最新已成功部署的标签核对，不重用旧标签。
2. 运行自动测试、本地原版资源检查、人物合成检查、音频检查和构建；通过浏览器实际操作并查看截图。
3. 仓库变量 `PAGES_ASSET_MODE=original`；Actions 导入固定提交资源并校验项目所有人的授权确认记录，检查图片、合成帧和音频。
4. 提交并推送 main，打递增阶段标签并推送，例如 v0.1.0-alpha.2。
5. Stage release and Pages 工作流测试、构建、部署；仅部署成功后创建同名 GitHub 预发布版本。
6. 读取远端工作流状态，核验在线 version.json 与标签提交一致，再做线上试玩与截图。向用户提供 Pages、Release 与已知限制。

## 素材方案

- `graybox`：仅中性几何体，模拟玩法相同；Vite 不复制 public 目录，产物禁止包含图片/WAV/MP3/原地图二进制，保留本项目 SVG favicon。明确标为灰盒，不冒充原版画面。
- `original`：已由项目所有人明确授权公开展示。构建校验 `docs/asset-authorization.json` 的源仓库、固定提交、图片/地图/音效和公开发布范围，台账标记 `AUTHORIZED_BY_PROJECT_OWNER`。
- 本地默认仍使用原版素材；灰盒构建不改变本地原始文件和默认画风。

2026-10-27 用户确认：“确认拥有原版授权，直接发布公开版本”。采用 original 公开版；同范围后续阶段发布不再重复请求授权。

## 首次发布核验记录

2026-10-27：完整源码已推送，保留原远端 GDD 提交历史；源码提交 `f04a5f15d24de1160dccc0947503ae15571fb149` 的 [Source checks](https://github.com/holynova/mafa-survivor/actions/runs/40439650523) 已成功。GitHub Pages API 返回 build_type=workflow，配置已启用；这是授权确认前的源码准备记录。随后用户确认原版授权，alpha.1 首次部署受上游超大目录超时阻断；alpha.2 修复目录问题后暴露了共享源贴图并发缓存冲突，未部署；alpha.3 修复并加入回归测试后重新发布。线上核验以 QA.md 的实测记录及 Actions 成功状态为准。

## alpha.3 历史发布

[v0.1.0-alpha.3](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.3) 已于2026-10-27完成 build/deploy/release，标签提交 `8c8bd3d`。真实 Chrome 线上试玩、D 键、音效、测试工具和截图验收记录见 QA.md。后续每阶段沿用递增 alpha 标签流程，不重写历史标签。


## alpha.4 发布记录

[v0.1.0-alpha.4](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.4) 的139项游戏测试、3项源缓存测试、资源/原图像素/音频检查、构建、部署和Release均成功，发布提交 `0450ff8`。在线version.json和33张原版PNG与原WAV核验通过。本地真实浏览器视觉验收已完成；最终公网交互截图因内置浏览器超时与前台Chrome控制需用户许可而待完成，详见QA.md。

## alpha.5 历史发布

[v0.1.0-alpha.5](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.5)发布提交`a4350ec7341ea5223f7fe8d6c9662b74281143fb`；工作流40494059708的build/deploy/release成功。191项游戏测试与3项缓存测试、原图像素/WAV/构建检查通过；线上版本、35图集与原WAV核验通过。本地生产浏览器截图已验收并上传Release；公网内置浏览器AX超时，最终线上交互截图未完成，未操作用户前台Chrome。此版本开放道士与第一章七类敌人，矿洞/寺庙仍在开发。

## alpha.6 历史发布

[v0.1.0-alpha.6](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.6)发布提交`81f2fcf5cfe71a3eca2391293daa1daeaf09077a`；[工作流40504313748](https://github.com/holynova/mafa-survivor/actions/runs/40504313748)的build/deploy/release全部成功，Source checks 40504305353成功。211项游戏测试、6项Python资源测试、原图像素、原WAV与构建检查通过。公网version.json与标签一致，37张PNG和28个原WAV逐一核验通过；本地生产截图与HTTP证据已附在Release。公网浏览器重载/重连超时，最终alpha.6线上交互截图待补；用户现有测试页保持原样。

## alpha.7 历史发布

[v0.1.0-alpha.7](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.7)发布提交`7ef5accff5c190d88ff9d242e66557a2a0179e48`；[工作流40543810174](https://github.com/holynova/mafa-survivor/actions/runs/40543810174)build/deploy/release全部成功，Source checks 40543751805成功。231项游戏测试、6项Python资源测试、原图像素／WAV／构建通过。公网版本一致、42图集和28原WAV逐项通过；两张寺庙源地图和雕像特殊动作完整。真实公网菜单截图alpha7-online-menu.jpg与本地战斗截图／HTTP核验已附Release；公网按钮操作超时，最终线上战斗交互仍待补。三章内容可进入不等于完整平衡或全GDD退出条件已完成。


## 当前公开版本：alpha.8

[v0.1.0-alpha.8](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.8)发布提交`6ba8a893c905be2f89663ae14ec7dad618908d6a`；[工作流40556922133](https://github.com/holynova/mafa-survivor/actions/runs/40556922133)build／deploy／release成功，Source checks 40556899413成功。250项游戏测试、6项Python资源测试、原图像素／WAV／生产构建通过。干净提交36局真实模拟与冻结前逐项一致，0不变量异常、仅2局通关，完整平衡仍未通过。公网版本、四源地图及walk、42图集、28原WAV核验通过；真实公网菜单与本地生产战斗截图、完整模拟报告和HTTP证据已附Release。公网试玩按钮操作仍超时，最终线上战斗交互待补；用户现有测试页未操作。
