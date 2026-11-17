import {useEffect,useRef,type PointerEvent} from 'react';
import {game} from './game';
import {controlPreferences} from './control-settings';
/** Circular travel limit; a small dead zone prevents movement from a resting thumb. */
export function joystickVector(dx:number,dy:number,radius=30,deadZone=5,sensitivity=1){
 const distance=Math.hypot(dx,dy);
 if(distance<deadZone)return {x:0,y:0};
 const scale=Math.max(radius/sensitivity,distance);
 return {x:dx/scale,y:dy/scale};
}
export function SurvivorJoystick(){
 const preferences=controlPreferences;
 const base=useRef<HTMLDivElement>(null),active=useRef<number|null>(null),origin=useRef({x:0,y:0});
 const reset=()=>{active.current=null;game.touchInput={x:0,y:0};base.current?.style.setProperty('--stick-x','0px');base.current?.style.setProperty('--stick-y','0px');base.current?.removeAttribute('data-dragging');};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(active.current!==e.pointerId)return;const v=joystickVector(e.clientX-origin.current.x,e.clientY-origin.current.y,preferences.radius,preferences.deadZone,preferences.sensitivity);game.touchInput=v;e.currentTarget.style.setProperty('--stick-x',`${v.x*preferences.radius}px`);e.currentTarget.style.setProperty('--stick-y',`${v.y*preferences.radius}px`);};
 const end=(e:PointerEvent<HTMLDivElement>)=>{if(active.current===e.pointerId)reset();};
 useEffect(()=>{const hidden=()=>{if(document.hidden)reset();};window.addEventListener('blur',reset);document.addEventListener('clear-game-input',reset);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',reset);document.removeEventListener('clear-game-input',reset);document.removeEventListener('visibilitychange',hidden);reset();};},[]);
 return <div ref={base} className={`survivor-touch-field${preferences.mode==='fixed'?' is-fixed':''}`} style={{'--stick-size':`${preferences.radius*2+40}px`} as React.CSSProperties} role="application" aria-label={preferences.mode==='fixed'?'拖动左下摇杆移动':'在战场任意位置拖动移动'} onPointerDown={e=>{if(active.current!==null||e.button!==0||game.phase!=='battle')return;const rect=e.currentTarget.querySelector('.survivor-stick')!.getBoundingClientRect();const fixed={x:rect.x+rect.width/2,y:rect.y+rect.height/2};if(preferences.mode==='fixed'&&Math.hypot(e.clientX-fixed.x,e.clientY-fixed.y)>rect.width/2+12)return;active.current=e.pointerId;origin.current=preferences.mode==='fixed'?fixed:{x:e.clientX,y:e.clientY};e.currentTarget.style.setProperty('--origin-x',`${e.clientX}px`);e.currentTarget.style.setProperty('--origin-y',`${e.clientY}px`);e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging='true';move(e);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><div className="survivor-stick" aria-hidden="true"><span/></div></div>;
}
