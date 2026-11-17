import {useState} from 'react';
import {game} from './game';
import {runtimeDiagnostics} from './runtime-diagnostics';
import {saveMetrics} from './survivor-persistence';
export function diagnosticExport(){return JSON.stringify({run:game.telemetry.snapshot(game),runtime:runtimeDiagnostics.snapshot(),journalStorage:game.telemetry.persistenceSnapshot(),save:{...saveMetrics,scope:'current browser session; last write timings'}},null,2);}
export function SurvivorDiagnostics(){
 const [status,setStatus]=useState('');
 const download=()=>{
  try{const text=diagnosticExport(),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`mafa-diagnostics-${game.mapId}-${game.seed}.json`;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('已发起下载，可将文件附在测试反馈中。');}
  catch{setStatus('导出失败，请稍后重试。');}
 };
 return <details className="survivor-more survivor-diagnostics"><summary>测试记录与反馈</summary><p>记录每分钟成长、承伤、构筑选择与浏览器性能，仅保存在本机，不会自动上传。</p><p>{game.mode==='test'?'当前为测试局，不覆盖普通局记录。':'刷新后继续上局时会恢复已保存的记录。'}文件包含种子和关键事件，不是完整操作录像。</p><button onClick={download}>导出本局测试记录</button>{game.telemetry.persistenceError&&<p role="status">{game.telemetry.persistenceError}</p>}{status&&<p role="status">{status}</p>}</details>;
}
