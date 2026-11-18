import {MAPS,ITEMS,type MapId} from './content';
import {SKILLS,type SkillId} from './spells';
import type {ClassId} from './classes';
import {resolveAppearance} from './appearance';
import type {Manifest} from './renderer';

export type SceneSelection = {classId: ClassId; mapId: MapId};

const woodSword=ITEMS.find(item=>item.name==='木剑')!;
export const startingAppearance=resolveAppearance('warrior',{weapon:{itemId:woodSword.id}});

export function sceneMonsterKinds(mapId: MapId, classId?: ClassId) {
  const map=MAPS[mapId];
  return [...new Set([...map.monsterPool,map.boss,
    ...(classId==='taoist'?['beast','summonedSkeleton']:[])])];
}

export function sceneClassSkills(classId: ClassId) {
  return SKILLS.filter(skill=>skill.classId===classId).map(skill=>skill.id);
}

export function skillAssetModels(id: SkillId) {
  switch(id) {
    case 'skeleton': return ['skeleton','summonedSkeleton','summonedSkeleton-shadow'];
    case 'beast': return ['beast','beast-shadow','beastflame'];
    case 'talisman': return ['talisman','talismanHit'];
    // Both impact effects are reached by more than one class.
    case 'charm': return ['charm','explosion'];
    default: return [id];
  }
}

export function indexSceneAssets(assets: Manifest) {
  const models=new Map<string,Set<string>>();
  const add=(model:string, frame:string)=>{
    const texture=assets.frames[frame]?.texture;
    if(!texture) return;
    let pages=models.get(model);
    if(!pages) models.set(model,pages=new Set());
    pages.add(texture);
  };
  for (const [name,sequence] of Object.entries(assets.animations)) {
    const model=name.split('/')[0];
    for (const frame of sequence) add(model,frame);
  }
  for (const [map,world] of Object.entries(assets.worlds??{biche:assets.world})) {
    if(!world) continue;
    for (const part of [...world.tiles,...world.objects]) {
      add('world-'+map,'map/'+part.texture.toString(16).toUpperCase().padStart(8,'0'));
    }
  }

  function pagesFor(names: Iterable<string>, into=new Set<string>()) {
    for (const name of names) for (const page of models.get(name)??[]) into.add(page);
    return into;
  }

  const selections=new Map<string,ReadonlySet<string>>();
  function selectionPages({classId,mapId}:SceneSelection) {
    const key=classId+'/'+mapId;
    const existing=selections.get(key);
    if(existing) return existing;
    const kinds=sceneMonsterKinds(mapId,classId);
    const pages=pagesFor([
      classId, startingAppearance.body, startingAppearance.body+'-shadow', startingAppearance.weapon!,
      'world-'+mapId,'hit','heal',
      ...sceneClassSkills(classId).flatMap(skillAssetModels),
      ...kinds.flatMap(kind=>[kind,kind+'-shadow']),
      ...(mapId==='mine'||mapId==='zuma'?['arrow']:[]),
      ...(mapId==='woma'||mapId==='zuma'?['womaFlame','womaShock']:[]),
      ...(kinds.includes('overlord')?['overlordBlade','overlordDeath']:[]),
    ],new Set(assets.pages.filter(page=>!page.lazy).map(page=>page.key)));
    selections.set(key,pages);
    return pages;
  }

  return {pagesFor,selectionPages};
}
