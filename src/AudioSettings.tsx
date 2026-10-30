import {sounds} from "./sound";
import {game} from "./game";
import {MAPS} from "./content";
import {isGraybox} from "./release";
import {MONSTER_SOUND_EVENTS,type MonsterSoundEvent} from "./monster-audio";

const labels:Record<MonsterSoundEvent,string>={attack:"怪物攻击与叫声",hurt:"怪物受击音效",death:"怪物死亡音效"};
export function AudioSettings(){
  const prepare=()=>{void sounds.unlock().then(()=>sounds.preloadMonsters([...MAPS[game.mapId].monsterPool,MAPS[game.mapId].boss]));game.emit();};
  return <details className="audio-settings">
    <summary>声音设置</summary>
    <fieldset aria-label="声音设置选项">
      <legend>音效开关</legend>
      <label><input type="checkbox" disabled={isGraybox} checked={!sounds.muted} onChange={e=>{sounds.setMuted(!e.currentTarget.checked);prepare();}}/>全部音效</label>
      {MONSTER_SOUND_EVENTS.map(event=><label key={event}><input type="checkbox" disabled={isGraybox} checked={sounds.monsters[event]} onChange={e=>{sounds.setMonsterEnabled(event,e.currentTarget.checked);prepare();}}/>{labels[event]}</label>)}
      <p>开关会保存在本机。</p>
    </fieldset>
  </details>;
}
