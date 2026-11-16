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
 const base=useRef<HTMLDivElement>(null),active=useRef<number|null>(null),origin=useRef({x:0,y:0});
 const reset=()=>{active.current=null;game.touchInput={x:0,y:0};base.current?.style.setProperty('--stick-x','0px');base.current?.style.setProperty('--stick-y','0px');base.current?.removeAttribute('data-dragging');};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(active.current!==e.pointerId)return;const v=joystickVector(e.clientX-origin.current.x,e.clientY-origin.current.y);game.touchInput=v;e.currentTarget.style.setProperty('--stick-x',`${v.x*30}px`);e.currentTarget.style.setProperty('--stick-y',`${v.y*30}px`);};
 const end=(e:PointerEvent<HTMLDivElement>)=>{if(active.current===e.pointerId)reset();};
 useEffect(()=>{const hidden=()=>{if(document.hidden)reset();};window.addEventListener('blur',reset);document.addEventListener('clear-game-input',reset);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',reset);document.removeEventListener('clear-game-input',reset);document.removeEventListener('visibilitychange',hidden);reset();};},[]);
 return <div ref={base} className="survivor-touch-field" role="application" aria-label="在战场任意位置拖动移动" onPointerDown={e=>{if(active.current!==null||e.button!==0)return;active.current=e.pointerId;origin.current={x:e.clientX,y:e.clientY};e.currentTarget.style.setProperty('--origin-x',`${e.clientX}px`);e.currentTarget.style.setProperty('--origin-y',`${e.clientY}px`);e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging='true';move(e);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><div className="survivor-stick" aria-hidden="true"><span/></div></div>;
}
