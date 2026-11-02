# Cloudflare 发布

本项目已由 GitHub Pages 发布，2026-11-02 按 hn-project-publisher 补齐 Cloudflare Workers 发布；保留旧 Pages 回退，不新建发布分支或 Cloudflare Action。`main` 为唯一源码／发布来源，作品集使用其自身 `master`。

## 检查记录

| 项目 | 检查结果 |
| --- | --- |
| 源码／依赖／授权 | 已检查，复用远端 main 的 alpha.35 游戏与固定原版素材；扩展同一公开分发确认的托管范围 |
| Worker／域名 | 需补齐；当前账户无 mafa-survivor Worker／域名绑定，公开 DNS 为 NXDOMAIN |
| 账户／Zone | 已检查，现有 OAuth 与 xiaosang.cc 属于配置账户；不保存凭据 |
| 根路径／构建 | 已补齐 build:cloudflare，复用原版素材校验，BASE_PATH=/；dist 为唯一上传目录 |
| 源码入口／统计 | 已补齐可见 GitHub 链接、唯一 Umami 脚本，统一既有 website ID |
| README／截图／二维码 | 补齐短双语说明、实际生产预览、最终域名二维码；完整旧说明保留在 DEVELOPMENT.md |
| GitHub Homepage／作品集／Profile | 项目线上验证后更新；不修改其他项目条目或精选状态 |

目标：`https://mafa-survivor.xiaosang.cc/`，Worker `mafa-survivor`。账户与 active Zone 已通过 API 核实；DNS records API 无读取权限，使用公开 DNS 与完整 Worker 域名列表核查冲突，不将403当作记录不存在。部署前 dry-run 通过。

## 手动发布

```sh
npm ci
# 首次准备原版资源：见 DEVELOPMENT.md；已有固定资源直接复用
npm test
npm run build:cloudflare
npm run deploy:check
npm run deploy
```

Wrangler 固定4.128.0。deploy 要求干净 main，先构建再从同一提交手动上传；构建记录完整 Git SHA 和应用版本于 version.json。不存在 Cloudflare 自动构建／Git 集成。旧 Pages 工作流保留，本次不打触发 Pages 的新标签。

纯静态单页只使用根路由，无 history 路由，不启用 SPA 缺失资源回退。静态边界是 dist，不上传缓存、源素材包、测试、存档或凭据。当前生产资源289个，最大manifest约18.5MB，符合[Cloudflare单文件限制](https://developers.cloudflare.com/workers/platform/limits/)。README／仓库 assets 图片不在生产输出中，单独修订它们无需重部署游戏。

## 待上线验证

项目 Worker deployment ID、源提交、HTTPS／实际画面及作品集独立 deployment ID 在完成后记录。职业／章节平衡沿用alpha.35的已知限制，本次不宣称修复通关平衡。
