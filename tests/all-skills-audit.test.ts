import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {Game,type Skill} from '../src/game';
import {SKILLS,type SkillId} from '../src/spells';
import {survivalBonuses} from '../src/survivor';
import {invisible,canDetect,actorBuffs} from '../src/taoist';
import {effectSprites} from '../src/effect-visual';
const animations=JSON.parse(readFileSync('docs/asset-manifest.json','utf8')).animations;
function arena(id:SkillId,rank=1,survivor=true){
 const g=new Game();g.survivorMode=survivor;g.start('test',176,SKILLS.find(s=>s.id===id)!.classId);
 g.test.spawning=false;g.enemies=[];g.clock=2;g.level=20;g.player.hp=g.maxHP*.25;
 const s=g.newSkill(id,rank);s.rank=rank;if(survivor)Object.assign(s,survivalBonuses(s));s.cd=0;g.skills=[s];
 for(let i=0;i<5;i++){const e=g.spawnEnemy(id==='holy'?'skeleton':'orc');Object.assign(e,{x:g.player.x+36+i*10,y:g.player.y+(i%2)*8,hp:10000,maxHp:10000,speed:0,level:1,attackCD:100});}
 if(id==='reveal')g.enemies[0].elite=true;
 return {g,s};
}
function verify(g:Game,s:Skill){
 const before=g.player.hp,origin={x:g.player.x,y:g.player.y};g.cast(s);
 if(['swordsmanship','spirit'].includes(s.id)){
  expect(s.cd).toBe(0);g.basicCD=0;g.basicAttack();expect(g.basicCD).toBeGreaterThan(0);return;
 }
 expect(s.cd,`${s.id} never cast`).toBeGreaterThan(0);
 if(['powerstrike','firesword'].includes(s.id)){g.basicCD=0;g.basicAttack();expect(g.effects.some(f=>f.kind===s.id)).toBe(true);}
 else if(['fireball','bigfireball','talisman'].includes(s.id))expect(g.projectiles.some(p=>p.skill===s.id)).toBe(true);
 else if(['heal','groupHeal'].includes(s.id)){expect(g.player.hp).toBeGreaterThan(before);expect(g.tao.healing[s.id]).toBeGreaterThan(0);}
 else if(s.id==='invisible'||s.id==='groupInvisible')expect(invisible(g,0)).toBe(true);
 else if(s.id==='ghost'||s.id==='armor')expect(actorBuffs(g,0)[s.id==='ghost'?'ghostUntil':'armorUntil']).toBeGreaterThan(g.clock);
 else if(s.id==='shield')expect(g.player.shieldUntil).toBeGreaterThan(g.clock);
 else if(s.id==='skeleton'||s.id==='beast')expect(g.pets.some(p=>p.source===s.id)).toBe(true);
 else if(s.id==='reveal')expect(g.enemies[0].revealUntil).toBeGreaterThan(g.clock);
 else if(s.id==='trap')expect(g.enemies.some(e=>(e.trapUntil??0)>g.clock)).toBe(true);
 else if(s.id==='poison')expect(g.enemies.some(e=>e.greenPoison)).toBe(true);
 else if(s.id==='teleport'||s.id==='dash')expect(Math.hypot(g.player.x-origin.x,g.player.y-origin.y)).toBeGreaterThan(100);
 else if(s.id==='repulse')expect(g.enemies.some(e=>e.x-origin.x>100)).toBe(true);
 else if(s.id!=='firewall'&&s.id!=='charm')expect(g.enemies.some(e=>e.hp<e.maxHp)).toBe(true);
 else expect(g.effects.some(f=>f.kind===s.id)).toBe(true);
 for(const f of g.effects)for(const sprite of effectSprites(f))expect(animations[sprite.animation]?.length,`${s.id}: missing ${sprite.animation}`).toBeGreaterThan(0);
}
describe('all 33 skills: real cast/result/animation audit',()=>{
 for(const def of SKILLS.filter(s=>!s.passive))it(`${def.name} triggers via automatic update`,()=>{const {g,s}=arena(def.id);g.step(1/60);expect(s.cd).toBeGreaterThan(0);});
 for(const def of SKILLS)it.each([1,2,3,4,5,6,7,8])(`${def.name} rank %i`,rank=>{const {g,s}=arena(def.id,rank);verify(g,s);});
});
it('survival group healing works alone at 65%, waits at full health, and heals nearby pets',()=>{
 const {g,s}=arena('groupHeal');g.player.hp=g.maxHP*.65;const hp=g.player.hp;g.cast(s);expect(g.player.hp).toBeGreaterThan(hp);
 s.cd=0;g.player.hp=g.maxHP;g.cast(s);expect(s.cd).toBe(0);
 const summon=g.newSkill('skeleton');summon.cd=0;g.cast(summon);g.pets[0].hp=1;g.player.hp=g.maxHP-1;g.cast(s);expect(g.pets[0].hp).toBeGreaterThan(1);
});
it.each(['invisible','groupInvisible'] as const)('%s survives moving and auto-attacks, but elites and close enemies detect it',id=>{
 const {g,s}=arena(id);g.player.moving=true;g.cast(s);expect(invisible(g,0)).toBe(true);
 const e=g.enemies[0];e.x=g.player.x+100;expect(canDetect(g,e,0,g.player)).toBe(false);e.elite=true;expect(canDetect(g,e,0,g.player)).toBe(true);e.elite=false;e.x=g.player.x+10;expect(canDetect(g,e,0,g.player)).toBe(true);
 g.skills.push(g.newSkill('talisman'));g.skills[1].cd=0;g.input={x:1,y:0};g.step(1/60);expect(invisible(g,0)).toBe(true);expect(g.skills[1].cd).toBeGreaterThan(0);
 g.clock=actorBuffs(g,0).invisibleUntil+.01;expect(invisible(g,0)).toBe(false);
});
it('survival teleport is reachable through the normal automatic loop',()=>{const {g,s}=arena('teleport');expect(g.automaticTeleport).toBe(false);g.step(1/60);expect(s.cd).toBeGreaterThan(0);});
it('original mode retains stationary concealment and low-health emergency group heal',()=>{
 const {g,s}=arena('invisible',1,false);g.player.moving=true;g.cast(s);expect(s.cd).toBe(0);
 const a=arena('groupHeal',1,false);a.g.player.hp=a.g.maxHP*.65;a.g.cast(a.s);expect(a.s.cd).toBe(0);
});
it.each(['heal','groupHeal','invisible','groupInvisible','ghost','armor','lightning','ice','beam'] as const)('%s remains above high-coordinate actors',kind=>{
 const f={id:1,kind,x:100,y:5000,radius:100,life:.4,total:.8};for(const sprite of effectSprites(f))expect(sprite.depth).toBeGreaterThan(f.y);
});

