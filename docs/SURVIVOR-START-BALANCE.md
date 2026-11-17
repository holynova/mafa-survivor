# 替换起手自然成长对照

## 方法与边界

源代码基线 `ead4cd8`，运行时仅模拟工具有未提交修改。三章（比奇、石墓、白日门）、三职业、种子176/42/2026；默认与替换各27局，额外骷髅＋施毒术9局，共63局。真实普通局成长，双主修，主动捡宝箱、有限采购、接取悬赏；不送属性、经验、装备或瞬移。选择替换起手不模拟账号解锁过程，解锁由独立测试覆盖。

这是一种固定移动/升级策略的回归样本，不是玩家胜率，也不是职业强弱排名。全局结果包含起手、推荐主修及后续随机路径的共同影响。1320秒死亡表示决战超时，不能混同生命耗尽。

模拟器增加 `--starter=default|alternative`，从实际开局主修读取策略，并记录起手、启动时提交与脏状态、策略哈希。哈希仅覆盖模拟工具与src/simulation.ts，不冒称全部代码快照。默认27局与alpha.44保存的27局按12项结果比较，324项完全一致。

## 结果

|章节|职业|默认通关/3|替换通关/3|
|---|---|---:|---:|
|biche|warrior|3|3|
|biche|wizard|3|3|
|biche|taoist|3|0|
|shimu|warrior|0|3|
|shimu|wizard|2|2|
|shimu|taoist|1|0|
|bairimen|warrior|0|0|
|bairimen|wizard|1|0|
|bairimen|taoist|0|0|

## 决策

- 保留默认起手和现有数值。本轮不发布为“平衡完成”。
- 刺杀与雷电具备可运行的长局路径，但石墓和白日门差异大，需继续分段检验，不能据三种子强行抹平差异。
- 骷髅＋火符样本比奇3局全部超时，石墓在129—328秒死亡。存在需要继续定位的输出/成长或走位配合问题；不是技能完全不施放。
- “骷髅＋施毒术”9局没有通关，石墓168/207/139秒死亡，白日门340/422/245秒死亡，没有支持它成为默认推荐的证据。因此不采纳该配套修改，保留试验记录。
- 下一步检查召唤攻击有效时间、追敌/回跟阈值、拾取经验路线及最终首领输出窗口，再决定调整技能或推荐。不得用降低所有敌人生命掩盖问题。

## 可复现命令

```sh
node tools/simulate-survival.mjs --maps=biche,shimu,bairimen --roles=warrior,wizard,taoist --seeds=176,42,2026 --strategy=dual --starter=default --seek-chests --use-recovery --accept-challenge --out=.artifacts/alpha45-default-starts.json
# 将 --starter 改为 alternative 得到替换组。
```

施毒试验仅在本地工具副本中将替换道士主修覆盖为 `['skeleton','poison']`，未改变游戏；其余策略与命令相同。原始完整报告保留在.artifacts/alpha45-*.json（本地忽略目录），下面保存可随源码审阅的终局摘要。

