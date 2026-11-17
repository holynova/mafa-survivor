# 开发路线与进度管理

## 当前目标

按用户最新要求集中完成最佳实践优化，先处理后两章难度和构筑平衡，移动端问题最后处理，全部验收后统一发布。线上版本alpha.51，生产入口为https://xiaosang.cc/mafa-survivor/?survivor，经典入口保留。当前本地改动尚未发布；最新细节见[STATUS](STATUS.md)。

## 当前收尾清单

|事项|当前状态|证据与下一步|
|---|---|---|
|三章遭遇、成长及经济|规则已实施，平衡未通过|[构筑/导演对照](SURVIVOR-DIRECTOR-REVIEW.md)：默认及明确构筑保留失败，继续弱势战士/非神兽路线和真人体验|
|有限换技、双主修、补给、换装偏好|已实施并阶段验证|[优化清单](OPTIMIZATION-ROADMAP.md)；保留自由选择、测试无限与旧存档|
|十章悬赏、守阵与横向起手解锁|已实施，实际收益仍需反馈|[章节事件](SURVIVOR-CHAPTER-EVENTS.md)、[起手](SURVIVOR-START-UNLOCKS.md)|
|原版画面与清晰度|多尺寸/动态/灰度样本已验，完整设备矩阵仍缺|[QA](QA.md)；不把桌面移动视口称真机|
|原版声音、音乐与缓存|已实施并验证播放/开关/缓存，仍有缺音与听感验收|[音乐/声音](SURVIVOR-MUSIC-REVIEW.md)、[音源账本](audio-manifest.json)|
|战士新推荐半月/刺杀|正常开局/升级/320px UI与构筑测试通过|旧存档主修不覆盖，烈火路线仍保留弱势缺口|
|安卓Chrome拖动无摇杆|浏览器路径修复，用户实际设备仍未确认|按用户要求最后处理；原生D键当前补验也未通过|
|设备性能与可靠性|诊断/缓存/恢复工具已实施，物理设备预算仍未验|[诊断](SURVIVOR-DIAGNOSTICS.md)、[QA](QA.md)|
|最终交付|待全部门禁完成|更新版本/CHANGELOG后手动Cloudflare部署与线上试玩，不先发半成品|

完整最佳实践项目逐条状态见[OPTIMIZATION-ROADMAP](OPTIMIZATION-ROADMAP.md)，原始审查与验收目标见[SURVIVOR-BEST-PRACTICES-AUDIT](SURVIVOR-BEST-PRACTICES-AUDIT.md)。历史经典模式GDD审计保留于[ACCEPTANCE](ACCEPTANCE.md)，不把它与新版幸存者验收混为一张完成表。

## 验证与发布门禁

1. npm test、npm run assets:check、npm run build；涉及原图/声音时补对应逐像素/音频工具校验。
2. 真实浏览器交互与截图查看，记录实际视口、测试夹具和未覆盖范围。测试模式不污染正常记录，完成后关闭自建空间和临时服务。
3. 战斗或成长改动使用固定原图、多职业/多种子/多构筑回归，记录源码SHA/哈希及是否干净；模拟胜负不是玩家胜率。冻结测试期间不修改源码。
4. 未通过的平衡、物理设备、操作或听感验收继续保留，不能以单测数量抵消。
5. 全部验收后，按AGENTS.md最新发布方式，从干净游戏main构建；产物和收录写入作品集master，再手动发布共用xiaosang-portfolio Worker。目标为xiaosang.cc/mafa-survivor/，不新建发布分支、Action或Pages标签。
6. 验证线上version.json、原版资源、游戏与作品集入口及实际交互/截图，再更新发布回执。旧Pages、旧工作流和已发布版本保留回退。

## 记录入口

- [CHANGELOG](../CHANGELOG.md)：已发布玩家可见变更。
- [STATUS](STATUS.md)、[QA](QA.md)：最新实现与实际验证范围。
- [CLOUDFLARE](CLOUDFLARE.md)：现行子路径部署回执。
- [SIMULATION](SIMULATION.md)、[SAVES](SAVES.md)：历史机制矩阵与存档兼容。

本文件原有alpha.17/18与默认Pages阶段流程已过时，现以最新状态和仓库AGENTS.md为准；历史记录保留于CHANGELOG和发布文档，不再将旧流程列作当前发布步骤。
