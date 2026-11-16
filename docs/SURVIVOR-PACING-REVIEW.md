# 成长节奏第一轮验收（2026-11-16）

## 范围与方法

仅修改 survivor 改造分支。原版经验公式与线上版本不变。比奇以三职业、两个相同随机种子做前后对照；全图使用同一走位机器人和自动选项策略做回归。它不是真人胜率，也不会主动导航寻找固定首领。

## 比奇对照

| 指标 | 调整前 | 调整后 |
|---|---:|---:|
| 1 分钟等级 | 4–7 | 2–5 |
| 5 分钟等级 | 21–22 | 13–13 |
| 10 分钟等级 | 33–34 | 19–20 |
| 15 分钟等级 | 45–47 | 25–26 |
| 结束等级 | 62–66 | 29–35 |
| 首次进化时间 | 6.2–6.5 分钟 | 8.4–11.1 分钟 |

结束等级包括死亡样本，不能解读为通关者的统一等级；调整后比奇道士 seed 177 在 1237 秒死亡。

## 最终规则

- 第 L 级升下一级需要 round(20 + 14 × (L−1) + 0.35 × (L−1)²) 经验。无时间硬锁、无等级上限。
- 普通怪经验增益由 2 降至 1.5，保留章节归一化；定时精英追加经验倍率由 3 降至 1.5。
- 每击败两只精英掉一个强化宝箱，首领必掉，召唤援军不掉。计数随存档保存。
- 进化资格以怪物出生时间判断：8 分钟后出生才可掉进化宝箱，囤早期箱子不能绕过。已有旧存档箱子的资格保留。
- 2 分钟后以短恢复窗口与压力窗口交替刷怪；阶段首领出现后的 30 秒减少普通补怪速度。怪物强度不随玩家等级反向追平。
- 固定最终首领优先选取 160–260px 内、可达且有清晰攻击视线的位置；无合格点时保留原生成机制。
- 技能伤害、8 级上限、装备、职业起手技能及已有通关记录保留。

## 全图回归

| 地图 | 职业 | 结果 | 时长（秒） | 等级 |
|---|---|---|---:|---:|
| biche | wizard（seed 176） | won | 1200 | 33 |
| biche | warrior（seed 176） | won | 1200 | 35 |
| biche | taoist（seed 176） | won | 1300 | 29 |
| mine | wizard（seed 176） | won | 1200 | 30 |
| mine | warrior（seed 176） | won | 1200 | 33 |
| mine | taoist（seed 176） | won | 1200 | 28 |
| woma | wizard（seed 176） | won | 1269 | 32 |
| woma | warrior（seed 176） | won | 1200 | 34 |
| woma | taoist（seed 176） | won | 1448 | 36 |
| zuma | wizard（seed 176） | won | 1200 | 33 |
| zuma | warrior（seed 176） | won | 1288 | 31 |
| zuma | taoist（seed 176） | won | 1402 | 32 |
| mengzhong | wizard（seed 176） | won | 1200 | 35 |
| mengzhong | warrior（seed 176） | won | 1216 | 36 |
| mengzhong | taoist（seed 176） | dead | 982 | 29 |
| centipede | wizard（seed 176） | won | 1200 | 33 |
| centipede | warrior（seed 176） | won | 1200 | 37 |
| centipede | taoist（seed 176） | won | 1209 | 34 |
| stone | wizard（seed 176） | won | 1200 | 32 |
| stone | warrior（seed 176） | won | 1200 | 35 |
| stone | taoist（seed 176） | won | 1200 | 31 |
| shimu | wizard（seed 176） | won | 1200 | 35 |
| shimu | warrior（seed 176） | won | 1222 | 36 |
| shimu | taoist（seed 176） | dead | 1177 | 31 |
| bairimen | wizard（seed 176） | battle | 1999 | 24 |
| bairimen | warrior（seed 176） | dead | 402 | 15 |
| bairimen | taoist（seed 176） | dead | 862 | 24 |
| redmoon | wizard（seed 176） | won | 1200 | 35 |
| redmoon | warrior（seed 176） | won | 1200 | 38 |
| redmoon | taoist（seed 176） | battle | 1998 | 33 |
| biche | wizard（seed 177） | won | 1200 | 32 |
| biche | warrior（seed 177） | won | 1200 | 34 |
| biche | taoist（seed 177） | dead | 1237 | 29 |

33 个样本：{'won': 26, 'dead': 5, 'battle': 2}；有效存档采样 609 次。

仍需人工验证：白日门法师、赤月道士的自动测试达到步数预算时仍未完成首领战；末尾首领在远处且被地形遮挡。附近安全生成改善了有可用空地的情况，但未消除机器人回避固定首领的限制。白日门战士/道士、盟重道士、石墓道士另有死亡样本，不能据此直接调低所有首领数值。

本轮验证的是成长分配和功能正确性。后续真人测试重点：集中养两个主力是否有持续目标、宝箱频率是否太稀、18 分钟首领是否容易发现、道士最终战输出是否不足。
