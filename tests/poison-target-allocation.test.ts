import {expect,it} from 'vitest';
import {Game} from '../src/game';

function arena(survivor=true){
 const g=new Game();g.survivorMode=survivor;g.start('test',176,'taoist');g.test.spawning=false;g.enemies=[];
 const near=g.spawnEnemy('orc'),far=g.spawnEnemy('orc');
 Object.assign(near,{x:g.player.x+40,y:g.player.y,hp:1,maxHp:100,speed:0});
 Object.assign(far,{x:g.player.x+90,y:g.player.y,hp:100,maxHp:100,speed:0});
 const talisman=g.newSkill('talisman'),poison=g.newSkill('poison');talisman.cd=poison.cd=0;g.skills=[talisman,poison];
 g.cast(talisman);expect(g.projectiles[0].targetId).toBe(near.id);expect(g.projectiles[0].damage).toBeGreaterThan(near.hp);
 return {g,near,far,poison};
}
it('uses green poison on another visible target when a lethal friendly shot is already in flight',()=>{
 const {g,near,far,poison}=arena();g.cast(poison);
 expect(far.greenPoison).toBeDefined();expect(near.greenPoison).toBeUndefined();
});
it('retains the only target rather than assuming an incoming shot cannot miss',()=>{
 const {g,near,poison}=arena();g.enemies=[near];g.cast(poison);expect(near.greenPoison).toBeDefined();
});
it('keeps red-poison support and classic target allocation unchanged',()=>{
 for(const original of [false,true]){const {g,near,far,poison}=arena(!original);if(!original)g.tao.poisonMode='red';g.cast(poison);expect(original?near.greenPoison:near.redPoison).toBeDefined();expect(far.greenPoison??far.redPoison).toBeUndefined();}
});
it('does not defer to nonlethal or enemy projectiles',()=>{
 for(const enemyShot of [false,true]){const {g,near,poison}=arena();if(enemyShot)g.projectiles[0].faction='enemy';else g.projectiles[0].damage=.1;g.cast(poison);expect(near.greenPoison).toBeDefined();}
});
it('counts combined live shots but ignores an expired shot',()=>{
 for(const expired of [false,true]){const {g,near,far,poison}=arena();g.projectiles[0].damage=.5;g.projectiles.push({...g.projectiles[0],id:g.nextEntityId(),life:expired?0:1});g.cast(poison);expect(expired?near.greenPoison:far.greenPoison).toBeDefined();}
});
