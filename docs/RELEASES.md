# GitHub 阶段发布

源码仓库：https://github.com/holynova/mafa-survivor

Pages 计划地址：https://holynova.github.io/mafa-survivor/

用户已授权把项目发布到 GitHub、开启 Pages，并在每个已验收开发阶段发布新版本，方便持续测试。发布不需要逐阶段重复请求同范围授权；素材公开分发仍遵循已经确认的范围。

## 发布入口

1. 更新 CHANGELOG.md 与 package.json 的阶段版本；当前首个阶段号为 v0.1.0-alpha.1。
2. 运行自动测试、本地原版资源检查、人物合成检查、音频检查和构建；通过浏览器实际操作并查看截图。
3. 确认部署资产方案后，设置仓库变量 `PAGES_ASSET_MODE`；未设置时部署工作流主动失败，不会绕过素材门禁。
4. 提交并推送 main，打递增阶段标签并推送，例如 v0.1.0-alpha.2。
5. Stage release and Pages 工作流测试、构建、部署；仅部署成功后创建同名 GitHub 预发布版本。
6. 读取远端工作流状态，核验在线 version.json 与标签提交一致，再做线上试玩与截图。向用户提供 Pages、Release 与已知限制。

## 素材方案

- `graybox`：仅中性几何体，模拟玩法相同；Vite 不复制 public 目录，产物禁止包含图片/WAV/MP3/原地图二进制，保留本项目 SVG favicon。明确标为灰盒，不冒充原版画面。
- `original`：受原有资源权利门禁保护，未经授权核验无法构建发布。单纯选择变量不会改变权利状态。
- 本地默认仍使用原版素材；灰盒构建不改变本地原始文件和默认画风。

当前公开资产方案等待用户确认。源码及部署配置的准备和发布可以独立继续。

## 首次发布核验记录

2026-10-27：完整源码已推送，保留原远端 GDD 提交历史；源码提交 `f04a5f15d24de1160dccc0947503ae15571fb149` 的 [Source checks](https://github.com/holynova/mafa-survivor/actions/runs/40439650523) 已成功。GitHub Pages API 返回 build_type=workflow，配置已启用；尚无正式部署，尚未推送 v0.1.0-alpha.1 标签或创建该 Release。公开素材方案确认后才设置部署变量并发布首个阶段测试版本。
