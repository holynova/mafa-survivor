# 玛法幸存者开发约定

- 以 docs/GDD.md（V1.0）为产品基线；docs/design-data-V0.9.json 保留原始数据草案。当前进度和未完成项见 docs/STATUS.md。
- 网页优先：Phaser + TypeScript，React 负责菜单/HUD。战斗规则独立于 Phaser，禁止在 React 状态中逐帧更新怪物。
- 用户要求优先使用网络传奇项目中的原始美术。禁止悄悄生成、绘制或购买传奇风替代图。缺资源应登记；经验微光和无格道具的中性几何标记属于开发占位。
- 原始资源位于 public/assets/mir，缓存位于 .cache，均忽略于 Git；每帧来源记录在 docs/asset-manifest.json。
- 继续正常本地开发和验证。素材未经权利核实，不上传或发布原始图片。公开发布的具体缺口与状态见 docs/ASSETS.md；不得擅自换视觉风格绕过用户约束。
- 运行 npm test、npm run assets:check、npm run build。改变画面或交互后用浏览器验证并查看截图；已有服务默认 127.0.0.1:5178，不要重复启动。
- 不把尚未实现的职业、技能、怪物行为或未测的性能写成完成。以证据更新 docs/QA.md。
