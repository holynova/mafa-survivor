export type ControlPreferences={mode:'floating'|'fixed';radius:number;deadZone:number;sensitivity:number};
export const CONTROL_KEY='mafa-controls-v1';
export const DEFAULT_CONTROLS:ControlPreferences={mode:'floating',radius:30,deadZone:5,sensitivity:1};
const finite=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function normalizeControls(value:unknown):ControlPreferences{const v=value&&typeof value==='object'?value as Partial<ControlPreferences>:{};return {mode:v.mode==='fixed'?'fixed':'floating',radius:finite(v.radius,30,24,48),deadZone:finite(v.deadZone,5,2,12),sensitivity:finite(v.sensitivity,1,.75,1.5)};}
export function readControls(storage:Pick<Storage,'getItem'>|undefined){try{return normalizeControls(JSON.parse(storage?.getItem(CONTROL_KEY)??'{}'));}catch{return {...DEFAULT_CONTROLS};}}
export const controlPreferences=readControls(typeof localStorage==='undefined'?undefined:localStorage);
export function setControls(patch:Partial<ControlPreferences>,storage:Pick<Storage,'setItem'>|undefined=typeof localStorage==='undefined'?undefined:localStorage){Object.assign(controlPreferences,normalizeControls({...controlPreferences,...patch}));try{storage?.setItem(CONTROL_KEY,JSON.stringify(controlPreferences));}catch{/* Keep controls usable without persistence. */}if(typeof document!=='undefined')document.dispatchEvent(new Event('clear-game-input'));}
