import {useState} from 'react';
import {game} from './game';
import {CHAPTER_CHALLENGES,challengeAvailable,acceptChapterChallenge} from './chapter-challenge';
import {monsterName} from './encounters';
export function ChapterChallenge({compact=false}:{compact?:boolean}){
 const [error,setError]=useState('');
 const def=CHAPTER_CHALLENGES[game.mapId],c=game.survival.challenge;if(!def)return null;
 const available=challengeAvailable(game),left=Math.max(0,Math.ceil(c.endsAt-game.clock));
 if(compact)return available?<button onClick={()=>game.pause()}>可选悬赏</button>:c.status==='active'?<p>悬赏 · {left}秒 · {monsterName(def.kind)}</p>:null;
 if(!available&&c.status==='idle')return null;
 return <details className="survivor-more" open={available||c.status==='active'}><summary>章节悬赏 · {def.name}</summary>{available?<><p>额外迎战一只{monsterName(def.kind)}精英。60秒内击败，额外掉落一件本职业可用的二阶武器，需靠近拾取。高级装备或锁定部位仍按原规则保留。</p><p>每局一次，4分钟后停止接取。超时失去额外奖励，敌人仍留在场上；不接不影响通关。</p><button onClick={()=>{if(acceptChapterChallenge(game))game.pause();else setError('暂时无法接战：附近通路不足或敌人已满，请移动到开阔处后再试。');}}>接战 · 60秒限时</button>{error&&<p role="status">{error}</p>}</>:<p>{c.status==='active'?`剩余${left}秒，击败带“悬赏”名称的精英。`:c.status==='won'?'已完成，奖励已掉在目标倒下的位置。':'已超时，额外奖励失效。'}</p>}</details>;
}
