import type {Floating} from './game';
export type VisualPreferences={effects:'full'|'reduced';numbers:'full'|'reduced'|'off';reduceFlash:boolean};
export const VISUAL_KEY='mafa-visual-settings-v1';
export const DEFAULT_VISUAL:VisualPreferences={effects:'full',numbers:'full',reduceFlash:false};
export function readVisual(storage:Pick<Storage,'getItem'>|undefined):VisualPreferences{
 try{const s=JSON.parse(storage?.getItem(VISUAL_KEY)??'{}');return {effects:s?.effects==='reduced'?'reduced':'full',numbers:['reduced','off'].includes(s?.numbers)?s.numbers:'full',reduceFlash:s?.reduceFlash===true};}catch{return {...DEFAULT_VISUAL};}
}
export const visualPreferences=readVisual(typeof localStorage==='undefined'?undefined:localStorage);
export function setVisual(patch:Partial<VisualPreferences>,storage:Pick<Storage,'setItem'>|undefined=typeof localStorage==='undefined'?undefined:localStorage){Object.assign(visualPreferences,patch);try{storage?.setItem(VISUAL_KEY,JSON.stringify(visualPreferences));}catch{/* Remain usable when browser storage is unavailable. */}}
/** Display-only aggregation: never modifies the combat ledger or its live entities. */
export function floatingPresentation(items:readonly Floating[],mode:VisualPreferences['numbers']):Floating[]{
 if(mode==='full')return [...items];
 const important=items.filter(f=>!/^\d+$/.test(f.text));
 if(mode==='off')return important;
 const cells=new Map<string,Floating>();
 for(const f of items){if(!/^\d+$/.test(f.text))continue;const key=`${Math.floor(f.x/64)}:${Math.floor(f.y/48)}:${f.color}`;const existing=cells.get(key);if(existing){existing.text=String(Number(existing.text)+Number(f.text));existing.life=Math.max(existing.life,f.life);}else cells.set(key,{...f});}
 return [...important,...[...cells.values()].slice(-12)];
}
export function effectOpacity(kind:string,mode:VisualPreferences['effects']){return mode==='full'?1:kind==='firewall'?.45:kind==='poison'?.6:kind==='hit'?.55:.8;}
