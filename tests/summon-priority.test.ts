import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {setWorldLayouts} from '../src/world';
import {testSummonPriority} from '../src/test-mode';
import woma from './fixtures/woma-layout.json';
afterEach(()=>setWorldLayouts({}));
function arena(source:'beast'|'skeleton',mapId:'biche'|'mine'='biche'){
 const g=new Game();g.start('test',176,'taoist',false,mapId);g.test.spawning=false;g.basicCD=Infinity;
 const s=g.newSkill(source);s.cd=0;g.skills=[s];g.cast(s);s.cd=999;
 const pet=g.pets[0];Object.assign(pet,{x:g.player.x,y:g.player.y,cd:0});
 const enemy=(kind:string,x:number)=>{const e=g.spawnEnemy(kind);Object.assign(e,{x:g.player.x+x,y:g.player.y,hp:10000,maxHp:10000,speed:0,attackCD:999});return e};
 return {g,pet,enemy};
}
it.each(['beast','skeleton'] as const)('%s attacks a visible Boss in reach instead of the closer decoy',source=>{
 const {g,enemy}=arena(source);const decoy=enemy('orc',-20),boss=enemy('boss',source==='beast'?100:35);
 g.step(1/60);expect(boss.hp).toBeLessThan(10000);expect(decoy.hp).toBe(10000);
});
it('uses the same preference for an elite in reach without chasing a distant Boss past nearby enemies',()=>{
 const {g,pet,enemy}=arena('beast');const decoy=enemy('orc',-20),elite=enemy('orcWarrior',100),boss=enemy('boss',240);elite.elite=true;
 g.step(1/60);expect(elite.hp).toBeLessThan(10000);expect(decoy.hp).toBe(10000);expect(boss.hp).toBe(10000);expect(pet.moving).toBe(false);
});
it('does not turn toward a blocked Boss when an ordinary target is visible',()=>{
 const walk=Array.from({length:46*48},(_,i)=>i%46===12?0:1);
 setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:500,y:480}}});
 const {g,pet}=arena('beast','mine');Object.assign(pet,{x:550,y:480,cd:0});
 const boss=g.spawnEnemy('boss');Object.assign(boss,{x:650,y:480,hp:10000,maxHp:10000,speed:0,attackCD:999});
 const visible=g.spawnEnemy('orc');Object.assign(visible,{x:550,y:600,hp:10000,maxHp:10000,speed:0,attackCD:999});
 expect(g.attackLineClear(g.pets[0],boss)).toBe(false);g.step(1/60);expect(boss.hp).toBe(10000);expect(visible.hp).toBeLessThan(10000);
});

it('shows real priority damage on original Woma floor and never grants the sample in ordinary runs',()=>{
 setWorldLayouts({woma});const g=new Game();g.start('test',176,'warrior');
 expect(testSummonPriority(g)).toBe(true);expect(g.phase).toBe('paused');expect(g.classId).toBe('taoist');expect(g.mapId).toBe('woma');
 expect(g.test.summonPrioritySample).toBe(true);expect(g.enemies[0].hp).toBe(g.enemies[0].maxHp);expect(g.enemies[1].hp).toBeLessThan(g.enemies[1].maxHp);
 expect(g.effects.some(f=>f.kind==='beastflame')).toBe(true);expect(g.enemies.every(e=>g.canStand(e.x,e.y))).toBe(true);
 expect(g.gold).toBe(0);expect(g.exp).toBe(0);expect(g.kills).toBe(0);
 g.start('normal',176,'taoist',false,'biche');const run=g.runId;expect(testSummonPriority(g)).toBe(false);expect(g.runId).toBe(run);
 expect(g.skills).toHaveLength(1);expect(g.test.summonPrioritySample).toBe(false);
});
