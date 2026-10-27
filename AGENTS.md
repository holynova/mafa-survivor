# 玛法幸存者开发约定

- 以 docs/GDD.md（V1.0）为产品基线；docs/design-data-V0.9.json 保留原始数据草案。当前进度和未完成项见 docs/STATUS.md。
- 网页优先：Phaser + TypeScript，React 负责菜单/HUD。战斗规则独立于 Phaser，禁止在 React 状态中逐帧更新怪物。
- 用户要求优先使用网络传奇项目中的原始美术。禁止悄悄生成、绘制或购买传奇风替代图。缺资源应登记；经验微光和无格道具的中性几何标记属于开发占位。
- 原始资源位于 public/assets/mir，缓存位于 .cache，均忽略于 Git；每帧来源记录在 docs/asset-manifest.json。
- 2026-10-27 用户明确确认拥有原版授权并要求直接公开发布，范围见 docs/asset-authorization.json；这是项目所有人的授权确认，不冒称独立法律核验。保持原版画风，按固定源提交构建公开原版展示版。
- 运行 npm test、npm run assets:check、npm run build。改变画面或交互后用浏览器验证并查看截图；已有服务默认 127.0.0.1:5178，不要重复启动。
- 不把尚未实现的职业、技能、怪物行为或未测的性能写成完成。以证据更新 docs/QA.md。

- 音效使用有来源记录的原版游戏 WAV，不使用合成占位。
- 每完成一个开发阶段，必须在真实浏览器检查人物/怪物完整性、地面接缝、环境遮挡与按键输入，并保存截图查看后再报告。视觉素材阶段另运行 npm run assets:visual-check。
- 测试模式不保存普通战绩、不发放结晶；调试能力不影响正常局。
- 用户已授权把项目源码发布到 holynova/mafa-survivor，并在每个已验收阶段更新 GitHub Pages 与 GitHub 预发布版本；同一已确认发布范围不重复请求许可。
- 阶段发布前更新 CHANGELOG、版本号并完成测试和真实浏览器截图验收；打递增的 v0.1.0-alpha.N 标签，通过 Actions 部署后检查在线 version.json、试玩与截图，再报告版本链接。具体流程见 docs/RELEASES.md。
- Pages 公开素材方案已确认为 original；仓库变量 PAGES_ASSET_MODE=original。原版图片、地图和音效在 Actions 中按固定源提交导入并部署；.cache 与生成资源继续忽略于源码 Git。更换资源源仓库或提交时更新对应授权记录。

- 人物外观使用真实装备映射，武器 shape 要减 WEAPON_BEGIN=1，前后层使用源 weaponorder 表；模型缺失装备不进入公开版本商店或精英掉落，不能冒用其他装备模型。
- 地图物件是相邻竖条，不得独立按角色矩形范围修改条带 alpha；保持源前后层与完整树冠。人物/怪物阴影使用来源已登记的动作阴影。
