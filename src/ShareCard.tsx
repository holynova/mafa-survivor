import {GamePopupClose} from './GamePopupClose';
import {useEffect,useRef,useState} from 'react';
export const PROJECT_SHARE_URL='https://xiaosang.cc/mafa-survivor/?survivor';
export const projectSharePayload={scope:'site' as const,title:'玛法幸存者',description:'原版传奇美术 · 自动战斗 · 三职业构筑',result:{summary:'战士 / 法师 / 道士'},url:PROJECT_SHARE_URL,qrUrl:PROJECT_SHARE_URL,brand:{name:'玛法幸存者'}};
async function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('游戏截图未加载，请重试'));img.src=src;});}
export async function renderProjectCard(){
 const [{default:QRCode},shot]=await Promise.all([import('qrcode'),loadImage(`${import.meta.env.BASE_URL}share/gameplay.png`),document.fonts.ready]);
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1380;const c=canvas.getContext('2d');if(!c)throw new Error('浏览器无法生成图片');
 c.fillStyle='#151710';c.fillRect(0,0,1080,1380);c.strokeStyle='#9b8150';c.lineWidth=2;c.strokeRect(30,30,1020,1320);
 c.fillStyle='#d9bf80';c.font='26px sans-serif';c.fillText('MAFA SURVIVOR',64,93);c.fillStyle='#f6e6be';c.font='bold 76px serif';c.fillText(projectSharePayload.title,60,200);
 c.fillStyle='#cbbf9f';c.font='30px sans-serif';c.fillText(projectSharePayload.description,64,264);
 const sw=shot.naturalWidth,sh=shot.naturalHeight,scale=Math.max(952/sw,650/sh),cropW=952/scale,cropH=650/scale;c.drawImage(shot,(sw-cropW)/2,(sh-cropH)/2,cropW,cropH,64,320,952,650);
 c.fillStyle='#b1ac95';c.font='24px sans-serif';c.fillText('新版实机画面 · Alpha 测试版',64,1012);
 const qr=document.createElement('canvas');await QRCode.toCanvas(qr,projectSharePayload.qrUrl,{width:240,margin:4,errorCorrectionLevel:'M',color:{dark:'#111611',light:'#ffffff'}});c.drawImage(qr,64,1060,240,240);
 c.fillStyle='#f3e6c5';c.font='bold 34px sans-serif';c.fillText('扫码试玩玛法幸存者',344,1112);c.fillStyle='#cbbf9f';c.font='26px sans-serif';c.fillText('扫码进入新版生存模式',344,1160);c.font='23px sans-serif';c.fillText(PROJECT_SHARE_URL,344,1220);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG 生成失败')),'image/png'));return new File([blob],'mafa-survivor-share.png',{type:'image/png'});
}
export function ShareCardButton(){
 const dialog=useRef<HTMLDialogElement>(null),preview=useRef('');const [file,setFile]=useState<File|null>(null),[image,setImage]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>()=>{if(preview.current)URL.revokeObjectURL(preview.current);},[]);
 const open=async()=>{dialog.current?.showModal();if(file)return;setBusy(true);setStatus('正在生成分享卡片…');try{const result=await renderProjectCard();const url=URL.createObjectURL(result);preview.current=url;setFile(result);setImage(url);setStatus('卡片已生成');}catch(e){setStatus(e instanceof Error?e.message:'生成失败，仍可复制链接');}finally{setBusy(false);}};
 const download=()=>{if(!file)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);setStatus('已下载 PNG');};
 const copy=async()=>{try{await navigator.clipboard.writeText(PROJECT_SHARE_URL);setStatus('链接已复制');}catch{setStatus('复制不可用，请长按下方链接复制');}};
 const share=async()=>{if(!file)return;if(!navigator.share||!navigator.canShare?.({files:[file]})){download();setStatus('此浏览器不支持图片分享，已下载 PNG');return;}try{await navigator.share({files:[file],title:projectSharePayload.title,text:projectSharePayload.description,url:PROJECT_SHARE_URL});setStatus('已分享');}catch(e){setStatus(e instanceof DOMException&&e.name==='AbortError'?'已取消分享':'分享失败，请下载图片或复制链接');}};
 return <><button className="survivor-share-open" onClick={()=>void open()}>分享游戏</button><dialog className="survivor-share-dialog" ref={dialog} aria-labelledby="share-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><div className="survivor-share-content"><GamePopupClose label="关闭分享" onClose={()=>dialog.current?.close()}/><div className="survivor-share-heading"><h2 id="share-title">分享玛法幸存者</h2></div>{image&&<img className="survivor-share-preview" src={image} alt="玛法幸存者分享卡片：游戏实机截图、项目介绍与试玩二维码"/>}<div className="survivor-share-actions"><button disabled={!file||busy} onClick={download}>下载 PNG</button><button disabled={!file||busy} onClick={()=>void share()}>系统分享</button><button onClick={()=>void copy()}>复制链接</button>{!file&&!busy&&<button onClick={()=>void open()}>重试生成</button>}</div><p role="status" aria-live="polite">{status}</p><a href={PROJECT_SHARE_URL} target="_blank" rel="noreferrer">{PROJECT_SHARE_URL}</a><p className="survivor-share-note">新版 Alpha 测试版，欢迎试玩与反馈。</p></div></dialog></>;
}
