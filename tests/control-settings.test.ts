import {expect,it,afterEach} from 'vitest';
import {normalizeControls,readControls,setControls,controlPreferences,DEFAULT_CONTROLS} from '../src/control-settings';
afterEach(()=>setControls(DEFAULT_CONTROLS,undefined));
it('bounds persisted controls and rejects non-finite or invalid values',()=>{expect(normalizeControls({mode:'bad',radius:-1,deadZone:100,sensitivity:NaN})).toEqual({mode:'floating',radius:24,deadZone:12,sensitivity:1});expect(readControls({getItem:()=>'{'})).toEqual(DEFAULT_CONTROLS);expect(readControls({getItem:()=> 'null'})).toEqual(DEFAULT_CONTROLS);});
it('roundtrips a fixed joystick preference and survives unavailable storage',()=>{let value='';setControls({mode:'fixed',radius:40,deadZone:8,sensitivity:1.25},{setItem:(_k,v)=>{value=v;}});expect(readControls({getItem:()=>value})).toEqual(controlPreferences);expect(()=>setControls(DEFAULT_CONTROLS,{setItem:()=>{throw Error('blocked');}})).not.toThrow();});
