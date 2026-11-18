import {useState} from 'react';
import {game} from './game';
import {ITEMS,getItem,SLOT_KEYS,SLOT_NAMES,STAT_NAMES,type Item,type Slot} from './content';
import {EQUIPMENT_PREFERENCES,setEquipmentPreference,toggleEquipmentLock} from './auto-equipment';
import {SurvivorArt} from './SurvivorArt';
import {primaryRange} from './equipment';

const labels={offense:'输出',survival:'生存',summon:'召唤'};
const gear=(slot:Slot)=>game.equipment[slot] ? getItem(game.equipment[slot]!.itemId) : undefined;

function EquipmentReadout({label,item,after=false}: {label:string;item:Item;after?:boolean}) {
  const stats=item.slot==='weapon'?primaryRange(game.classId,item.stats):null;
  const values=stats ? `${stats.label} ${stats.min}–${stats.max}` : Object.entries(item.stats).slice(0,2)
    .map(([key,value])=>`${STAT_NAMES[key as keyof typeof STAT_NAMES]??key} +${value}`).join(' · ');
  return <div className="bronze-gear-readout" data-after={after}>
    <span className="bronze-item-slot"><SurvivorArt name={item.icon}/></span>
    <div><small>{label}</small><strong>{item.name}</strong>
      <p>{values || `${item.tier} 阶`}</p></div>
  </div>;
}

export function SurvivorEquipment(){
  const [slot,setSlot] = useState<Slot>('weapon');
  const item=gear(slot);
  const latest=game.telemetry.equipmentFinds(game.runId).reverse().find(find=>find.slot===slot&&find.to===item?.id);
  const prior=ITEMS.find(candidate=>candidate.id===latest?.from);
  const locked=game.survival.equipmentLocks.includes(slot);
  const appearanceKey=[game.classId,gear('weapon')?.id,gear('armor')?.id].join('/');
  return <>
    <div className="bronze-paper-doll" aria-label="角色装备栏">
      {([SLOT_KEYS.filter((_,i)=>i%2===0),SLOT_KEYS.filter((_,i)=>i%2!==0)]).map((column,i)=>
        <div className="bronze-gear-column" key={i}>{column.map(key=>{
          const equipped=gear(key);
          return <button className="bronze-item-slot" key={key} aria-pressed={slot===key} title={SLOT_NAMES[key]}
            aria-label={`${SLOT_NAMES[key]} · ${equipped?.name??'空置'}`} onClick={()=>setSlot(key)}>
            {equipped ? <SurvivorArt name={equipped.icon}/> : <span className="bronze-empty-slot">{SLOT_NAMES[key]}</span>}
          </button>;
        })}</div>)}
      <div className="bronze-paper-doll-figure"><SurvivorArt portrait name={appearanceKey}/></div>
    </div>
    <div className="bronze-gear-compare" data-compare={!!prior}>
      {prior&&<><EquipmentReadout label="更换前" item={prior}/><span className="bronze-gear-arrow" aria-hidden="true">→</span></>}
      {item ? <EquipmentReadout label={prior?'自动穿戴':SLOT_NAMES[slot]} item={item} after={!!prior}/>
        : <p>{SLOT_NAMES[slot]}空置，拾取适合职业的装备后自动穿戴。</p>}
    </div>
    <button className="survivor-primary" disabled={!item} aria-pressed={locked} onClick={()=>toggleEquipmentLock(game,slot)}>
      {locked?'解锁装备':'锁定装备'}
    </button>
    <details className="survivor-more">
      <summary>同阶装备偏好 · {labels[game.survival.equipmentPreference]}</summary>
      <div className="survivor-tabs" aria-label="同阶装备偏好">{EQUIPMENT_PREFERENCES.map(value=>
        <button key={value} aria-pressed={game.survival.equipmentPreference===value} onClick={()=>setEquipmentPreference(game,value)}>{labels[value]}</button>)}</div>
      <p>未锁定部位优先穿高阶，同阶按偏好比较。锁定后保留当前装备，其他掉落自动出售。</p>
    </details>
  </>;
}