it('healing and buff flashes follow the moving recipient rather than remaining on an empty tile',()=>{
 for(const id of ['heal','groupHeal','ghost','armor','invisible','groupInvisible'] as const){
  const {g,s}=arena(id);g.cast(s);const f=g.effects.find(f=>f.kind===id)!;expect(f.targetId).toBe(0);
  g.player.x+=100;g.step(1/60);expect(f.x).toBe(g.player.x);expect(f.y).toBe(g.player.y);
 }
});
it('concealed survival summons keep attacking and the buff survives save/resume',()=>{
 const {g,s}=arena('groupInvisible');const summon=g.newSkill('beast');summon.cd=0;g.skills.push(summon);g.cast(summon);
 const pet=g.pets[0];Object.assign(pet,{x:g.player.x+20,y:g.player.y,cd:0,moving:true});g.cast(s);
 expect(invisible(g,pet.id)).toBe(true);g.step(1/60);expect(g.effects.some(f=>f.kind==='beastflame')).toBe(true);expect(invisible(g,pet.id)).toBe(true);
 g.mode='normal';const restored=new Game();expect(restored.resumeSurvival(g.snapshotSurvival())).toBe(true);expect(invisible(restored,pet.id)).toBe(true);
});
it.each(['heal','groupHeal','ghost','armor'] as const)('%s plays all ten source frames within its actual lifespan',kind=>{
 const f={id:1,kind,x:100,y:100,radius:0,life:.001,total:.8};const sprite=effectSprites(f)[0];
 expect(Math.floor(sprite.time*sprite.frameRate!)).toBe(9);
});
