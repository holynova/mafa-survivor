import {useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent} from 'react';
import {game} from './game';
import {controlPreferences, DEFAULT_CONTROLS} from './control-settings';

/** Circular travel limit; a small dead zone prevents movement from a resting thumb. */
export function joystickVector(dx: number, dy: number, radius = 30, deadZone = 5, sensitivity = 1) {
 const distance = Math.hypot(dx, dy);
 if (distance < deadZone) return {x: 0, y: 0};
 const scale = Math.max(radius / sensitivity, distance);
 return {x: dx / scale, y: dy / scale};
}

export function SurvivorJoystick({classic = false}: {classic?: boolean}) {
 const preferences = classic ? DEFAULT_CONTROLS : controlPreferences;
 const base = useRef<HTMLDivElement>(null);
 const active = useRef<number | null>(null);
 const origin = useRef({x: 0, y: 0});

 function reset() {
  active.current = null;
  game.touchInput = {x: 0, y: 0};
  const layer = base.current;
  layer?.style.setProperty('--stick-x', '0px');
  layer?.style.setProperty('--stick-y', '0px');
  layer?.removeAttribute('data-dragging');
 }

 function move(e: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) {
  const layer = base.current;
  if (active.current !== e.pointerId || !layer) return;
  if (game.phase !== 'battle') {
   reset();
   return;
  }
  const direction = joystickVector(e.clientX - origin.current.x, e.clientY - origin.current.y,
   preferences.radius, preferences.deadZone, preferences.sensitivity);
  game.touchInput = direction;
  layer.style.setProperty('--stick-x', `${direction.x * preferences.radius}px`);
  layer.style.setProperty('--stick-y', `${direction.y * preferences.radius}px`);
 }

 function end(e: Pick<PointerEvent, 'pointerId'>) {
  if (active.current === e.pointerId) reset();
 }

 useEffect(() => {
  const hidden = () => { if (document.hidden) reset(); };
  // Window listeners continue the drag over HUD controls if capture is unavailable.
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
  window.addEventListener('blur', reset);
  document.addEventListener('clear-game-input', reset);
  document.addEventListener('visibilitychange', hidden);
  return () => {
   window.removeEventListener('pointermove', move, true);
   window.removeEventListener('pointerup', end, true);
   window.removeEventListener('pointercancel', end, true);
   window.removeEventListener('blur', reset);
   document.removeEventListener('clear-game-input', reset);
   document.removeEventListener('visibilitychange', hidden);
   reset();
  };
 }, [preferences]);

 function begin(e: ReactPointerEvent<HTMLDivElement>) {
  if (active.current !== null || game.phase !== 'battle' || (e.pointerType !== 'touch' && e.button !== 0)) return;
  const layer = e.currentTarget;
  const rect = layer.firstElementChild!.getBoundingClientRect();
  const fixed = {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  if (preferences.mode === 'fixed' && Math.hypot(e.clientX - fixed.x, e.clientY - fixed.y) > rect.width / 2 + 12) return;
  const bounds = layer.getBoundingClientRect();
  const start = {x: e.clientX, y: e.clientY};
  active.current = e.pointerId;
  origin.current = preferences.mode === 'fixed' ? fixed : start;
  layer.style.setProperty('--origin-x', `${start.x - bounds.x}px`);
  layer.style.setProperty('--origin-y', `${start.y - bounds.y}px`);
  layer.dataset.dragging = 'true';
  e.preventDefault();
  try {
   layer.setPointerCapture(e.pointerId);
  } catch {
   // Drag input is still tracked by the window listeners.
  }
  move(e);
 }

 return <div
  ref={base}
  className={`survivor-touch-field${preferences.mode === 'fixed' ? ' is-fixed' : ''}${classic ? ' classic-touch-field' : ''}`}
  style={{'--stick-size': `${preferences.radius * 2 + 40}px`} as CSSProperties}
  role="application"
  aria-label={preferences.mode === 'fixed' ? '拖动左下摇杆移动' : '在战场任意位置拖动移动'}
  onPointerDown={begin}
  onLostPointerCapture={end}
 >
  <div className="survivor-stick" aria-hidden="true"><span/></div>
 </div>;
}