|组别|章节|职业|种子|结局|秒|首次升级秒|等级|击杀|
|---|---|---|---:|---|---:|---:|---:|---:|
|default-starts|biche|warrior|176|won|1200|12.0|26|2746|
|default-starts|biche|wizard|176|won|1200|22.3|23|2712|
|default-starts|biche|taoist|176|won|1287|31.7|23|2910|
|default-starts|biche|warrior|42|won|1201|15.0|27|2840|
|default-starts|biche|wizard|42|won|1208|23.2|26|2763|
|default-starts|biche|taoist|42|won|1277|21.2|22|2915|
|default-starts|biche|warrior|2026|won|1206|16.7|27|2871|
|default-starts|biche|wizard|2026|won|1200|20.3|24|2824|
|default-starts|biche|taoist|2026|won|1316|21.2|23|2921|
|default-starts|shimu|warrior|176|dead|487|9.9|13|529|
|default-starts|shimu|wizard|176|won|1200|19.4|26|2755|
|default-starts|shimu|taoist|176|won|1279|26.4|25|2857|
|default-starts|shimu|warrior|42|dead|337|9.3|11|317|
|default-starts|shimu|wizard|42|dead|678|25.3|16|862|
|default-starts|shimu|taoist|42|dead|1205|24.0|23|2833|
|default-starts|shimu|warrior|2026|dead|594|10.2|15|707|
|default-starts|shimu|wizard|2026|won|1200|23.6|25|2811|
|default-starts|shimu|taoist|2026|dead|1032|19.5|20|1828|
|default-starts|bairimen|warrior|176|dead|472|11.9|12|481|
|default-starts|bairimen|wizard|176|dead|1320|19.1|24|2853|
|default-starts|bairimen|taoist|176|dead|1320|22.5|21|2845|
|default-starts|bairimen|warrior|42|dead|1320|11.4|26|2854|
|default-starts|bairimen|wizard|42|won|1273|16.8|24|2857|
|default-starts|bairimen|taoist|42|dead|449|19.4|12|459|
|default-starts|bairimen|warrior|2026|dead|1320|14.6|26|2843|
|default-starts|bairimen|wizard|2026|dead|794|22.5|14|1098|
|default-starts|bairimen|taoist|2026|dead|826|18.9|18|1192|
|alternative-starts|biche|warrior|176|won|1200|13.5|27|2804|
|alternative-starts|biche|wizard|176|won|1200|21.2|25|2802|
|alternative-starts|biche|taoist|176|dead|1320|22.2|17|1188|
|alternative-starts|biche|warrior|42|won|1272|13.9|27|2853|
|alternative-starts|biche|wizard|42|won|1200|18.3|24|2805|
|alternative-starts|biche|taoist|42|dead|1320|21.3|14|1317|
|alternative-starts|biche|warrior|2026|won|1200|18.1|27|2803|
|alternative-starts|biche|wizard|2026|won|1278|16.4|26|2850|
|alternative-starts|biche|taoist|2026|dead|1320|21.0|12|632|
|alternative-starts|shimu|warrior|176|won|1202|9.9|26|2827|
|alternative-starts|shimu|wizard|176|won|1200|19.1|26|2791|
|alternative-starts|shimu|taoist|176|dead|328|16.4|9|274|
|alternative-starts|shimu|warrior|42|won|1207|11.2|26|2836|
|alternative-starts|shimu|wizard|42|won|1200|24.3|25|2816|
|alternative-starts|shimu|taoist|42|dead|163|11.2|5|86|
|alternative-starts|shimu|warrior|2026|won|1200|8.8|26|2783|
|alternative-starts|shimu|wizard|2026|dead|1141|25.5|24|2406|
|alternative-starts|shimu|taoist|2026|dead|129|12.5|5|81|
|alternative-starts|bairimen|warrior|176|dead|1320|12.2|26|2833|
|alternative-starts|bairimen|wizard|176|dead|1320|11.8|24|2850|
|alternative-starts|bairimen|taoist|176|dead|987|17.9|16|1332|
|alternative-starts|bairimen|warrior|42|dead|419|11.2|11|406|
|alternative-starts|bairimen|wizard|42|dead|793|12.2|15|1127|
|alternative-starts|bairimen|taoist|42|dead|1320|19.1|22|1997|
|alternative-starts|bairimen|warrior|2026|dead|1320|15.8|26|2856|
|alternative-starts|bairimen|wizard|2026|dead|1320|20.8|23|2603|
|alternative-starts|bairimen|taoist|2026|dead|758|18.7|14|771|
|skeleton-poison-probe|biche|taoist|176|dead|1320|22.2|14|857|
|skeleton-poison-probe|biche|taoist|42|dead|1320|21.3|13|797|
|skeleton-poison-probe|biche|taoist|2026|dead|899|21.0|9|315|
|skeleton-poison-probe|shimu|taoist|176|dead|168|16.4|5|106|
|skeleton-poison-probe|shimu|taoist|42|dead|207|11.2|5|126|
|skeleton-poison-probe|shimu|taoist|2026|dead|139|12.5|5|78|
|skeleton-poison-probe|bairimen|taoist|176|dead|340|17.9|8|243|
|skeleton-poison-probe|bairimen|taoist|42|dead|422|19.1|9|326|
|skeleton-poison-probe|bairimen|taoist|2026|dead|245|18.7|7|144|

## 召唤与拾取定位：种子42，比奇/石墓

额外两局完整观察，再加入经验观测复跑两局。用仅本地的updatePets包裹器记录每分钟宠物存活秒、攻击次数、移动但未位移秒；没有修改随机数、属性或输入。与原替换组核对phase/seconds/kills/damageDealt/damageTaken/skills六项均完全相同。该包裹器不进入产品运行时。

- 比奇前120秒：119.65宠物存活秒、126次攻击，移动但未位移0秒；石墓前120秒：119.60宠物存活秒、129次攻击，移动但未位移0秒。仅这些样本未见导航卡住，不能推断全部地图无寻路问题。
- 石墓120秒：58击杀、3级、40/49当前经验，地面206经验（40堆），150px内77经验。比奇120秒：60击杀、2级、28/34经验，地面160经验。
- 比奇1200秒地面2740经验，角色14级；说明终局输出评价受到未拾取成长资源的影响。不能把这直接视为骷髅技能基础伤害不足，也不能把固定机器走位失败当作真人必败。
- 工具的每分钟checkpoint新增experience字段：held、required、ground、piles、nearby（150px内，仅观测，不自动收取）。既有战斗指标保持一致。
- 下一步对照有意绕行拾取的移动策略与当前避险策略；保持真实碰撞与伤害、不送经验、不扩大自动拾取范围。确认策略因素后，再评估召唤路线是否需要面向玩家的数值/成长调整。

|章节|秒|级别|击杀|已持有经验|下级所需|地面经验|150px内经验|
|---|---:|---:|---:|---:|---:|---:|---:|
|biche|60|2|27|17|34|53|0|
|biche|120|2|60|28|34|160|6|
|biche|180|3|67|18|49|160|0|
|biche|240|5|92|62|114|120|0|
|biche|300|6|113|98|158|87|0|
|biche|360|6|155|157|158|197|9|
|biche|420|7|159|70|210|138|0|
|biche|480|7|193|144|210|233|15|
|biche|540|7|224|161|210|457|6|
|biche|600|8|284|52|270|680|5|
|biche|660|9|298|19|340|522|0|
|biche|720|9|347|137|340|622|12|
|biche|780|9|379|266|340|673|5|
|biche|840|10|406|103|418|646|38|
|biche|900|11|460|0|468|662|14|
|biche|960|12|516|14|519|503|0|
|biche|1020|12|553|74|519|676|0|
|biche|1080|12|730|384|519|1376|30|
|biche|1140|13|927|10|572|2566|0|
|biche|1200|14|1086|119|627|2740|18|
|biche|1260|14|1309|201|627|4055|0|
|shimu|60|3|27|9|49|79|11|
|shimu|120|3|58|40|49|206|77|
