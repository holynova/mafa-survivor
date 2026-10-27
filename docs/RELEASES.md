# GitHub 阶段发布

源码仓库：https://github.com/holynova/mafa-survivor

Pages 测试地址：https://holynova.github.io/mafa-survivor/

用户已授权把项目发布到 GitHub、开启 Pages，并在每个已验收开发阶段发布新版本，方便持续测试。发布不需要逐阶段重复请求同范围授权；素材公开分发仍遵循已经确认的范围。

## 发布入口

1. 更新 CHANGELOG.md 与 package.json 的阶段版本；当前公开阶段号为 v0.1.0-alpha.3。
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
