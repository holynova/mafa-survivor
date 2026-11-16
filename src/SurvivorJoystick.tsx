import {useEffect,useRef,type PointerEvent} from 'react';
import {game} from './game';
/** Circular travel limit; a small dead zone prevents movement from a resting thumb. */
export function joystickVector(dx:number,dy:number,radius=30){
 const distance=Math.hypot(dx,dy);
 if(distance<5)return {x:0,y:0};
 const scale=Math.max(radius,distance);
 return {x:dx/scale,y:dy/scale};
}
export function SurvivorJoystick(){
 const base=useRef<HTMLDivElement>(null),active=useRef<number|null>(null);
 const reset=()=>{active.current=null;game.touchInput={x:0,y:0};base.current?.style.setProperty('--stick-x','0px');base.current?.style.setProperty('--stick-y','0px');base.current?.removeAttribute('data-dragging');};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(active.current!==e.pointerId)return;const box=e.currentTarget.getBoundingClientRect();const v=joystickVector(e.clientX-box.left-box.width/2,e.clientY-box.top-box.height/2);game.touchInput=v;e.currentTarget.style.setProperty('--stick-x',`${v.x*30}px`);e.currentTarget.style.setProperty('--stick-y',`${v.y*30}px`);};
 const end=(e:PointerEvent<HTMLDivElement>)=>{if(active.current===e.pointerId)reset();};
 useEffect(()=>{const hidden=()=>{if(document.hidden)reset();};window.addEventListener('blur',reset);document.addEventListener('clear-game-input',reset);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',reset);document.removeEventListener('clear-game-input',reset);document.removeEventListener('visibilitychange',hidden);reset();};},[]);
 return <div ref={base} className="survivor-stick" role="application" aria-label="拖动移动摇杆" onPointerDown={e=>{if(active.current!==null||e.button!==0)return;active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging='true';move(e);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><span aria-hidden="true"/></div>;
}
