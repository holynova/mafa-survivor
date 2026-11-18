import {GamePopupClose} from './GamePopupClose';
import {useState} from 'react';
import type {ReactNode} from 'react';
import {game} from './game';
import {MAPS,type MapId} from './content';
import {CHAPTER_PATH,chapterGoal,chapterUnlocked,type SurvivorProgress} from './survivor-progress';
import {SURVIVAL_OPEN_MAP_TEST} from './survivor';
import {sounds} from './sound';
import {MONSTER_SOUND_EVENTS} from './monster-audio';
import {isGraybox} from './release';
import {setVisual,visualPreferences} from './visual-settings';

const chapters = import.meta.glob<string>(['./assets/bronze/chapter-*.webp','./assets/bronze/illustration-*.webp','!./assets/bronze/chapter-background.webp'], {
  eager: true, import: 'default', query: '?url',
});

export function ChapterThumbnail({map}: {map: MapId}) {
  const src = chapters[`./assets/bronze/illustration-${map}.webp`] ?? chapters[`./assets/bronze/chapter-${map}.webp`];
  return !isGraybox && src ? <img className="bronze-chapter-thumb" src={src} alt="" draggable={false}/> : null;
}

export function ChapterPicker({map,progress,onChange,onClose}: {
  map: MapId;
  progress: SurvivorProgress;
  onChange: (map: MapId) => void;
  onClose: () => void;
}) {
  const [selected,setSelected] = useState(map);
  return <section className="survivor-panel survivor-chapters" role="dialog" aria-modal="true" aria-labelledby="chapter-picker-title">
    <GamePopupClose label="关闭章节选择" onClose={onClose}/>
    <h2 className="bronze-plaque" id="chapter-picker-title">选择章节</h2>
    <div className="bronze-chapter-list" aria-label="章节">
      {CHAPTER_PATH.map(id => <button className="bronze-chapter" key={id} type="button" aria-pressed={selected===id}
        disabled={!SURVIVAL_OPEN_MAP_TEST&&!chapterUnlocked(progress,id)} onClick={()=>setSelected(id)}>
        <ChapterThumbnail map={id}/><span>{MAPS[id].name}</span>
      </button>)}
    </div>
    {!SURVIVAL_OPEN_MAP_TEST&&<p className="survivor-goal">{chapterGoal(progress,selected)}</p>}
    <button className="survivor-primary" onClick={()=>onChange(selected)}>确认</button>
    <button className="bronze-return" onClick={onClose}>返回大厅</button>
  </section>;
}

function Toggle({children,variant,checked,disabled,onChange}: {
  children: ReactNode; variant:'sound'|'numbers'; checked: boolean; disabled?: boolean; onChange: (enabled:boolean)=>void;
}) {
  return <label className="bronze-toggle" data-icon={variant}>
    <span>{children}</span>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e=>onChange(e.currentTarget.checked)}/>
    <span className="bronze-switch" aria-hidden="true"/>
  </label>;
}

export function SurvivorQuickSettings() {
  return <fieldset className="bronze-quick-settings">
    <legend>设置</legend>
    <Toggle variant="sound" disabled={isGraybox} checked={MONSTER_SOUND_EVENTS.some(event=>sounds.monsters[event])} onChange={enabled=>{
      for (const event of MONSTER_SOUND_EVENTS) sounds.setMonsterEnabled(event,enabled);
      if (enabled) void sounds.unlock().then(()=>sounds.preloadMonsters([...MAPS[game.mapId].monsterPool,MAPS[game.mapId].boss]));
      game.emit();
    }}>怪物音效</Toggle>
    <Toggle variant="numbers" checked={visualPreferences.numbers!=='off'} onChange={enabled=>{
      setVisual({numbers:enabled?'full':'off'});
      game.emit();
    }}>伤害数字</Toggle>
  </fieldset>;
}
