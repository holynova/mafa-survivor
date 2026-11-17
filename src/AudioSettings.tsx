import {sounds} from "./sound";
import {game} from "./game";
import {MAPS} from "./content";
import {isGraybox} from "./release";
import {MONSTER_SOUND_EVENTS,type MonsterSoundEvent} from "./monster-audio";

const labels:Record<MonsterSoundEvent,string>={attack:"怪物攻击与叫声",hurt:"怪物受击音效",death:"怪物死亡音效"};
export function AudioSettings(){
  const prepare=()=>{void sounds.unlock().then(()=>sounds.preloadMonsters([...MAPS[game.mapId].monsterPool,MAPS[game.mapId].boss,
    ...(game.classId==="taoist"?["beast","summonedSkeleton"]:[])]));game.emit();};
  return <details className="audio-settings">
    <summary>声音设置</summary>
    <fieldset aria-label="声音设置选项">
      <legend>音量与开关</legend>
      <label><input type="checkbox" disabled={isGraybox} checked={!sounds.muted} onChange={e=>{sounds.setMuted(!e.currentTarget.checked);prepare();}}/>全部声音</label>
      {([['master','总音量',sounds.volume],['music','背景音乐',sounds.musicVolume],['combat','战斗音效',sounds.combatVolume]] as const).filter(([channel])=>channel!=='music'||game.survivorMode).map(([channel,label,value])=><label className="audio-volume" key={channel}><span>{label} · {Math.round(value*100)}%</span><input aria-label={label} type="range" min="0" max="100" step="5" disabled={isGraybox} value={value*100} onChange={e=>{sounds.setVolume(channel,Number(e.currentTarget.value)/100);game.emit();}}/></label>)}
      {sounds.musicStatus.error&&<p role="status">{sounds.musicStatus.error}<button onClick={prepare}>重试音乐</button></p>}
      {MONSTER_SOUND_EVENTS.map(event=><label key={event}><input type="checkbox" disabled={isGraybox} checked={sounds.monsters[event]} onChange={e=>{sounds.setMonsterEnabled(event,e.currentTarget.checked);prepare();}}/>{labels[event]}</label>)}
      <p>怪物开关也控制召唤物；设置保存在本机。</p>
    </fieldset>
  </details>;
}
