import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/game';
import {setWorldLayouts} from '../src/world';
import {heroPose} from '../src/hero-pose';
afterEach(()=>setWorldLayouts({}));
it('turns the warrior swing toward a reachable close target while retreating, without changing input',()=>{
 const g=new Game();g.start('normal',176,'warrior');g.skills=[];g.upgrades.accuracy=100;g.recompute();
 g.player.dir=2;g.player.moving=true;g.input={x:1,y:0};
 const e=g.spawnEnemy('orc');Object.assign(e,{x:g.player.x-40,y:g.player.y,hp:1000,maxHp:1000,speed:0});
 expect(g.basicAttack()).toBe(true);expect(e.hp).toBeLessThan(1000);
 expect(g.player.attackDir).toBe(6);expect(g.input).toEqual({x:1,y:0});
 expect(g.basicAttack()).toBe(false);
 const x=g.player.x;g.step(1/60);expect(g.player.x).toBeGreaterThan(x);
 expect(heroPose(g,123)).toMatchObject({motion:'attack',dir:6});
});

it.each(['wizard','taoist'] as const)('keeps the weak %s basic attack directional while moving',classId=>{
 const g=new Game();g.start('normal',176,classId);g.skills=[];
 g.player.dir=2;g.player.moving=true;
 const e=g.spawnEnemy('orc');Object.assign(e,{x:g.player.x-30,y:g.player.y,hp:1000,maxHp:1000,speed:0});
 expect(g.basicAttack()).toBe(false);expect(e.hp).toBe(1000);expect(g.player.dir).toBe(2);
});

it('does not aim through a wall or consume a charged swing while retreating',()=>{
 const walk=Array(46*48).fill(1);for(let y=0;y<48;y++)walk[y*46+10]=0;
 setWorldLayouts({mine:{width:2208,height:1536,cellWidth:48,cellHeight:32,walk,tiles:[],objects:[],spawn:{x:552,y:304}}});
 const g=new Game();g.start('test',176,'warrior',false,'mine');g.test.spawning=false;
 g.skills=[g.newSkill('firesword')];g.charges={firesword:true};g.player.dir=2;g.player.moving=true;
 const e=g.spawnEnemy('orc');Object.assign(e,{x:515,y:g.player.y,hp:1000,maxHp:1000,speed:0});
 expect(g.attackLineClear(g.player,e)).toBe(false);expect(g.basicAttack()).toBe(false);
 expect(g.charges).toEqual({firesword:true});expect(g.basicCD).toBe(0);expect(e.hp).toBe(1000);
 e.x=g.player.x+20;expect(g.attackLineClear(g.player,e)).toBe(true);
 expect(g.basicAttack()).toBe(true);expect(g.charges).toEqual({});
});
