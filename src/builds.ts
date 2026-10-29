import type {ClassId} from "./classes";
import type {SkillId} from "./spells";
export type RunBuild={id:string;name:string;classId:ClassId;equipment:readonly string[];skills:readonly {id:SkillId;rank:number}[]};
/** Suggested endpoints, not mandatory recipes or automatic grants in normal play. */
export const RUN_BUILDS:readonly RunBuild[]=[
 {id:"wizard-fire",name:"法师 · 雷火",classId:"wizard",equipment:["骨玉权杖","魔法长袍"],skills:[{id:"firewall",rank:6},{id:"lightning",rank:6},{id:"fireball",rank:3},{id:"shield",rank:2},{id:"repulse",rank:2},{id:"teleport",rank:1}]},
 {id:"wizard-ice",name:"法师 · 冰爆",classId:"wizard",equipment:["骨玉权杖","魔法长袍"],skills:[{id:"ice",rank:6},{id:"explosion",rank:6},{id:"fireball",rank:3},{id:"shield",rank:2},{id:"repulse",rank:2},{id:"teleport",rank:1}]},
 {id:"warrior-fire",name:"战士 · 半月烈火",classId:"warrior",equipment:["井中月","战神盔甲"],skills:[{id:"cleave",rank:6},{id:"firesword",rank:6},{id:"powerstrike",rank:3},{id:"swordsmanship",rank:2},{id:"dash",rank:2},{id:"thrust",rank:1}]},
 {id:"warrior-strike",name:"战士 · 普攻攻杀",classId:"warrior",equipment:["井中月","战神盔甲"],skills:[{id:"powerstrike",rank:6},{id:"swordsmanship",rank:6},{id:"firesword",rank:3},{id:"cleave",rank:2},{id:"dash",rank:2},{id:"thrust",rank:1}]},
 {id:"taoist-summon",name:"道士 · 神兽毒",classId:"taoist",equipment:["龙纹剑","灵魂战衣"],skills:[{id:"beast",rank:6},{id:"poison",rank:6},{id:"talisman",rank:3},{id:"heal",rank:2},{id:"skeleton",rank:2},{id:"ghost",rank:1}]},
 {id:"taoist-talisman",name:"道士 · 符毒",classId:"taoist",equipment:["龙纹剑","灵魂战衣"],skills:[{id:"talisman",rank:6},{id:"poison",rank:6},{id:"skeleton",rank:3},{id:"heal",rank:2},{id:"armor",rank:2},{id:"trap",rank:1}]},
];
