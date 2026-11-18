import {GamePopupClose} from './GamePopupClose';
import {SurvivorArt} from './SurvivorArt';
import {SURVIVOR_STARTS,START_UNLOCK_SECONDS,START_DESCRIPTIONS,survivorStartGuide,availableSurvivorStarts} from './survivor-starts';
import {ChapterChallenge} from './ChapterChallenge';
import {TELEMETRY_KEY} from "./survivor-telemetry";
import {SurvivorDiagnostics} from "./SurvivorDiagnostics";
import {SurvivorGuide} from './SurvivorGuide';
import {survivorGuide} from './survivor-guide';
import {SurvivorResult} from './SurvivorResult';
import {ChapterPicker,ChapterThumbnail,SurvivorQuickSettings} from './SurvivorBronze';
import lobbyTitle from './assets/bronze/lobby-title.webp';
import warriorIcon from './assets/bronze/icon-warrior.webp';
import edgeCharm from './assets/bronze/charm-edge.webp';
import {ControlSettings} from './ControlSettings';
import {visualPreferences} from './visual-settings';
import {VisualSettings} from './VisualSettings';
import {SurvivorSupplies} from './SurvivorSupplies';
import {mainRecipeForChoice} from './survivor-focus';
import {writeSurvivalCheckpoint} from './survivor-persistence';
import {EncounterHud} from './EncounterHud';
import {SurvivorSkillPanel} from './SurvivorSkillPanel';
import type {SkillId} from './spells';
import {SurvivorHud,SkillIcon} from './SurvivorHud';
import {suspendSurvival} from './survivor-lifecycle';
import {SurvivorJoystick} from './SurvivorJoystick';
import {SurvivorGrowthBook} from './SurvivorGrowthBook';
import {useEffect,useLayoutEffect,useReducer,useRef,useState} from 'react';
import {game} from './game';
import {CLASS_IDS,CLASSES,type ClassId} from './classes';
import {getSkill,MAPS,type MapId} from './content';
import {isReady,readyListeners,setBattleInset} from './renderer';
import {sounds} from './sound';
import {AudioSettings} from './AudioSettings';
import {SURVIVAL_OPEN_MAP_TEST,CHARMS,EVOLUTIONS,survivalChoices,survivalStarter} from './survivor';
import {isGraybox,releaseVersion,repositoryUrl} from './release';
import {ShareCardButton} from './ShareCard';
import './survivor.css';
import './survivor-bronze.css';
import {readSurvivalSave,SURVIVOR_SAVE_KEY,type SurvivorSave} from './survivor-save';
import {CHAPTER_PATH,chapterRequirement,chapterUnlocked,chapterGoal,newSurvivorProgress,readSurvivorProgress,updateSurvivorProgress} from './survivor-progress';
import {readSurvivorRecords,recordSurvival} from './survivor-records';
const clock=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
export function SurvivorApp(){const [,update]=useReducer(x=>x+1,0);const [ready,setReady]=useState(isReady());const [error,setError]=useState('');const [saved,setSaved]=useState<SurvivorSave|null>(()=>{try{return readSurvivalSave(localStorage);}catch{return null;}});const [progress,setProgress]=useState(()=>{try{return readSurvivorProgress(localStorage);}catch{return newSurvivorProgress();}});const [role,setRole]=useState<ClassId>('warrior');const [map,setMap]=useState<MapId>('biche');
 const [starts,setStarts]=useState<Partial<Record<ClassId,SkillId>>>({});
 const root=useRef<HTMLDivElement>(null);
 const [choosingMap,setChoosingMap]=useState(false);
 const [choosingRole,setChoosingRole]=useState(false);
 const [showChallenge,setShowChallenge]=useState(false);
 const [upgradeHidden,setUpgradeHidden]=useState(false);
 useLayoutEffect(()=>{
  const hud=root.current?.querySelector<HTMLElement>('.mir-survival-hud');
  if(!hud){setBattleInset(0);return;}
  const measure=()=>setBattleInset(window.innerHeight-hud.getBoundingClientRect().top);measure();
  const observer=new ResizeObserver(measure);observer.observe(hud);
  return()=>{observer.disconnect();setBattleInset(0);};
 },[game.phase]);
 const starter=availableSurvivorStarts(role,progress.roleBest).includes(starts[role]!)?starts[role]!:survivalStarter(role);
 const [skillPanel,setSkillPanel]=useState<{tab:'skills'|'equipment';skill:SkillId|null}>();
 const persist=()=>{try{const cp=writeSurvivalCheckpoint(game,localStorage);if(cp){game.telemetry.persist(game,localStorage);setProgress(updateSurvivorProgress(game,localStorage));setSaved(cp);setError(e=>e.startsWith('存档未保存')?'':e);return true;}return false;}catch{setError('存档未保存：本机存储不可用或已满，请勿刷新。');return false;}};
 const discard=()=>{try{localStorage.removeItem(SURVIVOR_SAVE_KEY);setSaved(null);return true;}catch{setError('无法清除本机存档，请检查浏览器存储。');return false;}};
 useEffect(()=>{let phase=game.phase;const unsub=game.subscribe(()=>{survivorGuide.observe(game);if(game.phase!=='paused'){setSkillPanel(undefined);setShowChallenge(false);}if(game.phase!=='upgrade')setUpgradeHidden(false);if(game.result&&game.mode==='normal')try{setProgress(updateSurvivorProgress(game,localStorage));recordSurvival(game,localStorage);game.telemetry.persist(game,localStorage);localStorage.removeItem(SURVIVOR_SAVE_KEY);setSaved(null);}catch{setError('本机存储不可用，本局战绩未保存。');}else if(game.phase!==phase)persist();phase=game.phase;update();});
 const timer=window.setInterval(persist,5000);
 const suspend=()=>{suspendSurvival(game);document.dispatchEvent(new Event('clear-game-input'));persist();};
 const saveHidden=()=>{if(document.hidden)suspend();};
 window.addEventListener('pagehide',suspend);window.addEventListener('orientationchange',suspend);screen.orientation?.addEventListener('change',suspend);document.addEventListener('visibilitychange',saveHidden);
 const onReady=()=>setReady(true);const onError=()=>setError('原版素材加载失败，请刷新重试。');readyListeners.add(onReady);document.addEventListener('asset-error',onError);return()=>{unsub();clearInterval(timer);window.removeEventListener('pagehide',suspend);window.removeEventListener('orientationchange',suspend);screen.orientation?.removeEventListener('change',suspend);document.removeEventListener('visibilitychange',saveHidden);readyListeners.delete(onReady);document.removeEventListener('asset-error',onError);};},[]);
 const start=()=>{if(!SURVIVAL_OPEN_MAP_TEST&&!chapterUnlocked(progress,map)){setError('请先完成前置章节的生存目标。');return;}if(!discard())return;setError('');void sounds.unlock();game.survivorMode=true;game.unlockedMaps.add(map);game.start('normal',Date.now()>>>0,role,false,map,starter);};
 const resume=()=>{if(!saved)return;setRole(saved.state.classId);setMap(saved.state.mapId);setError('');void sounds.unlock();let diagnosticRaw:string|null=null;try{diagnosticRaw=localStorage.getItem(TELEMETRY_KEY);}catch{}if(!game.resumeSurvival(saved))setError('存档无法读取，请另开新局。');else game.telemetry.restore(game,{getItem:()=>diagnosticRaw});};
 const leave=()=>{try{setProgress(updateSurvivorProgress(game,localStorage));}catch{setError('章节进度未保存，请检查浏览器存储后重试。');return;}if(!discard())return;game.touchInput={x:0,y:0};game.phase='lobby';game.emit();};
 const saveAndLeave=()=>{if(!persist())return;game.touchInput={x:0,y:0};game.phase='lobby';game.emit();};
 const recentEvolution=game.survival.evolved.at(-1);
 const selectingEvolution=game.phase==='upgrade'&&game.choices.some(c=>c.id.startsWith('evo:'));
 const openSkills=(id:SkillId)=>{
  game.pause();
  setSkillPanel({tab:'skills',skill:id});
 };
 const continueBattle=()=>{game.survival.toast='';game.pause();};
 const potionCount=game.potions.reserve.length;
 return <div ref={root} className="survivor-ui survivor-bronze" data-text-size={visualPreferences.textSize} data-phase={game.phase}
  data-building={game.phase==='paused'&&!!skillPanel} data-graybox={isGraybox}>
  {error&&<p className="survivor-error" role="alert">{error}</p>}
  {game.phase==='lobby'?(choosingMap
   ?<ChapterPicker map={map} progress={progress} onChange={id=>{setMap(id);setChoosingMap(false);}} onClose={()=>setChoosingMap(false)}/>
   :<section className="survivor-panel survivor-lobby" aria-labelledby="bronze-lobby-title">
     <div className="bronze-lobby-hero">
      <h1 id="bronze-lobby-title" aria-label="玛法幸存者">{isGraybox?"玛法幸存者":<img src={lobbyTitle} alt=""/>}</h1>
     </div>
     <div className="bronze-lobby-menu">
      <button className="bronze-lobby-entry" aria-expanded={choosingRole} onClick={()=>setChoosingRole(open=>!open)}>
       {!isGraybox&&role==='warrior'?<img src={warriorIcon} className="mir-skill-icon" alt=""/>:<SkillIcon id={survivalStarter(role)}/>}<span>{CLASSES[role].name}</span><i className="bronze-chevron" aria-hidden="true"/>
      </button>
      {choosingRole&&<div className="survivor-tabs bronze-role-options" aria-label="选择职业">
       {CLASS_IDS.map(id=><button key={id} aria-pressed={role===id} onClick={()=>{setRole(id);setChoosingRole(false);}}>{CLASSES[id].name}</button>)}
      </div>}
      <details className="survivor-start-picker">
       <summary className="bronze-lobby-entry"><SkillIcon id={starter}/><span><small>起手</small> {getSkill(starter).name}</span></summary>
       <div className="survivor-choices" aria-label="选择起手技能">{SURVIVOR_STARTS[role].map(id=>{
        const unlocked=availableSurvivorStarts(role,progress.roleBest).includes(id);
        return <button className="survivor-choice" key={id} disabled={!unlocked} aria-pressed={starter===id} onClick={event=>{
         setStarts(s=>({...s,[role]:id}));
         const disclosure=event.currentTarget.closest('details');if(disclosure)disclosure.open=false;
        }}>
         <SkillIcon id={id}/><span className="bronze-choice-copy"><strong>{getSkill(id).name}</strong>
          {unlocked?START_DESCRIPTIONS[id]:`本职业普通局生存5分钟解锁 · 最佳 ${clock(progress.roleBest[role]??0)}`}
         </span>
        </button>;
       })}</div>
      </details>
      <button className="bronze-lobby-entry bronze-lobby-map" onClick={()=>setChoosingMap(true)} aria-label={`选择章节 · ${MAPS[map].name}`}>
       <ChapterThumbnail map={map}/><span>{MAPS[map].name}</span><i className="bronze-chevron" aria-hidden="true"/>
      </button>
      {!SURVIVAL_OPEN_MAP_TEST&&<p className="survivor-goal">{chapterGoal(progress,map)}</p>}
      {saved&&<button className="survivor-primary" disabled={!ready} onClick={resume}>继续上局 · {clock(saved.state.clock)}</button>}
      <button className={saved?'survivor-secondary':'survivor-primary'} disabled={!ready} onClick={start}>
       {!ready?'加载中…':saved?'另开新局（覆盖存档）':'出战'}
      </button>
     </div>
     <details className="bronze-lobby-more">
      <summary>图鉴与战绩</summary>
      <p>{releaseVersion} · 拖动移动 · 自动攻击 · 自动存档</p>
      <details className="survivor-more"><summary>玩法与技能图鉴</summary><p>{survivorStartGuide(role,starter).text}</p>
       {role==='warrior'&&<p>战士击杀回复0.5点生命，与装备回复共用每秒5点上限。</p>}
       <p>18分钟最终首领登场。生存满20分钟且击败首领即可通关；未击败时最多再战2分钟。暂停和升级选择不计时。</p>
       <p>完成一次普通局悬赏可解锁守阵。以后每局可在悬赏和守阵中任选一项。</p>
       <p>最多携带6个技能与6个被动。技能升至8级，搭配被动与精英宝箱完成进化。</p>
       <SurvivorGrowthBook classId={role}/><p>电脑可用 WASD 或方向键移动，按 Q 使用血瓶。</p>
      </details>
      <details className="survivor-more"><summary>章节与战绩</summary>
       {CHAPTER_PATH.map(id=>{const r=chapterRequirement(id);return <p key={id}>{MAPS[id].name} · {progress.won.includes(id)?'已通关':(SURVIVAL_OPEN_MAP_TEST||chapterUnlocked(progress,id))?`最佳 ${clock(progress.best[id]??0)}`:`需${MAPS[r!.map].name}生存${r!.seconds/60}分钟`}</p>;})}
       {readSurvivorRecords(localStorage).slice(0,5).map(r=><p key={r.runId}>{CLASSES[r.classId].name} · {MAPS[r.mapId].name} · {clock(r.seconds)} · {r.won?'生还':'倒下'}</p>)}
      </details>
      <ShareCardButton/><a className="survivor-legacy" href={repositoryUrl} target="_blank" rel="noreferrer">GitHub 源码</a>
      <a className="survivor-legacy" href="?">返回原版</a>
     </details>
    </section>
  ):<>
   {(game.phase==='battle'||game.phase==='paused'||game.phase==='upgrade')&&
    <SurvivorHud onSkillClick={openSkills} interactive={game.phase==='battle'}/>}
   {game.phase==='battle'&&<>
    <EncounterHud/><SurvivorGuide place="battle"/><SurvivorJoystick/>
    <div className="survivor-controls"><div>
     <ChapterChallenge wardUnlocked={progress.wardUnlocked} onOpen={()=>{game.pause();setShowChallenge(true);}}/>
     {game.survival.chests.length>0&&<p>宝箱 {game.survival.chests.length} · 靠近拾取</p>}
     {game.skills.some(s=>s.id==='teleport')&&<button onClick={()=>game.useManualSkill()}>瞬息移动</button>}
     <button className="bronze-potion" aria-label={`使用血瓶，剩余${potionCount}瓶`}
      disabled={!potionCount||game.player.hp<=0||game.player.hp>=game.maxHP||game.potions.cd>0} onClick={()=>game.useBloodPotion()}>
      {isGraybox?<span aria-hidden="true">血瓶</span>:<SurvivorArt name="item/金创药（小）"/>}
      <span aria-hidden="true">×{potionCount}</span>
     </button>
    </div></div>
   </>}
   {game.phase==='upgrade'&&(upgradeHidden
    ? <button className="game-popup-reopen" autoFocus data-pending-popup="upgrade" onClick={()=>setUpgradeHidden(false)}>继续选强化</button>
    : <section className="survivor-panel survivor-upgrade" role="dialog" aria-modal="true" aria-labelledby="bronze-upgrade-title">
    <GamePopupClose label="收起强化面板" onClose={()=>setUpgradeHidden(true)}/>
    <h2 id="bronze-upgrade-title">{selectingEvolution?'选择武器进化':game.survival.choiceChest?'宝箱强化':'选择强化'}</h2>
    <SurvivorGuide place="upgrade"/>
    <div className="survivor-choices">{game.choices.map(c=>{
     const recipes=selectingEvolution?[]:mainRecipeForChoice(game,c);
     return <button className="survivor-choice" key={c.id} onClick={()=>game.choose(c.id)}>
      {c.skill?<SkillIcon id={c.skill}/>:!isGraybox&&c.name.startsWith('锋锐戒指')?<img className="mir-skill-icon" src={edgeCharm} alt=""/>:<span className="mir-passive-icon" aria-label="被动属性">{c.name.slice(0,1)}</span>}
      <span className="bronze-choice-copy"><strong>{c.name}</strong><span>{c.description}</span>
       {!selectingEvolution&&c.skill&&game.survival.mainSkills.includes(c.skill)&&<small className="survivor-recipe">主修技能</small>}
       {recipes.length>0&&<small className="survivor-recipe">{recipes.map(id=>getSkill(id).name).join('／')}的进化配方</small>}
      </span>
     </button>;
    })}</div>
    {!game.choices.length&&<button className="survivor-primary" onClick={()=>{game.player.hp=game.maxHP;game.phase='battle';game.emit();}}>恢复生命并继续</button>}
    {!selectingEvolution&&<button className="bronze-reroll" disabled={game.survival.rerolls<=0} onClick={()=>{
     if(game.survival.rerolls>0){game.survival.rerolls--;game.choices=survivalChoices(game);game.emit();}
    }}>重掷 <small>剩余 {game.survival.rerolls}</small></button>}
   </section>)}
   {game.phase==='paused'&&showChallenge&&<section className="survivor-panel survivor-challenge" role="dialog" aria-modal="true" aria-labelledby="bronze-challenge-title">
    <GamePopupClose label="关闭章节悬赏" onClose={continueBattle}/>
    <h2 id="bronze-challenge-title">{progress.wardUnlocked?'章节事件':'章节悬赏'}</h2>
    <ChapterChallenge inline wardUnlocked={progress.wardUnlocked}/>
   </section>}
   {game.phase==='paused'&&skillPanel&&<SurvivorSkillPanel initialSelected={skillPanel.skill} initialTab={skillPanel.tab} onBack={()=>setSkillPanel(undefined)}/>}
   {game.phase==='paused'&&!skillPanel&&!showChallenge&&<section className="survivor-panel survivor-pause" role="dialog" aria-modal="true" aria-labelledby="bronze-pause-title">
    <GamePopupClose label="关闭暂停菜单，继续战斗" onClose={continueBattle}/>
    <h2 id="bronze-pause-title">{game.survival.toast||'暂停'}</h2>
    {game.survival.toast.startsWith('进化完成')&&recentEvolution&&<p>{EVOLUTIONS[recentEvolution]?.description}</p>}
    <button className="survivor-primary" onClick={continueBattle}>继续</button>
    <SurvivorQuickSettings/>
    <button className="survivor-secondary bronze-open-build" onClick={()=>setSkillPanel({tab:'equipment',skill:null})}>技能与装备</button>
    <details className="survivor-more bronze-more-settings"><summary>更多设置与本局信息</summary>
     {game.skills.some(s=>s.id==='poison')&&<div className="survivor-tabs">
      <button aria-pressed={game.tao.poisonMode==='green'} onClick={()=>game.setPoisonMode('green')}>绿毒 · 伤害</button>
      <button aria-pressed={game.tao.poisonMode==='red'} onClick={()=>game.setPoisonMode('red')}>红毒 · 减防</button>
     </div>}
     <details className="survivor-more"><summary>被动与属性 · {Object.keys(game.survival.charms).length}/6</summary>
      {Object.entries(game.survival.charms).map(([id,n])=><p key={id}>{CHARMS.find(c=>c.id===id)?.name} · {n}/5</p>)}
      <p>侦测 {Math.round(game.detectionRange)} · 移速 +{Math.round(game.stats.move_speed??0)}%</p><p>击败 {game.kills}</p>
     </details>
     <ChapterChallenge wardUnlocked={progress.wardUnlocked}/><SurvivorSupplies/>
     <ControlSettings/><VisualSettings/><AudioSettings/><SurvivorDiagnostics/><ShareCardButton/>
     <button className="survivor-guide-reset" onClick={()=>{survivorGuide.reset();game.emit();}}>重新查看新手提示</button>
    </details>
    <details className="bronze-end-run"><summary>结束本局</summary>
     <button className="survivor-secondary" onClick={saveAndLeave}>保存并退出</button>
     <details className="survivor-exit"><summary>放弃本局</summary><p>本局无法继续，已达成的章节进度保留。</p><button onClick={leave}>确认放弃</button></details>
    </details>
   </section>}
   {(game.phase==='won'||game.phase==='dead')&&<SurvivorResult progress={progress} clock={clock(game.clock)} onRetry={start} onLeave={leave}/>}
  </>}
 </div>;
}
