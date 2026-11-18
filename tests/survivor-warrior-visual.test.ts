import {it,expect} from 'vitest';
import {Game} from '../src/game';
import {effectSprites} from '../src/effect-visual';
import {skillCooldownView} from '../src/SurvivorHud';
import {skillCooldown} from '../src/skill-metrics';
it('starter half moon produces a real blade effect against one nearby enemy',()=>{const g=new Game();g.survivorMode=true;g.start('test',176,'warrior');g.clock=2;g.player.attackUntil=0;const e=g.spawnEnemy('scarecrow');e.x=g.player.x;e.y=g.player.y+35;e.hp=e.maxHp=10000;const s=g.skills[0];s.cd=0;g.cast(s);const f=g.effects.find(f=>f.kind==='cleave');expect(f).toBeTruthy();expect(s.cd).toBeGreaterThan(0);});
it('each directional warrior slash plays all six source frames during its lifetime',()=>{for(const kind of ['cleave','thrust','powerstrike','firesword'] as const)for(let dir=0;dir<8;dir++){const f={id:1,kind,x:200,y:3500,dir,radius:70,total:.35,life:.35};const frames=new Set<number>();for(let i=0;i<6;i++){f.life=f.total-(i+.5)*f.total/6;const sprite=effectSprites(f)[0];expect(sprite.animation).toBe(`${kind}/${dir}`);expect(sprite.depth).toBeGreaterThan(f.y);frames.add(Math.floor(sprite.time*sprite.frameRate!));}expect([...frames]).toEqual([0,1,2,3,4,5]);}});
it('the individual skill overlay follows the real cooldown',()=>{const g=new Game();const active=g.newSkill('cleave');active.cd=skillCooldown(active);expect(skillCooldownView(active,0).ratio).toBe(1);active.cd/=2;expect(skillCooldownView(active,0).ratio).toBeCloseTo(.5);active.cd=0;expect(skillCooldownView(active,0).ratio).toBe(0);});
