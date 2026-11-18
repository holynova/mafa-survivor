import {describe,it,expect} from 'vitest';
import {Game} from '../src/game';
import {survivalChoices,survivalTick,survivalBonuses} from '../src/survivor';
const run=()=>{const g=new Game();g.survivorMode=true;g.start('normal',176);return g;};
describe('continuous survival isolation and progression',()=>{
 it('does not clear enemies or enter a shop at 75 seconds',()=>{const g=run();g.clock=74.99;g.waveTime=74.99;g.exp=0;const e=g.spawnEnemy();g.step(.02);expect(g.phase).toBe('battle');expect(g.enemies.some(x=>x.id===e.id)).toBe(true);});
 it('20 minutes alone cannot bypass the final boss',()=>{const g=run();g.clock=1199.99;g.step(.02);expect(g.phase).toBe('battle');expect(g.survival.finalBossId).toBeGreaterThan(0);g.survival.finalBossDefeated=true;g.step(.02);expect(g.phase).toBe('won');expect(g.result?.crystals).toBe(0);});
 it('pause never advances clock or director',()=>{const g=run();g.pause();g.step(40);expect(g.clock).toBe(0);expect(g.enemies.length).toBe(0);});
 it('rank eight progresses independently of legacy wave lock',()=>{const g=run();const s=g.skills[0];s.rank=7;g.phase='upgrade';g.choices=survivalChoices(g);const c=g.choices.find(c=>c.skill===s.id)!;expect(c).toBeTruthy();g.choose(c.id);expect(s.rank).toBe(8);expect(s.power).toBe(survivalBonuses(s).power);});
 it('full inventory never offers new skills or a seventh passive',()=>{const g=run();g.skills=['fireball','lightning','firewall','shield','ice','nova'].map(id=>g.newSkill(id as 'fireball',6));g.skills.forEach(s=>s.rank=8);g.survival.charms={flame:5,haste:5,area:5,life:5,magnet:5,recovery:5};expect(survivalChoices(g)).toEqual([]);});
 it('eligible chest evolves exactly once and pauses',()=>{const g=run();g.skills[0].rank=8;g.survival.charms.flame=1;g.survival.chests=[{id:1,x:g.player.x,y:g.player.y,eligible:true}];survivalTick(g);expect(g.survival.evolved).toEqual(['fireball']);expect(g.phase).toBe('paused');expect(g.survival.chests).toHaveLength(0);});
 it('early chest cannot evolve a ready weapon',()=>{const g=run();g.skills[0].rank=8;g.survival.charms.flame=1;g.survival.chests=[{id:1,x:g.player.x,y:g.player.y,eligible:false}];survivalTick(g);expect(g.survival.evolved).toHaveLength(0);expect(g.phase).toBe('upgrade');});
 it('evolution applies real splash without recursive chains',()=>{const g=run();g.survival.evolved=['fireball'];const a=g.spawnEnemy('scarecrow'),b=g.spawnEnemy('scarecrow');a.x=b.x=1100;a.y=b.y=760;a.hp=b.hp=100;g.hit(a,20,'fireball');expect(b.hp).toBeLessThan(100);expect(a.hp).toBe(80);});
 it('new run clears charms, evolution and touch input',()=>{const g=run();g.survival.charms.flame=5;g.survival.evolved=['fireball'];g.touchInput={x:1,y:0};g.start('normal');expect(g.survival.evolved).toEqual([]);expect(g.survival.charms).toEqual({});expect(g.touchInput.x).toBe(0);});
});

