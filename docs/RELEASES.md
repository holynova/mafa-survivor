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


## alpha.8 历史发布

[v0.1.0-alpha.8](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.8)发布提交`6ba8a893c905be2f89663ae14ec7dad618908d6a`；[工作流40556922133](https://github.com/holynova/mafa-survivor/actions/runs/40556922133)build／deploy／release成功，Source checks 40556899413成功。250项游戏测试、6项Python资源测试、原图像素／WAV／生产构建通过。干净提交36局真实模拟与冻结前逐项一致，0不变量异常、仅2局通关，完整平衡仍未通过。公网版本、四源地图及walk、42图集、28原WAV核验通过；真实公网菜单与本地生产战斗截图、完整模拟报告和HTTP证据已附Release。公网试玩按钮操作仍超时，最终线上战斗交互待补；用户现有测试页未操作。


## alpha.9 历史发布

[v0.1.0-alpha.9](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.9)固定提交`56525d7cb8cf794fff396231537403de603e886e`；[工作流40596882903](https://github.com/holynova/mafa-survivor/actions/runs/40596882903)build／deploy／release成功，Source checks 40596866324成功。258项游戏测试、6项Python、原图像素／WAV／生产构建通过。冻结36局0不变量异常、2局比奇法师通关、12局战士0通关，完整平衡未过。公网版本／四源地图／walk／42图集／28原WAV核验通过；真实公网菜单和31秒普通试玩的移动／攻击／受伤／暂停已验证，后续升级／商店与新测试工具线上流程因连接超时待补。Release的三张最终本地截图、两张真实公网图片和模拟／HTTP报告来源已明确标注。


## alpha.10 历史发布

[v0.1.0-alpha.10](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.10)固定提交`1bab703469a1f00f208b70c7373f27f581b21a7f`；[工作流40603853104](https://github.com/holynova/mafa-survivor/actions/runs/40603853104)build／deploy／release成功，Source checks 40603811513成功。268项游戏测试、6项Python、原图像素／WAV／生产构建通过；冻结36局结果与冻结前完全一致，0不变量异常、仅1通关，完整平衡未过。公网版本／四源地图／walk／42图集／28原WAV全部核验通过；真实公网新版菜单截图已取得，按钮操作超时，最终新版战斗／商店交互待补。本地生产商店与70→84px属性、模型／阴影截图和完整模拟／HTTP报告已附Release，不以alpha.9公网试玩冒作alpha.10验收。


## alpha.11 历史发布

[v0.1.0-alpha.11](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.11)固定提交`00fd3dd2661fb407fdcd0eac143cea3294a6e817`；[工作流40622617989](https://github.com/holynova/mafa-survivor/actions/runs/40622617989)build／deploy／release成功，Source checks 40622380444成功。280项游戏测试、6项Python、原图像素／WAV／生产构建、本地真实商店与输入／模型截图通过。干净冻结36局含购买trace与冻结前逐项一致，0不变量异常、2局法师通关；同V5旧引擎3局通关，完整平衡仍未过。

公网版本original／alpha.11／00fd3dd、四源地图与walk、42图集、28原WAV哈希和JS入口通过；后台IAB真实菜单AX显示新版，但截图20秒超时，恢复连接也15秒超时，最终alpha.11公网截图／交互仍未完成。Release只附四张真实本地图片与五份JSON（冻结完整报告／汇总、旧引擎＋V5、三组比较、公网HTTP）；没有用旧截图或本地截图替代公网证据。用户现有测试页面和前台Chrome未操作。


## alpha.12 历史发布

[v0.1.0-alpha.12](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.12)固定提交`6b28d9d659e034bf9c4db577703ebf1f066a6677`；[工作流40628990100](https://github.com/holynova/mafa-survivor/actions/runs/40628990100)build／deploy／release及Source checks 40628777694成功。288项游戏测试、6项Python、原图像素／WAV／生产构建、本地真实森林与矿洞截图通过。干净36局（同V5）含shopTrace与alpha.11逐项一致，0不变量异常／2法师通关，完整平衡仍未过。

公网alpha.12／original／6b28d9d、四源地图与walk、42图集、28原WAV哈希和JS入口通过。后台IAB导航25秒超时，最终公网交互／截图仍未完成；Release六张图均标本地来源，另附冻结报告／汇总及公网HTTP。用户现有测试页和前台Chrome未操作，本次独立本地测试页完成后已清理。


## alpha.13 历史发布

[v0.1.0-alpha.13](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.13)固定提交`98434ee9ae4021b4d99894a8e47381276c54ab61`；[工作流40653990168](https://github.com/holynova/mafa-survivor/actions/runs/40653990168)build／deploy／release及Source checks 40653711452成功。313项游戏测试、6项Python、原图／WAV／生产构建、本地真实回复／交易／模型／输入截图通过。干净冻结36局与冻结前逐项相同，0不变量异常／2法师通关；同V5旧引擎亦2通关，新版4局法师实际回复，战士样本未购买新道具，整体平衡未过。

公网alpha.13／original／98434ee、四源地图与walk、42图集、28原WAV哈希和JS入口核验通过；后台IAB导航25秒超时，最终公网实操／截图仍未完成。Release六张图均标本地来源，另附完整冻结／摘要／旧引擎／比较／HTTP五份JSON；用户现有测试页与前台Chrome未操作，本次独立本地页验收后已清理。


## alpha.14 历史发布

[v0.1.0-alpha.14](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.14)固定提交`98db73e965449e44728648928fc40ccd58479e64`；[工作流40666265185](https://github.com/holynova/mafa-survivor/actions/runs/40666265185)build／deploy／release及Source checks 40666010504成功。338项游戏测试、6项Python、原图／WAV／生产构建、本地真实文件下载／导入／恢复撤回与模型／输入截图通过。存档整体替换、预览过期保护和同事务回滚已验；不含局中续玩，不作为新平衡证据。

公网alpha.14／original／98db73e、四源地图与walk、42图集、28原WAV哈希和JS入口通过；后台IAB导航30秒超时，最终公网UI／截图仍未完成。Release附三张明确本地截图与存档QA摘要／公网HTTP两份JSON，不公开实际存档文件。用户现有页／前台Chrome未操作。


## alpha.15 历史发布

[v0.1.0-alpha.15](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.15)固定提交`06f5fd2190fc5ccbbaa97a2836b9d5a5a2882c0b`；[工作流40687523329](https://github.com/holynova/mafa-survivor/actions/runs/40687523329)build／deploy／release及Source checks 40687444088成功。377项游戏测试、6项Python、原图／WAV／生产构建、本地生产页天赋购买／续玩与公网实机天赋页／开局→刷新→继续通过。干净36局0不变量异常、2比奇法师通关，与alpha.13仅2局击杀／时长微差；完整平衡仍未通过。

公网alpha.15／original／06f5fd2、四源地图与walk、42图集、28原WAV哈希和JS入口通过；本轮公网UI实操与截图（天赋页、续玩卡片）已完成，页脚版本号核对一致。Release附七张截图与三份JSON（干净矩阵、摘要、公网HTTP），不公开本机存档。用户现有页／前台Chrome未操作。


## 当前公开版本：alpha.16

[v0.1.0-alpha.16](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.16)固定提交`adb2d99972b4d3d6c145902ef59237a39f82f9bb`；[工作流40693078796](https://github.com/holynova/mafa-survivor/actions/runs/40693078796)build／deploy／release及Source checks 40693072814成功。390项游戏测试、6项Python、原图／WAV／生产构建、本地生产页结算与公网试玩结算／战绩展开通过。干净36局（5f415fb、sourceDirty=false）与alpha.15逐局深比较完全一致，仍2比奇法师通关、0不变量异常；完整平衡未通过。

公网alpha.16／original／adb2d99、四源地图与walk、42图集、28原WAV哈希和JS入口通过；公网实机完成试玩结算DPS／占比／购买／属性标签与征战记录展开，页脚版本号核对一致。Release附五张截图与三份JSON（干净矩阵、摘要、公网HTTP），不公开本机存档。用户现有页／前台Chrome未操作。


## alpha.17 已发布

[v0.1.0-alpha.17](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.17)固定提交`0b21870dfc4947185b4164b70277e5d6c8d83472`；[Actions 40701022514](https://github.com/holynova/mafa-survivor/actions/runs/40701022514)构建／部署／Release及Source checks 40701022378成功。403测试、6Python、原图／WAV／生产构建通过；干净6283837的36局0异常／4法师通关，整体平衡仍未过。公网version original与标签一致，后台真实喷火与红蓝毒定格已操作并截图，证据附Release。


## alpha.19 血瓶与原版掉落、伤亡反馈

[v0.1.0-alpha.19](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.19)发布提交`c25475c906978d016c2099c622a11c076fa6b0e3`；[Pages与Release](https://github.com/holynova/mafa-survivor/actions/runs/40749747882)和[Source checks](https://github.com/holynova/mafa-survivor/actions/runs/40749741925)成功。429项游戏测试／7项Python／原图像素／29个WAV／生产构建通过，干净13ae123固定V5控制器72局0异常、4法师通关，整体平衡仍未通过。公网版本original／alpha.19／c25475c匹配；真实后台浏览器验证五档金币、原版掉落、血瓶实际回复7、受击和阵亡音效计数各1、测试结算0结晶。截图、诊断和矩阵附Release，未操作用户现有页面。


## alpha.20 召唤物隔墙与自动寻药

[v0.1.0-alpha.20](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.20)发布提交`1e76796b5c5964e5dfef9e15c74cd81ddc8b84ef`；[Pages与Release](https://github.com/holynova/mafa-survivor/actions/runs/40761322771)及[Source checks](https://github.com/holynova/mafa-survivor/actions/runs/40761318154)成功。438项游戏测试、7项Python、资源原图／WAV／生产构建通过，干净22afd57同V6控制器72局0异常／3通关，旧引擎同V6也是3通关，整体平衡仍未达标。真实公网后台样例验证神兽同锥形内可见16／墙后0，自动走位75→135实际回血60；版本original／alpha.20／1e76796匹配，截图、诊断与完整对照附Release。用户现有页面保留。


## alpha.21 自动接敌校准与完整前景轮廓

[v0.1.0-alpha.21](https://github.com/holynova/mafa-survivor/releases/tag/v0.1.0-alpha.21)发布提交`115fa12458b7e1a97a3d733571d2d942661b0a04`；[Pages与Release](https://github.com/holynova/mafa-survivor/actions/runs/40793782936)及[Source checks](https://github.com/holynova/mafa-survivor/actions/runs/40793778301)成功。451项游戏测试／7项Python／原图原WAV／构建通过，32bbb57干净V7的72局0异常。普通战斗规则未变；策略对照法师3→4通关、战士推进中位数7→8.5、道士HP耗尽13→18，不能称作游戏平衡改善。原赤月前景只遮脚时的完整轮廓已公网截图；关闭无敌的赤月26秒581伤害／0承伤，沃玛隔离近战46秒483伤害／0承伤。公网版本original／alpha.21／115fa12匹配，截图、诊断与原始策略对照附Release；整体平衡未达标。
