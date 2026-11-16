import {describe,it,expect} from 'vitest';
import {Game} from '../src/game';
import {suspendSurvival} from '../src/survivor-lifecycle';
import {survivalChoices} from '../src/survivor';
const run=()=>{const g=new Game();g.survivorMode=true;g.start('normal',176);g.input={x:1,y:0};g.touchInput={x:1,y:0};g.player.moving=true;return g;};
describe('survival mobile lifecycle',()=>{
 it('pauses once, clears movement, and freezes damage and time until an explicit resume',()=>{const g=run();const hp=g.player.hp;g.clock=42;suspendSurvival(g);suspendSurvival(g);g.step(10);expect(g.phase).toBe('paused');expect(g.clock).toBe(42);expect(g.player.hp).toBe(hp);expect(g.input).toEqual({x:0,y:0});expect(g.touchInput).toEqual({x:0,y:0});expect(g.player.moving).toBe(false);g.pause();g.step(.01);expect(g.clock).toBeGreaterThan(42);});
 it('preserves pending upgrade options, rerolls and RNG across interruption and save',()=>{const g=run();g.phase='upgrade';g.choices=survivalChoices(g);const choices=structuredClone(g.choices),seed=g.rng.seed;suspendSurvival(g);const restored=new Game();expect(restored.resumeSurvival(g.snapshotSurvival())).toBe(true);expect(restored.phase).toBe('upgrade');expect(restored.choices).toEqual(choices);expect(restored.rng.seed).toBe(seed);expect(restored.survival.rerolls).toBe(3);});
 it('does not reopen results or modify original mode input',()=>{const g=run();g.finish(false);suspendSurvival(g);expect(g.phase).toBe('dead');const old=new Game();old.start('normal');old.input={x:1,y:0};suspendSurvival(old);expect(old.phase).toBe('battle');expect(old.input.x).toBe(1);});
});
