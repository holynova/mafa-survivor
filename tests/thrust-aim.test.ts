import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {heroPose} from '../src/hero-pose';
import {effectSprites} from '../src/effect-visual';
import {setWorldLayouts} from '../src/world';
import {testMeleeAim} from '../src/test-mode';
import woma from './fixtures/woma-layout.json';
afterEach(()=>setWorldLayouts({}));
function arena(rank=2,mapId:'biche'|'mine'='biche'){
 const g=new Game();g.start('test',176,'warrior',false,mapId);g.test.spawning=false;g.basicCD=Infinity;
 g.upgrades.accuracy=100;g.recompute();const s=g.newSkill('thrust',rank);s.cd=0;g.skills=[s];
 const enemy=(kind:string,x:number,y=0)=>{const e=g.spawnEnemy(kind);Object.assign(e,{x:g.player.x+x,y:g.player.y+y,hp:10000,maxHp:10000,speed:0,attackCD:999});return e};
 return {g,s,enemy};
}
it('lets rank-two automatic thrust face a Boss while retreating, with one real forward line and unchanged movement',()=>{
 const {g,s,enemy}=arena();g.player.dir=2;g.player.moving=true;g.input={x:1,y:0};
 const decoy=enemy('orc',30),boss=enemy('boss',-75),offLine=enemy('orc',-65,45);
 g.cast(s);expect(boss.hp).toBeLessThan(10000);expect(decoy.hp).toBe(10000);expect(offLine.hp).toBe(10000);
 expect(g.player.attackDir).toBe(6);expect(g.effects.find(f=>f.kind==='thrust')?.dir).toBe(6);expect(g.input).toEqual({x:1,y:0});
 const x=g.player.x;g.step(1/60);expect(g.player.x).toBeGreaterThan(x);expect(heroPose(g,123)).toMatchObject({motion:'attack',dir:6});
 const hp=boss.hp;s.cd=0;g.cast(s);expect(boss.hp).toBe(hp);expect(s.cd).toBe(0);
});
it('retains rank-one directional multi-target requirements and actual per-hit damage',()=>{
 const one=arena(1);one.g.player.moving=true;one.g.player.dir=2;const rear=one.enemy('boss',-75);one.g.cast(one.s);expect(rear.hp).toBe(10000);expect(one.s.cd).toBe(0);
 const stationary=arena(),retreat=arena();for(const a of [stationary,retreat]){a.g.player.dir=6;a.enemy('boss',-75);}
 retreat.g.player.dir=2;retreat.g.player.moving=true;stationary.g.cast(stationary.s);retreat.g.cast(retreat.s);
 expect(retreat.g.enemies[0].hp).toBe(stationary.g.enemies[0].hp);
});
it('does not let an out-of-range Boss steal a nearby thrust',()=>{
 const {g,s,enemy}=arena();g.player.dir=6;g.player.moving=true;const far=enemy('boss',-150),near=enemy('orc',60);
 g.cast(s);expect(far.hp).toBe(10000);expect(near.hp).toBeLessThan(10000);expect(g.player.attackDir).toBe(2);
});

it('retains manual directional aiming even at rank two',()=>{
 const {g,s,enemy}=arena();g.player.moving=true;g.player.dir=2;const boss=enemy('boss',-40),front=enemy('orc',60);
 g.cast(s,true);expect(boss.hp).toBe(10000);expect(front.hp).toBeLessThan(10000);expect(g.player.attackDir).toBe(2);
});
it('filters walls before giving a Boss priority',()=>{
 const walk=Array(46*48).fill(1);for(let x=0;x<46;x++)walk[10*46+x]=0;
 setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:504,y:304}}});
 const {g,s,enemy}=arena(2,'mine');g.player.moving=true;g.player.dir=4;
 const blocked=enemy('boss',0,64),visible=enemy('orc',0,-60);expect(g.attackLineClear(g.player,blocked)).toBe(false);
 g.cast(s);expect(blocked.hp).toBe(10000);expect(visible.hp).toBeLessThan(10000);expect(g.player.attackDir).toBe(0);
});

it('keeps the original thrust effect aligned with its actual non-cardinal hit line',()=>{
 const {g,s,enemy}=arena();enemy('boss',80,20);g.cast(s);const fx=g.effects.find(f=>f.kind==='thrust')!;
 expect(fx.aimAngle).toBeCloseTo(Math.atan2(20,80));const sprite=effectSprites(fx)[0];expect(sprite.animation).toBe(`thrust/${fx.dir}`);
 expect(sprite.rotation).toBeCloseTo(Math.atan2(20,80)-((fx.dir!-2)*Math.PI/4));
});

it.each(['thrust','cleave'] as const)('runs the %s comparison with real movement on source floor and refuses ordinary play',kind=>{
 setWorldLayouts({woma});const g=new Game();g.start('test');expect(testMeleeAim(g,kind)).toBe(true);expect(g.phase).toBe('paused');
 const result=g.test.meleeAimSample!;expect(result.beforeDamage).toBe(0);expect(result.afterDamage).toBeGreaterThan(0);expect(result.endX).toBeGreaterThan(result.startX);expect(result.hits).toBe(kind==='thrust'?1:3);
 expect(g.effects.some(f=>f.kind===kind)).toBe(true);expect(g.canStand(g.player.x,g.player.y)).toBe(true);expect(g.gold).toBe(0);expect(g.exp).toBe(0);
 g.start('normal',176,'warrior',false,'biche');const id=g.runId;expect(testMeleeAim(g,kind)).toBe(false);expect(g.runId).toBe(id);expect(g.test.meleeAimSample).toBeNull();
});
