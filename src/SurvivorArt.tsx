import {useEffect,useRef} from 'react';
import {drawSurvivorArt} from './renderer';
import {isGraybox} from './release';

export function SurvivorArt({name,portrait=false}: {name?:string;portrait?:boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=canvas.current?.getContext('2d');
    if (!ctx || isGraybox) return;
    let timeout=0;
    let remaining=40;
    const draw=()=>{
      if (!drawSurvivorArt(ctx,name??'',portrait) && remaining-- > 0) timeout=window.setTimeout(draw,100);
    };
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    draw();
    return ()=>window.clearTimeout(timeout);
  },[name,portrait]);
  return <canvas className={portrait?'bronze-portrait-art':'bronze-item-art'} ref={canvas}
    width={portrait?116:48} height={portrait?152:48} aria-hidden="true"/>;
}
