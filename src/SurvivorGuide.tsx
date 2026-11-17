import {isBossKind} from './content';
import {game} from './game';
import {survivorGuide} from './survivor-guide';
import {controlPreferences} from './control-settings';
export function SurvivorGuide({place}:{place:'battle'|'upgrade'}){
 if(game.mode!=='normal'||place==='battle'&&game.enemies.some(e=>e.hp>0&&(e.elite||isBossKind(e.kind))))return null;
 const step=survivorGuide.step(game.phase);if(!step||(place==='upgrade')!==(step==='choice'))return null;
 const text=step==='move'?`${controlPreferences.mode==='fixed'?'拖动左下摇杆':'在战场拖动'}移动，角色会自动攻击。电脑也可用 WASD。`:step==='pickup'?'靠近地上的金币堆获得经验，升级时三选一强化。':'优先升级1—2个主攻技能。选一项后继续战斗，进度会自动保存。';
 return <aside className={`survivor-guide ${place==='upgrade'?'is-inline':''}`} aria-label="新手提示"><p>{text}</p><button onClick={()=>{survivorGuide.skip();game.emit();}} aria-label="跳过新手提示">知道了</button></aside>;
}
