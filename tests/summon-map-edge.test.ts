import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {setWorldLayouts} from '../src/world';
import bairimen from './fixtures/bairimen-layout.json';
afterEach(()=>setWorldLayouts({}));
it('walks along the real bottom corridor to a visible final boss without stalling against the world margin',()=>{
 setWorldLayouts({bairimen});const g=new Game();g.survivorMode=true;g.start('test',176,'taoist',false,'bairimen');g.test.spawning=false;
 g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;g.basicCD=Infinity;Object.assign(g.player,{x:168,y:1488});
 const s=g.newSkill('skeleton');s.cd=0;g.skills=[s];g.cast(s);const pet=g.pets[0];expect(pet).toBeDefined();s.cd=999;Object.assign(pet,{x:120,y:1501,cd:0});
 const boss=g.spawnEnemy('redMoon');Object.assign(boss,{x:24,y:1520,hp:10000,maxHp:10000,stompCD:999,speed:0});g.survival.finalBossId=boss.id;
 expect(g.canStand(pet.x,pet.y)).toBe(true);expect(g.attackLineClear(g.player,boss)).toBe(true);expect(g.navigation!.connected(pet,boss)).toBe(true);
 for(let i=0;i<100;i++)g.step(.05);
 expect(boss.hp).toBeLessThan(10000);expect(pet.x).toBeLessThan(100);
 expect(pet.x).toBeGreaterThanOrEqual(35);expect(pet.y).toBeLessThanOrEqual(1501);expect(g.canStand(pet.x,pet.y)).toBe(true);
});
