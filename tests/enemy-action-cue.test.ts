import {expect,it} from 'vitest';
import {Game} from '../src/game';
import {enemyActionCue} from '../src/enemy-action-cue';
import {updateRangedEnemy} from '../src/enemy-ai';
import {updateExpansionEnemy} from '../src/expansion-enemies';
it('uses the real locked attack and recovery clocks without changing the actor',()=>{
 const g=new Game();g.survivorMode=true;g.start('normal');g.clock=10;const e=g.spawnEnemy('evilSnake');e.x=g.player.x-100;e.y=g.player.y;e.rangedCD=0;
 updateRangedEnemy(g,e,.05,{...g.player,visible:true});const before=JSON.stringify(e);
 const cue=enemyActionCue(e,10.5,true)!;expect(cue.text).toBe('! 喷毒蓄力');expect(cue.progress).toBeCloseTo(.5);expect(JSON.stringify(e)).toBe(before);
 g.clock=11.01;updateRangedEnemy(g,e,.05,{...g.player,visible:true});expect(enemyActionCue(e,g.clock,true)).toMatchObject({text:'反击时机',state:'recovery'});expect(enemyActionCue(e,g.clock,true)!.progress).toBeCloseTo(1);
 expect(enemyActionCue(e,e.staggerUntil!,true)).toBeNull();
});
it('does not add cues to normal ranged enemies, old mode, dead enemies or absent targets',()=>{
 const g=new Game();g.start('normal');const e=g.spawnEnemy('spider');e.rangedFireAt=1;e.rangedTarget={...g.player};
 expect(enemyActionCue(e,.5,true)).toBeNull();e.elite=true;expect(enemyActionCue(e,.5,false)).toBeNull();expect(enemyActionCue(e,.5,true)?.state).toBe('windup');
 e.hp=0;expect(enemyActionCue(e,.5,true)).toBeNull();e.hp=100;e.rangedTarget=undefined;expect(enemyActionCue(e,.5,true)).toBeNull();
});
it.each(['whiteBoar','redMoon'])('%s shows only its actual post-stomp recovery, with no state mutation or extra aim marker',kind=>{
 const g=new Game();g.survivorMode=true;g.start('normal');g.clock=10;
 const e=g.spawnEnemy(kind);e.x=g.player.x+100;e.y=g.player.y;e.stompCD=0;
 updateExpansionEnemy(g,e,.01,{...g.player,visible:true});expect(e.stompAt).toBeGreaterThan(g.clock);
 expect(enemyActionCue(e,g.clock,true)).toBeNull();
 g.clock=e.stompAt!;updateExpansionEnemy(g,e,.01,{...g.player,visible:true});
 const before=JSON.stringify(e);expect(enemyActionCue(e,g.clock,true)).toMatchObject({text:'反击时机',state:'recovery',progress:1});
 expect(enemyActionCue(e,g.clock+1.1,true)!.progress).toBeCloseTo(.5);
 expect(enemyActionCue(e,e.staggerUntil!,true)).toBeNull();expect(enemyActionCue(e,g.clock,false)).toBeNull();
 expect(JSON.stringify(e)).toBe(before);e.hp=0;expect(enemyActionCue(e,g.clock,true)).toBeNull();
});
