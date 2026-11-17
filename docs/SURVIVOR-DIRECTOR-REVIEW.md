# 第二阶段节奏与遭遇候选验证

2026-11-17。开发候选，未发布；不能视作已完成职业/章节平衡。

## 实现

- 最初三级经验需求保持20/34/49；第四级起增加倍率，最多2.4倍。不使用时间门槛、不按玩家输出动态增强怪物。
- 比奇/石墓/白日门在0/120/360/720/1080秒切换怪物构成权重，保持既有地图原版怪物池；精英、阶段Boss和最终Boss时刻不变。
- 新生存模式最多同时启动两个大招；包括跳跃、冲锋、震地、冲击波、精英近战/远程蓄力。已开始的动作不取消，不缩短预警，不重新瞄准；普通远程不新增指示线。旧模式不受预算限制。
- 石墓/白日门远程数量上限3→5→8，比奇最多12；其他地图保持旧上限。
- 首次获得补给机会时，候选模拟比奇金币868–1784、石墓4427–4747、白日门5126–6100（仅获得机会的样本）。补给基础价格250/500，按章节系数取整到10金币；石墓为1000/2000。该定价仍需实玩验证。

## 同种子机器人对照

各候选三地图×三职业×种子176/42/2026。相同控制器，但怪物构成改变后轨迹也不同；机器人未采购补给，不能当真人胜率。A已含新经验曲线/构成/大招预算，B再加入章节远程数量预算。

|候选|地图|职业|种子|结果|秒|首个8级秒|最终等级|金币收入|
|---|---|---|---|---|---:|---:|---:|---:|
|A|biche|wizard|176|won|1200|580|26|7538|
|A|biche|warrior|176|won|1233|499|27|8316|
|A|biche|taoist|176|dead|1320|490|19|3693|
|A|biche|wizard|42|won|1200|472|26|6655|
|A|biche|warrior|42|won|1202|479|27|7661|
|A|biche|taoist|42|dead|1320|457|22|5097|
|A|biche|wizard|2026|won|1200|468|26|7123|
|A|biche|warrior|2026|dead|477|—|12|1246|
|A|biche|taoist|2026|dead|1320|569|20|4336|
|A|shimu|wizard|176|dead|650|385|15|7942|
|A|shimu|warrior|176|dead|340|—|11|3392|
|A|shimu|taoist|176|dead|1176|392|23|22311|
|A|shimu|wizard|42|dead|357|320|11|3481|
|A|shimu|warrior|42|dead|326|—|10|3408|
|A|shimu|taoist|42|dead|1203|391|23|22070|
|A|shimu|wizard|2026|won|1200|432|26|28812|
|A|shimu|warrior|2026|dead|454|—|12|5033|
|A|shimu|taoist|2026|won|1253|412|24|23275|
|A|bairimen|wizard|176|dead|397|—|11|3158|
|A|bairimen|warrior|176|dead|427|—|11|3925|
|A|bairimen|taoist|176|dead|1132|509|18|10826|
|A|bairimen|wizard|42|won|1279|508|23|18776|
|A|bairimen|warrior|42|dead|539|—|13|5501|
|A|bairimen|taoist|42|dead|493|—|11|3830|
|A|bairimen|wizard|2026|won|1317|527|23|19990|
|A|bairimen|warrior|2026|dead|509|—|13|5031|
|A|bairimen|taoist|2026|dead|1125|582|18|10836|
|B|biche|wizard|176|won|1200|574|26|7384|
|B|biche|warrior|176|won|1200|569|27|8057|
|B|biche|taoist|176|dead|1320|490|22|4882|
|B|biche|wizard|42|won|1200|472|26|7001|
|B|biche|warrior|42|won|1211|587|27|7784|
|B|biche|taoist|42|won|1319|457|20|4345|
|B|biche|wizard|2026|won|1200|468|25|6658|
|B|biche|warrior|2026|dead|477|—|12|1246|
|B|biche|taoist|2026|won|1239|564|22|4887|
|B|shimu|wizard|176|dead|650|385|15|7942|
|B|shimu|warrior|176|dead|340|—|11|3392|
|B|shimu|taoist|176|dead|1176|392|23|22311|
|B|shimu|wizard|42|dead|357|320|11|3481|
|B|shimu|warrior|42|dead|326|—|10|3408|
|B|shimu|taoist|42|dead|1203|391|23|22070|
|B|shimu|wizard|2026|won|1200|432|26|28812|
|B|shimu|warrior|2026|dead|454|—|12|5033|
|B|shimu|taoist|2026|won|1253|412|24|23275|
|B|bairimen|wizard|176|dead|1171|526|23|20529|
|B|bairimen|warrior|176|dead|497|492|13|5039|
|B|bairimen|taoist|176|dead|966|597|18|11860|
|B|bairimen|wizard|42|dead|680|471|15|7604|
|B|bairimen|warrior|42|dead|750|490|16|9382|
|B|bairimen|taoist|42|dead|1320|465|24|21043|
|B|bairimen|wizard|2026|dead|1320|493|23|19789|
|B|bairimen|warrior|2026|dead|1320|521|26|26472|
|B|bairimen|taoist|2026|dead|1118|511|18|12322|

## 未通过项与下一步

- B比奇7/9通关，石墓2/9，白日门0/9；A分别5/9、2/9、2/9。不能声称削减弹幕必然让实战更容易。
- 石墓战士仍在326–454秒死亡，受伤来源以邪恶毒蛇弹道/黑野猪/首领近战为主。白日门多例被赤月震地持续消耗，部分到22分钟超时。
- 下一步分别检查机器人走位与玩家可用输出窗口，补给使用后表现，以及章节伤害/恢复窗口；不统一提高怪物血量，也不把机器人不通关直接等同真实玩家无法通关。
- 单核比奇9局另存alpha43-paced-single.json；原始逐分钟承伤、技能、金币数据在.artifacts/alpha43-{paced-dual,budgeted-dual,paced-single}.json。
- 当前只证明规则实现、构成边界、预警并发及价格扣费一致；完整平衡、真实手机性能、首次/熟练玩家反馈仍未完成。
