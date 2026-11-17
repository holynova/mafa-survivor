import {expect,it,afterEach} from 'vitest';
import {DEFAULT_VISUAL,effectOpacity,floatingPresentation,readVisual,setVisual,visualPreferences} from '../src/visual-settings';
import type {Floating} from '../src/game';
const f=(id:number,text:string,x=100):Floating=>({id,text,x,y:100,color:'#edc384',life:.7});
afterEach(()=>setVisual({...DEFAULT_VISUAL},undefined));
it('merges nearby outgoing numbers without swallowing injury, healing or equipment notices',()=>{const original=[f(1,'10'),f(2,'20'),f(3,'−15'),f(4,'+20 血瓶'),f(5,'装备 乌木剑')];const before=JSON.stringify(original);const reduced=floatingPresentation(original,'reduced');expect(reduced.map(x=>x.text)).toEqual(['−15','+20 血瓶','装备 乌木剑','30']);expect(JSON.stringify(original)).toBe(before);expect(floatingPresentation(original,'off').map(x=>x.text)).toEqual(['−15','+20 血瓶','装备 乌木剑']);});
it('caps outgoing display groups while keeping distant and differently colored damage separate',()=>{const many=Array.from({length:45},(_,i)=>f(i,'10',i*70));expect(floatingPresentation(many,'full')).toHaveLength(45);expect(floatingPresentation(many,'reduced')).toHaveLength(12);expect(floatingPresentation([f(1,'10'),{...f(2,'20'),color:'#fff'}],'reduced')).toHaveLength(2);});
it('keeps original source effects visible and only scales display alpha',()=>{for(const kind of ['firewall','poison','hellfire','groupHeal','hit']){expect(effectOpacity(kind,'full')).toBe(1);expect(effectOpacity(kind,'reduced')).toBeGreaterThan(0);expect(effectOpacity(kind,'reduced')).toBeLessThan(1);}});
it('validates stored preferences and survives blocked or malformed storage',()=>{expect(readVisual({getItem:()=>'{'})).toEqual(DEFAULT_VISUAL);expect(readVisual({getItem:()=>'{"effects":"bad","numbers":"bad","reduceFlash":"yes"}'})).toEqual(DEFAULT_VISUAL);let stored='';setVisual({effects:'reduced',numbers:'off',reduceFlash:true},{setItem:(_k,v)=>{stored=v;}});expect(readVisual({getItem:()=>stored})).toEqual(visualPreferences);expect(()=>setVisual({numbers:'full'},{setItem:()=>{throw Error('blocked');}})).not.toThrow();});

it('migrates old display preferences and persists menu text size without changing combat display settings',()=>{
 const old=readVisual({getItem:()=>'{"effects":"reduced","numbers":"off","reduceFlash":true}'});
 expect(old).toEqual({effects:'reduced',numbers:'off',reduceFlash:true,textSize:'standard'});
 expect(readVisual({getItem:()=>'{"textSize":999}'}).textSize).toBe('standard');
 let saved='';setVisual(old,undefined);setVisual({textSize:'large'},{setItem:(_key,value)=>{saved=value;}});
 expect(readVisual({getItem:()=>saved})).toEqual({...old,textSize:'large'});
});
