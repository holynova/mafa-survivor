import {expect,it,vi} from 'vitest';
import {Game} from '../src/game';
function arena(survivor:boolean,source:'skeleton'|'beast'='skeleton'){
 const g=new Game();g.survivorMode=survivor;g.start('normal',176,'taoist');
 g.survival.spawnAt=g.survival.eliteAt=g.survival.bossAt=1e9;g.basicCD=90;
 const s=g.newSkill(source);s.cd=0;g.skills=[s];g.cast(s);s.cd=90;
 const pet=g.pets[0];Object.assign(pet,{x:g.player.x,y:g.player.y,cd:0});
 const enemy=g.spawnEnemy('orc');Object.assign(enemy,{x:pet.x+30,y:pet.y,hp:1000,maxHp:1000,defense:0,magicDefense:0,speed:0,attackCD:90});
 vi.spyOn(g,'rollStat').mockReturnValue(0);return {g,pet,enemy};
}
it.each([[false,9],[true,13]] as const)('survivor=%s keeps skeletons physical and single-target with %s unmodified-stat damage', (survivor,expected)=>{
 const {g,pet,enemy}=arena(survivor);const other=g.spawnEnemy('orc');Object.assign(other,{x:pet.x+35,y:pet.y,hp:1000,maxHp:1000,defense:0,speed:0,attackCD:90});
 g.step(.05);expect(1000-enemy.hp).toBe(expected);expect(other.hp).toBe(1000);
 expect(pet.damage).toBe(11);expect(pet.cd).toBeCloseTo(.88);expect(g.damageDealt.skeleton).toBe(expected);
});
it('applies the same survivor attack tuning to a restored existing skeleton without changing its stored damage or healing it',()=>{
 const {g,pet,enemy}=arena(true);pet.hp=pet.maxHp/2;
 const save=g.snapshotSurvival()!,restored=new Game();expect(restored.resumeSurvival(save)).toBe(true);
 restored.pause();vi.spyOn(restored,'rollStat').mockReturnValue(0);const loaded=restored.pets[0];const hp=loaded.hp;
 restored.step(.05);expect(1000-restored.enemies.find(e=>e.id===enemy.id)!.hp).toBe(13);
 expect(loaded.damage).toBe(11);expect(loaded.hp).toBe(hp);expect(loaded.cd).toBeCloseTo(.88);
});
it.each([false,true])('does not change beast flame damage in survivor=%s',survivor=>{
 const {g,pet,enemy}=arena(survivor,'beast');g.step(.05);
 expect(1000-enemy.hp).toBe(13);expect(pet.damage).toBe(16);expect(pet.cd).toBeCloseTo(1.28);
 expect(g.effects.some(e=>e.kind==='beastflame')).toBe(true);
});
