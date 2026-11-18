import {CLASSES,type ClassId} from './classes';
import {MAPS,type MapId} from './content';
import {appearanceStatus,retryGameAssets,sceneAssetsReady} from './renderer';

export function AssetProgress({classId,mapId,inBattle=false}: {classId:ClassId;mapId:MapId;inBattle?:boolean}) {
  if(sceneAssetsReady(classId,mapId)) return null;
  const matching=appearanceStatus.selection===classId+'/'+mapId;
  const error=matching||!appearanceStatus.selection?appearanceStatus.error:'';
  const total=matching?appearanceStatus.total:0;
  const loaded=matching?appearanceStatus.loaded:0;
  const label=`${CLASSES[classId].name} · ${MAPS[mapId].name}`;
  return <div className={`game-preload${inBattle?' game-preload-floating':''}`} aria-label="游戏资源">
    {error?<><p role="alert">{error}</p><button type="button" onClick={retryGameAssets}>重试加载</button></>:<>
      <div><span>加载资源 · {label}</span>{total>0&&<span>{Math.floor(loaded/total*100)}%</span>}</div>
      <progress aria-label={`加载${label}的游戏资源`} max={total||1} value={total?loaded:undefined}/>
    </>}
  </div>;
}
