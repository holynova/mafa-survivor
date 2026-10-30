export const MONSTER_SOUND_EVENTS=["attack","hurt","death"] as const;
export type MonsterSoundEvent=typeof MONSTER_SOUND_EVENTS[number];
export const monsterSoundKey=(kind:string,event:MonsterSoundEvent)=>`monster:${kind}:${event}`;
export function monsterSoundEvent(key:string):MonsterSoundEvent|null {
 const parts=key.split(":");
 return parts.length===3 && parts[0]==="monster" && MONSTER_SOUND_EVENTS.includes(parts[2] as MonsterSoundEvent) ? parts[2] as MonsterSoundEvent : null;
}
