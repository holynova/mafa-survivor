# alpha.30 测试面板技术审查

Implementation Integrity：通过。新增控件延用原版主题、原生button和有名称的output，执行真实Game.step／命中／位移；测试能力在模式入口拦截，普通局不接收赠予。detector对TestTools.tsx、test-mode.ts、effect-visual.ts返回空数组，没有确定性告警。

| 维度 | 得分 | 证据 |
|---|---:|---|
| 无障碍 | 3/4 | 明确按钮名称、disabled状态、有名输出；原生D键有效；非完整WCAG认证 |
| 性能 | 3/4 | 半月仅每次出手比较8个方向；React不做逐帧战斗；617测试通过，GPU／移动设备帧率未认证 |
| 响应式 | 3/4 | 桌面与390×844已截图，documentWidth=390；面板内部可滚动，新增按钮高31px |
| 主题 | 3/4 | 无新增色值或字体；延用共享经典暗色控件，遗留CSS含固定色值 |
| 实现完整性 | 4/4 | 没有装饰性假数据；比较0→14／0→46来自实际命中，模式和墙体回归覆盖 |
| 合计 | 16/20 | Good；两个P2，无发现的P0／P1 |

## P2：触屏按钮低于推荐44px

位置：src/TestTools.tsx:80—81，继承src/style.css的test-tools按钮样式。两个新按钮实际高度31px，宽142.3／132px；高于[WCAG2.2 AA的24×24px最小目标](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)，但低于[AAA增强目标的44×44px](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)，手机点按容错较低。建议后续用$impeccable adapt增加点击高度，仅调整测试工具，不扩大主战场HUD。

## P2：结果需要继续滚动

位置：src/TestTools.tsx:86。新结果底部950.5px，面板可视底部901px，scrollHeight2194／clientHeight722；最后一行初始被裁切，用户需要在内部再滚动。输出完整存在、功能可用，增加一步操作。建议$impeccable layout将当前结果靠近对应按钮，或在执行后将结果滚到可视范围。

## 其他证据和边界

诊断文字rgb(212,221,169)、面板rgba(33,24,15,.96)，按背后纯白的最坏混合背景计算对比约11.05:1；只涵盖该输出，不代表全站对比度认证。原模型、阴影、特效和地形在实际截图检查；未展开新视觉方向或全局重设计。

本审查只记录问题，没有导入概念选择／设计审批流程。可后续用Impeccable init归档现有产品约定，此项不构成本次功能发布前置。可选工具升级未执行，保留已安装v4.0.4。

建议顺序：$impeccable adapt → $impeccable layout → $impeccable polish。可以按需求逐项、一起或以其他顺序执行，修复后再跑$impeccable audit检查分数。
