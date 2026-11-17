import {useState} from 'react';
import {game} from './game';
import {CHAPTER_CHALLENGES, challengeAvailable, acceptChapterChallenge, acceptChapterWard, WARD_SECONDS, WARD_DEADLINE} from './chapter-challenge';
import {monsterName} from './encounters';

export function ChapterChallenge({compact = false, wardUnlocked}: {compact?: boolean; wardUnlocked: boolean}) {
 const [error, setError] = useState('');
 const def = CHAPTER_CHALLENGES[game.mapId];
 const challenge = game.survival.challenge;
 const ward = challenge.ward;
 const available = challengeAvailable(game);
 const left = Math.max(0, Math.ceil(challenge.endsAt - game.clock));
 const held = Math.min(WARD_SECONDS, Math.floor(ward?.held ?? 0));
 const name = monsterName(def.kind);
 const wardStatus = `守阵 · ${held}/${WARD_SECONDS}秒 · 剩${left}秒`;

 if (compact) {
  if (available) return <button onClick={() => game.pause()}>{wardUnlocked ? '可选事件' : '可选悬赏'}</button>;
  return challenge.status === 'active' ? <p>{ward ? wardStatus : `悬赏 · ${left}秒 · ${name}`}</p> : null;
 }
 if (!available && challenge.status === 'idle') return null;

 return <details className="survivor-more" open={available || challenge.status === 'active'}>
  <summary>{ward ? '章节事件 · 守阵' : `章节悬赏 · ${def.name}`}</summary>
  {available ? <>
   <p>60秒内击败{name}精英，额外掉落一件本职业可用的二阶武器。超时后敌人仍在场。</p>
   <button onClick={() => {
    if (acceptChapterChallenge(game)) game.pause();
    else setError('暂时无法接战。请移动到开阔处后再试。');
   }}>接战 · 60秒限时</button>
   {wardUnlocked ? <>
    <p>守阵 · {WARD_DEADLINE}秒内在战场标记里累计停留{WARD_SECONDS}秒，获得两瓶强效血瓶。可以离开躲避攻击再回来。</p>
    <button onClick={() => {
     if (!acceptChapterWard(game, wardUnlocked)) setError('附近没有可用的守阵地点。请移动到开阔处后再试。');
    }}>开始守阵 · {WARD_DEADLINE}秒限时</button>
   </> : <p>完成一次普通局悬赏，解锁后续开局的守阵选项。</p>}
   <p>每局任选一项，4分钟后停止接取。</p>
   {error && <p role="status">{error}</p>}
  </> : challenge.status === 'active'
   ? <p>{ward ? wardStatus : `剩余${left}秒，击败带“悬赏”名称的精英。`}</p>
   : <p>{challenge.status === 'won'
    ? (ward ? '守阵完成，血瓶已掉在阵内。' : '已完成，奖励已掉在目标倒下的位置。')
    : '已超时，额外奖励失效。'}</p>}
 </details>;
}
