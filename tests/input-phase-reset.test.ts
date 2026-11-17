import {expect,it} from 'vitest';
import {MovementInput,clearOnPhaseChange} from '../src/input';
import {Game} from '../src/game';
import {survivalChoices} from '../src/survivor';
const key=(type:string,repeat=false)=>Object.assign(new Event(type,{cancelable:true}),{code:'KeyD',key:'d',repeat});
it('clears held direction synchronously through pause/resume and requires a fresh press after repeat',()=>{
 const g=new Game();g.survivorMode=true;g.start('normal',176);const target=new EventTarget(),input=new MovementInput(target,()=>g.phase==='battle');
 const stop=clearOnPhaseChange(g,()=>{input.clear();g.input={x:0,y:0};g.touchInput={x:0,y:0};});
 target.dispatchEvent(key('keydown'));g.input=input.axes;expect(g.input.x).toBe(1);g.pause();expect(input.axes.x).toBe(0);
 g.pause();target.dispatchEvent(key('keydown',true));expect(input.axes.x).toBe(0);target.dispatchEvent(key('keyup'));target.dispatchEvent(key('keydown'));expect(input.axes.x).toBe(1);
 stop();input.destroy();
});
it('clears a held direction when an upgrade opens and preserves the choice and RNG until selection',()=>{
 const g=new Game();g.survivorMode=true;g.start('normal',176);const target=new EventTarget(),input=new MovementInput(target,()=>g.phase==='battle');const stop=clearOnPhaseChange(g,()=>input.clear());
 target.dispatchEvent(key('keydown'));g.choices=survivalChoices(g);g.phase='upgrade';const before=JSON.stringify(g.choices),seed=g.rng.seed;g.emit();expect(input.axes.x).toBe(0);expect(JSON.stringify(g.choices)).toBe(before);expect(g.rng.seed).toBe(seed);
 g.choose(g.choices[0].id);expect(g.phase).toBe('battle');target.dispatchEvent(key('keydown',true));expect(input.axes.x).toBe(0);target.dispatchEvent(key('keydown'));expect(input.axes.x).toBe(1);stop();input.destroy();
});
it('does not reset during ordinary battle emits, and unregisters on cleanup',()=>{
 const g=new Game();g.start('normal');let clears=0;const stop=clearOnPhaseChange(g,()=>clears++);g.emit();g.emit();expect(clears).toBe(0);g.pause();expect(clears).toBe(1);stop();g.pause();expect(clears).toBe(1);
});
