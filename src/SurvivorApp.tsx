import {SurvivorHud,SkillIcon} from './SurvivorHud';
import {suspendSurvival} from './survivor-lifecycle';
import {SurvivorJoystick} from './SurvivorJoystick';
import {SurvivorGrowthBook} from './SurvivorGrowthBook';
import {useEffect,useReducer,useState} from 'react';
import {game} from './game';
import {CLASS_IDS,CLASSES,type ClassId} from './classes';
import {getSkill,MAPS,type MapId} from './content';
import {isReady,readyListeners,setBattleInset} from './renderer';
import {sounds} from './sound';
import {EvolutionBook} from './EvolutionBook';
import {AudioSettings} from './AudioSettings';
import {SURVIVAL_OPEN_MAP_TEST,CHARMS,EVOLUTIONS,survivalChoices,survivalStarter,BUILD_GUIDES} from './survivor';
import {assetUrl} from './release';
import './survivor.css';
import {readSurvivalSave,SURVIVOR_SAVE_KEY,type SurvivorSave} from './survivor-save';
import {CHAPTER_PATH,chapterRequirement,chapterUnlocked,chapterGoal,newSurvivorProgress,readSurvivorProgress,updateSurvivorProgress} from './survivor-progress';
import {readSurvivorRecords,recordSurvival} from './survivor-records';
const clock=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
export function SurvivorApp(){const [,update]=useReducer(x=>x+1,0);const [ready,setReady]=useState(isReady());const [error,setError]=useState('');const [saved,setSaved]=useState<SurvivorSave|null>(()=>{try{return readSurvivalSave(localStorage);}catch{return null;}});const [progress,setProgress]=useState(()=>{try{return readSurvivorProgress(localStorage);}catch{return newSurvivorProgress();}});const [role,setRole]=useState<ClassId>('wizard');const [map,setMap]=useState<MapId>('biche');
 const persist=()=>{try{const cp=game.snapshotSurvival();if(cp){setProgress(updateSurvivorProgress(game,localStorage));localStorage.setItem(SURVIVOR_SAVE_KEY,JSON.stringify(cp));setSaved(cp);setError(e=>e.startsWith('存档未保存')?'':e);return true;}return false;}catch{setError('存档未保存：本机存储不可用或已满，请勿刷新。');return false;}};
 const discard=()=>{try{localStorage.removeItem(SURVIVOR_SAVE_KEY);setSaved(null);return true;}catch{setError('无法清除本机存档，请检查浏览器存储。');return false;}};
 useEffect(()=>{let phase=game.phase;const unsub=game.subscribe(()=>{if(game.result&&game.mode==='normal')try{setProgress(updateSurvivorProgress(game,localStorage));recordSurvival(game,localStorage);localStorage.removeItem(SURVIVOR_SAVE_KEY);setSaved(null);}catch{setError('本机存储不可用，本局战绩未保存。');}else if(game.phase!==phase)persist();phase=game.phase;update();});
 const timer=window.setInterval(persist,5000);
 const suspend=()=>{suspendSurvival(game);document.dispatchEvent(new Event('clear-game-input'));persist();};
 const saveHidden=()=>{if(document.hidden)suspend();};
 window.addEventListener('pagehide',suspend);window.addEventListener('orientationchange',suspend);screen.orientation?.addEventListener('change',suspend);document.addEventListener('visibilitychange',saveHidden);
 const onReady=()=>setReady(true);const onError=()=>setError('原版素材加载失败，请刷新重试。');readyListeners.add(onReady);document.addEventListener('asset-error',onError);setBattleInset(0);return()=>{unsub();clearInterval(timer);window.removeEventListener('pagehide',suspend);window.removeEventListener('orientationchange',suspend);screen.orientation?.removeEventListener('change',suspend);document.removeEventListener('visibilitychange',saveHidden);readyListeners.delete(onReady);document.removeEventListener('asset-error',onError);};},[]);
 const start=()=>{if(!SURVIVAL_OPEN_MAP_TEST&&!chapterUnlocked(progress,map)){setError('请先完成前置章节的生存目标。');return;}if(!discard())return;setError('');void sounds.unlock();game.survivorMode=true;game.unlockedMaps.add(map);game.start('normal',Date.now()>>>0,role,false,map);};
 const resume=()=>{if(!saved)return;setRole(saved.state.classId);setMap(saved.state.mapId);setError('');void sounds.unlock();if(!game.resumeSurvival(saved))setError('存档无法读取，请另开新局。');};
 const leave=()=>{try{setProgress(updateSurvivorProgress(game,localStorage));}catch{setError('章节进度未保存，请检查浏览器存储后重试。');return;}if(!discard())return;game.touchInput={x:0,y:0};game.phase='lobby';game.emit();};
 const saveAndLeave=()=>{if(!persist())return;game.touchInput={x:0,y:0};game.phase='lobby';game.emit();};
 const title=(id:typeof game.skills[number]['id'])=>game.survival.evolved.includes(id)?EVOLUTIONS[id]?.name??getSkill(id).name:getSkill(id).name;
 const recentEvolution=game.survival.evolved.at(-1);
 const selectingEvolution=game.phase==='upgrade'&&game.choices.some(c=>c.id.startsWith('evo:'));
 return <div className="survivor-ui">{error&&<p className="survivor-error" role="alert">{error}</p>}{game.phase==='lobby'?<section className="survivor-panel survivor-lobby">
 <p className="survivor-eyebrow">连续生存 · 开发版</p><h1>玛法幸存者</h1><p className="survivor-subtitle">生存 20 分钟 · 击败最终首领</p>
 <div className="survivor-tabs" aria-label="选择职业">{CLASS_IDS.map(id=><button key={id} aria-pressed={role===id} onClick={()=>setRole(id)}>{CLASSES[id].name}</button>)}</div>
 <p className="survivor-starter">初始技能 · {getSkill(survivalStarter(role)).name}</p>
 <label>章节<select value={map} onChange={e=>setMap(e.target.value as MapId)}>{CHAPTER_PATH.map(id=><option key={id} value={id} disabled={!SURVIVAL_OPEN_MAP_TEST&&!chapterUnlocked(progress,id)}>{SURVIVAL_OPEN_MAP_TEST||chapterUnlocked(progress,id)?'':'未解锁 · '}{MAPS[id].name}</option>)}</select></label>
 <p className="survivor-goal">{SURVIVAL_OPEN_MAP_TEST?'全地图已开放 · 自由测试':chapterGoal(progress,map)}</p>
 {saved&&<button className="survivor-primary" disabled={!ready} onClick={resume}>继续上局 · {clock(saved.state.clock)}</button>}
 <button className={saved?'survivor-secondary':'survivor-primary'} disabled={!ready} onClick={start}>{!ready?'加载中…':saved?'另开新局（覆盖存档）':'开始游戏'}</button>
 <p className="survivor-hint">拖动移动 · 自动攻击 · 自动存档</p>
 <details className="survivor-more"><summary>玩法与图鉴</summary><p>{BUILD_GUIDES[role].text}</p><p>最多携带6个技能与6个被动。技能升至8级，搭配被动与精英宝箱完成进化。</p><SurvivorGrowthBook classId={role}/><p>电脑使用 WASD／方向键移动，Q 使用血瓶。</p></details>
 <details className="survivor-more"><summary>章节与战绩</summary>{CHAPTER_PATH.map(id=>{const r=chapterRequirement(id);return <p key={id}>{MAPS[id].name} · {progress.won.includes(id)?'已通关':(SURVIVAL_OPEN_MAP_TEST||chapterUnlocked(progress,id))?`最佳 ${clock(progress.best[id]??0)}`:`需${MAPS[r!.map].name}生存${r!.seconds/60}分钟`}</p>;})}{readSurvivorRecords(localStorage).slice(0,5).map(r=><p key={r.runId}>{CLASSES[r.classId].name} · {MAPS[r.mapId].name} · {clock(r.seconds)} · {r.won?'生还':'倒下'}</p>)}</details>
 <a className="survivor-legacy" href="?">返回原版</a>
 </section>:<>
 {game.phase==='battle'&&<SurvivorHud/>}
 {game.phase==='battle'&&<><SurvivorJoystick/><div className="survivor-controls"><div>{game.survival.chests.length>0&&<p>宝箱 {game.survival.chests.length} · 靠近拾取</p>}{game.skills.some(s=>s.id==='teleport')&&<button onClick={()=>game.useManualSkill()}>瞬息移动</button>}<button aria-label={`使用血瓶，剩余${game.potions.reserve.length}瓶`} disabled={!game.potions.reserve.length} onClick={()=>game.useBloodPotion()}>血瓶 ×{game.potions.reserve.length}</button></div></div></>}
 {game.phase==='upgrade'&&<section className="survivor-panel survivor-upgrade"><h2>{selectingEvolution?'选择武器进化':game.survival.choiceChest?'宝箱强化':'选择强化'}</h2><p>Lv.{game.level} · 选择后继续</p><div className="survivor-choices">{game.choices.map(c=><button className="survivor-choice" key={c.id} onClick={()=>game.choose(c.id)}><span className="survivor-choice-title">{c.skill?<SkillIcon id={c.skill}/>:<img className="mir-choice-item" src={assetUrl("ui/bag.png")} alt=""/>}<strong>{c.name}</strong></span><span>{c.description}</span>{!selectingEvolution&&c.skill&&BUILD_GUIDES[game.classId].main.some(id=>id===c.skill)&&<small className="survivor-recipe">推荐主力</small>}</button>)}</div>{!game.choices.length&&<button onClick={()=>{game.player.hp=game.maxHP;game.phase='battle';game.emit();}}>恢复生命并继续</button>}{!selectingEvolution&&<button disabled={game.survival.rerolls<=0} onClick={()=>{if(game.survival.rerolls>0){game.survival.rerolls--;game.choices=survivalChoices(game);game.emit();}}}>重掷 · 剩余 {game.survival.rerolls}</button>}</section>}
 {game.phase==='paused'&&<section className="survivor-panel survivor-pause"><p className="survivor-eyebrow">{MAPS[game.mapId].name} · {clock(game.clock)}</p><h2>{game.survival.toast||'已暂停'}</h2>{game.survival.toast.startsWith('进化完成')&&recentEvolution&&<p>{EVOLUTIONS[recentEvolution]?.description}</p>}
 <button className="survivor-primary" onClick={()=>{game.survival.toast='';game.pause();}}>继续战斗</button>
 <h3>本局技能 <small>{game.skills.length}/6</small></h3><div className="survivor-build">{game.skills.map(s=><div key={s.id}><span>{title(s.id)}</span><small>{game.survival.evolved.includes(s.id)?'已进化':`${s.rank}/8`}</small></div>)}</div>
 {game.skills.some(s=>s.id==='poison')&&<div className="survivor-tabs"><button aria-pressed={game.tao.poisonMode==='green'} onClick={()=>game.setPoisonMode('green')}>绿毒 · 伤害</button><button aria-pressed={game.tao.poisonMode==='red'} onClick={()=>game.setPoisonMode('red')}>红毒 · 减防</button></div>}
 <details className="survivor-more"><summary>被动与属性 · {Object.keys(game.survival.charms).length}/6</summary>{Object.entries(game.survival.charms).map(([id,n])=><p key={id}>{CHARMS.find(c=>c.id===id)?.name} · {n}/5</p>)}<p>侦测 {Math.round(game.detectionRange)} · 移速 +{Math.round(game.stats.move_speed??0)}%</p><p>击败 {game.kills}</p></details>
 <details className="survivor-more"><summary>成长与进化</summary><EvolutionBook/><SurvivorGrowthBook classId={game.classId} skills={game.skills}/></details>
 <AudioSettings/>
 <button className="survivor-secondary" onClick={saveAndLeave}>保存并退出</button>
 <details className="survivor-exit"><summary>放弃本局</summary><p>本局无法继续，已达成的章节进度保留。</p><button onClick={leave}>确认放弃</button></details>
 </section>}
 {(game.phase==='won'||game.phase==='dead')&&<section className="survivor-panel survivor-result"><p className="survivor-eyebrow">{MAPS[game.mapId].name} · {CLASSES[game.classId].name}</p><h1>{game.phase==='won'?'荒野生还':'本局结束'}</h1><p className="survivor-result-time">{clock(game.clock)}<small>生存时间</small></p><div className="survivor-result-stats"><div><b>{game.level}</b><span>等级</span></div><div><b>{game.kills}</b><span>击败</span></div><div><b>{game.survival.evolved.length}</b><span>进化</span></div></div><p className="survivor-goal">{chapterGoal(progress,game.mapId)}</p><button className="survivor-primary" onClick={start}>再来一局</button><button className="survivor-secondary" onClick={leave}>返回开局</button><details className="survivor-more"><summary>伤害统计</summary>{Object.entries(game.damageDealt).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([id,n])=><div className="survivor-row survivor-rule" key={id}><span>{id==='basic'?'普通攻击':id.startsWith('evolution:')?(EVOLUTIONS[id.slice(10) as keyof typeof EVOLUTIONS]?.name??id):(()=>{try{return getSkill(id as typeof game.skills[number]['id']).name;}catch{return id;}})()}</span><b>{Math.round(n)}</b></div>)}</details></section>}
 </>}</div>;
}
