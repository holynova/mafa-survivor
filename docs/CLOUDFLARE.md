# Cloudflare 子路径发布

用户于2026-11-02调用 hn-project-publisher，随后明确选择子路径。最终入口为 **https://xiaosang.cc/mafa-survivor/**，复用已有 `xiaosang-portfolio` Worker，不创建游戏独立 Worker，不新增域名、发布分支、Cloudflare Action 或 Workers Builds/Git 集成。旧 GitHub Pages 作为回退，本次不触发 Pages 标签发布。

## 来源与边界

- 游戏唯一源码分支：`holynova/mafa-survivor` 的 `main`。
- 生产产物、作品条目与实际部署来源：`holynova/holynova.github.io` 的 `master`，生成目录 `mafa-survivor/`。
- 游戏仍用同一批固定原版图像、地图和WAV；资源公开托管范围按用户现有确认及本次发布请求记录，游戏规则沿用alpha.35。
- `build:cloudflare` 以 `/mafa-survivor/` 构建，保留版本／完整源码SHA；生成目录的 `build-source.json` 记录来源。上传边界沿用作品集 `.assetsignore`，不复制项目缓存、测试、源码、存档和凭据。
- 原版资源289个，最大manifest约18.5MB，符合[Cloudflare单文件限制](https://developers.cloudflare.com/workers/platform/limits/)。账户API最初拒绝创建新Worker（10037），该独立Worker／域名未创建；改子路径后仅更新现有Worker。

## 本地手动流程

要求项目是干净 `main`、作品集是 `master`。默认作品集位于同级 `../holynova.github.io`，可用 `PORTFOLIO_DIR` 指定路径。

```sh
npm ci
# 首次原版资源准备见 DEVELOPMENT.md
npm test
npm run deploy:prepare
# 在作品集仓库检查 mafa-survivor/，提交并推送 master
npm run deploy:check
npm run deploy
```

`deploy:prepare` 只覆盖本项目已标记的生成目录，拒绝未标记目录及该目录已有修改。`deploy` 检查两个仓库分支／干净状态、源码祖先和运行代码是否一致，并验证目标Worker为xiaosang-portfolio；使用锁定Wrangler4.128.0在本地发布作品集的同一提交。Git推送不触发Cloudflare发布。

首次采用两步：先发布游戏子目录并验证HTTPS／版本／JS/CSS／原版素材及交互，再加入作品集条目与截图、提交master并再次手动发布。同一个Worker的两个deployment ID分别记录；不冒称创建了两个Worker。游戏无history路由，不启用缺失资源SPA回退。

## 材料与状态

可见GitHub入口和唯一统一Umami脚本已补齐；短双语README、原版生产预览截图与最终子路径二维码已准备，旧完整README保存在DEVELOPMENT.md。README与仓库assets不在游戏生产产物中，单独修订无需重建游戏。

首次部署的源码SHA、作品集master SHA、deployment ID和线上核验结果在完成后记录。职业／章节平衡仍有alpha.35的已知限制，本次不宣称修复通关平衡。