describe('survival director and role-specific growth',()=>{
 it('clears touch input when pausing',()=>{const g=run();g.touchInput={x:1,y:-1};g.pause();expect(g.touchInput).toEqual({x:0,y:0});});
 it('spawns the chapter boss at five minutes without a shop',()=>{const g=run();g.clock=300;survivalTick(g);expect(g.enemies.some(e=>e.kind==='boss')).toBe(true);expect(g.phase).toBe('battle');const n=g.enemies.length;survivalTick(g);expect(g.enemies).toHaveLength(n);});
 it('never offers unrelated class damage charms',()=>{const g=run();for(let i=0;i<100;i++)expect(survivalChoices(g).some(c=>['p:edge','p:spirit'].includes(c.id))).toBe(false);});
 it('support skill rank seven extends control instead of adding useless damage',()=>{const g=run();const s=g.newSkill('repulse');s.rank=7;const b=survivalBonuses(s);expect(b.localCDR).toBe(15);expect(b.power).toBe(0);});
 it('lightning evolution jumps beyond the first target radius',()=>{const g=run();g.survival.evolved=['lightning'];const a=g.spawnEnemy('scarecrow'),b=g.spawnEnemy('scarecrow'),c=g.spawnEnemy('scarecrow');[a,b,c].forEach((e,i)=>{e.x=800+i*150;e.y=700;e.hp=100;});g.hit(a,30,'lightning');expect(b.hp).toBeLessThan(100);expect(c.hp).toBeLessThan(b.hp+5);expect(c.hp).toBeGreaterThan(b.hp);});
});

it('doubles survivor ordinary HP with a three-minute ramp in harder chapters',async()=>{
 const {tuneSurvivalEnemy}=await import('../src/survivor');
 const g=run();
 const forest=g.spawnEnemy('scarecrow');
 const forestHP=forest.hp;
 tuneSurvivalEnemy(g,forest,'normal');
 expect(forest.hp).toBeCloseTo(Math.max(8,forestHP*.65*1.2)*2);

 g.mapId='zuma';
 const early=g.spawnEnemy('zumaGuard');
 const originalHP=early.hp,originalDefense=early.defense!;
 tuneSurvivalEnemy(g,early,'normal');
 expect(early.hp).toBeCloseTo(Math.max(8,originalHP*.65/3.8*1.2)*1.05);
 expect(early.defense).toBeCloseTo(originalDefense/3.8);

 g.clock=180;
 const late=g.spawnEnemy('zumaGuard');
 tuneSurvivalEnemy(g,late,'normal');
 expect(late.hp).toBeCloseTo(Math.max(8,originalHP*.65/3.8*(1.2+.25*180/1200))*2);
 const legacy=new Game();
 legacy.mapId='zuma';
 expect(legacy.spawnEnemy('zumaGuard').hp).toBe(originalHP);
});

describe('survival passive tradeoffs',()=>{
 it('offers detection and movement passives without using extra slots',()=>{const g=run(),seen=new Set<string>();for(let i=0;i<300;i++)survivalChoices(g).forEach(c=>{if(c.id.startsWith('p:'))seen.add(c.id);});expect(seen.size).toBe(8);expect(seen.has('p:eagle')).toBe(true);expect(seen.has('p:swift')).toBe(true);});
 it('increases actual detection from 300 to 450 through five choices',()=>{const g=run();expect(g.detectionRange).toBe(300);for(let n=0;n<5;n++){let c;for(let i=0;i<300&&!c;i++)c=survivalChoices(g).find(c=>c.id==='p:eagle');expect(c).toBeTruthy();g.choices=[c!];g.phase='upgrade';g.choose(c!.id);expect(g.detectionRange).toBeCloseTo(300+30*(n+1));}expect(g.survival.charms.eagle).toBe(5);});
 it('rejects a stale seventh passive choice after slots fill',()=>{const g=run();g.survival.charms={flame:1,haste:1,area:1,life:1,magnet:1,recovery:1};g.choices=[{id:'p:eagle',kind:'stat',stat:'detection_range',value:10,name:'鹰眼戒指',description:''}];g.phase='upgrade';g.choose('p:eagle');expect(g.survival.charms.eagle).toBeUndefined();expect(g.detectionRange).toBe(300);});
});
it('eagle extends actual fireball targeting without making it global',()=>{const g=run();const e=g.spawnEnemy('scarecrow');e.x=g.player.x+320;e.y=g.player.y;const s=g.skills[0];s.cd=0;g.cast(s);expect(g.projectiles).toHaveLength(0);g.upgrades.detection_range=10;g.recompute();s.cd=0;g.cast(s);expect(g.projectiles.length).toBeGreaterThan(0);g.projectiles=[];e.x=g.player.x+460;g.upgrades.detection_range=50;g.recompute();s.cd=0;g.cast(s);expect(g.projectiles).toHaveLength(0);});
