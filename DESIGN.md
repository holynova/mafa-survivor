---
name: "玛法幸存者 · 旧城铜铸"
description: "手机优先的连续生存界面，采用暗铜边、金铸操作与朱红生命球。"
colors:
  ink: "#f8e7bc"
  muted-ink: "#d1bb8d"
  bronze-line: "#8b7047"
  panel: "#201a12"
  title-ink: "#fae7b8"
  action-ink: "#1d130a"
  focus: "#ffe198"
  experience-light: "#f4cc71"
  experience-dark: "#c08a33"
  gear-gain: "#c9d89d"
typography:
  body:
    fontFamily: "Songti SC, Noto Serif CJK SC, SimSun, serif"
    fontSize: "15px"
    lineHeight: 1.5
  panel-title:
    fontFamily: "Songti SC, Noto Serif CJK SC, SimSun, serif"
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.09em"
  clock:
    fontFamily: "Songti SC, Noto Serif CJK SC, SimSun, serif"
    fontSize: "20px"
rounded:
  frame: "0px"
  item-slot: "2px"
  switch: "12px"
spacing:
  panel-inline: "15px"
  panel-block: "17px"
  touch: "44px"
components:
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.frame}"
    padding: "17px 15px"
  primary-button:
    textColor: "{colors.action-ink}"
    rounded: "{rounded.frame}"
    height: "58px"
  clock:
    typography: "{typography.clock}"
    height: "37px"
---

## Overview

「旧城铜铸」是连续生存入口采用的方案 1。大厅的石门与描金题字先建立地貌，战斗中铜框只围住操作与状态，地面、角色和敌人由世界画面绘制。样式以 [survivor-bronze.css](src/survivor-bronze.css) 为准。

## Colors

暗棕面板衬暖白字，明亮金面留给推进当前流程的主操作和已选标签。红色用于生命与战场危险，金色用于经验。技能冷却在各自图标上显示。装备更替中的浅绿强调自动穿戴后的属性信息。

## Typography

界面标题与正文使用宋体衬线栈，面板标题取 29 px 和字重 700，正文取 15 px 与 1.5 行高。计时、生命、经验等级与结算数值使用等宽数字。大字模式放大菜单正文并允许内容换行。

## Layout

竖屏以战斗画面为底。计时牌居中，暂停位于右上角，首领条出现在顶栏下方。底部左侧是生命球，技能槽与血球对齐，等级与经验占最下方的整行。血瓶按钮展示原版金创药图标与库存。默认采用四列技能槽布局，学到五项或六项时扩展列数。触控区以 44 px 为下限。

宽度不超过 389 px 且已学习 5 至 6 项技能时，技能槽独占一行，小生命球与就绪条放在其上。短横屏采用更低的底栏，技能并列，升级选项改为三列。大厅、章节列表和浮层适配安全区及短视口，内容溢出时在面板内滚动。

## Elevation & Depth

铜框由图稿切片随容器缩放，面板内用深棕纹理承载文字与图标。暂停与结算降低战场明度，HUD 保留背景可见性。主操作按下时提亮，键盘焦点使用浅金描边。

## Shapes

容器和操作使用切角金属边，技能和装备保持近直角小槽位，生命球采用圆形。状态线、切角标题牌与阶段提示对齐同一布局边距。

## Components

- 大厅展示当前职业、起手技能与章节。章节选择使用带图的列表，保留十章顺序及实际可用状态。读到存档时显示「继续上局」。
- 战斗 HUD 使用即时生命、就绪、经验和技能冷却。点击技能槽打开管理页，首领条与反击预警使用场内事件和敌人状态。
- 强化面板将图标、技能名和真实升级收益放进同一行。重掷显示当前次数，精英宝箱与进化使用各自的真实候选项。
- 装备页以实装角色站姿居中，两侧为装备槽。数据存在时展示最近一次自动换装的前后属性；主操作锁定或解锁当前部位。
- 暂停优先显示继续、怪物音效和伤害数字。技能构筑、更多设置、保存退出和放弃本局保留各自操作入口。
- 结算显示本局生存时间、所得金币、造成伤害与实际换上的装备。再次出战与返回大厅位于战报入口前。

## Do's and Don'ts

实时状态与数据优先。设计稿中的示例数字、装备和关卡数量只说明版式。界面扩展沿用暗铜材质、窄边框与同组间距，留出读取敌人和地形的空间。
