import type {Game} from './game';
/** Idempotent: returning focus must never resume a run or dismiss a pending choice. */
export function suspendSurvival(g:Game){
 if(!g.survivorMode)return;
 g.touchInput={x:0,y:0};g.input={x:0,y:0};g.player.moving=false;
 if(g.phase==='battle')g.pause();
}
