import type {Enemy} from './game';
import {isBossKind} from './content';
import {intersectsView,type ViewRect} from './render-visibility';
import type {VisualPreferences} from './visual-settings';
type Actor=Pick<Enemy,'id'|'kind'|'elite'|'hp'|'maxHp'|'x'|'y'>;
/** Display budget only. Boss/elite/status indicators are handled independently. */
export function ordinaryHealthBarIds(enemies:readonly Actor[],player:{x:number;y:number},view:ViewRect|undefined,
 mode:VisualPreferences['effects'],previous:ReadonlySet<number>=new Set()):Set<number>{
 const limit=mode==='reduced'?12:24;
 const candidates=enemies.filter(e=>e.hp>0&&e.hp<e.maxHp&&!e.elite&&!isBossKind(e.kind)&&
  (!view||intersectsView({x:e.x-16,y:e.y-60,width:32,height:10},view)));
 const priority=(e:Actor)=>((e.x-player.x)**2+(e.y-player.y)**2)*(previous.has(e.id)?.8:1);
 candidates.sort((a,b)=>priority(a)-priority(b)||a.id-b.id);
 return new Set(candidates.slice(0,limit).map(e=>e.id));
}
