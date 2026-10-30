import {heroPose} from "./hero-pose";
import { isGraybox } from "./release";
import { useEffect, useState } from "react";
import { sounds } from "./sound";
import { game } from "./game";
import { CLASS_IDS, CLASSES, type ClassId } from "./classes";
import { SKILLS, MONSTERS, MAPS, PLAYABLE_MAP_IDS, isBossKind, getSkill, type SkillId, type MapId } from "./content";
import { inputDiagnostics } from "./input";
import { hasWorldAppearance } from "./appearance";
import { appearanceStatus } from "./renderer";
import { ITEMS, getItem } from "./content";
import { testNextWave, testSkillRank, testWear, testSpawn, testEquip, testClear, testBossPhase, testMeleeWall, testMeleeFacing, testCombatRecovery, testIncomingWall, testSpellVisual,testChapterVisual,testLootVisual,testPotionPickup,testPlayerFeedback,testSummonWall,testSummonPriority,testMeleeAim,testHealthWalk,testBossEngagement,testMeleeDodge,testFootOcclusion,testRoleCadence,testViewportEdge,testPotionReserve } from "./test-mode";
import {damageSourceName} from "./damage-taken";
import {skillMetrics} from "./skill-metrics";
import {SKILL_GROWTH} from "./skill-growth";
import {TEST_BUILDS,testBossBuild} from "./test-builds";
export function TestTools() {
  const [open, setOpen] = useState(true),
    [kind, setKind] = useState("orc"),
    [count, setCount] = useState(10);
  const [selected, setSelected] = useState<SkillId>(
      game.classInfo.startingSkill,
    ),
    [slot, setSlot] = useState(0);
  const [rank,setRank]=useState(1);
  const [scenarioNotice,setScenarioNotice]=useState("");
  const [buildId,setBuildId]=useState(TEST_BUILDS[0].id);
  const [buildNotice,setBuildNotice]=useState("");
  useEffect(()=>setScenarioNotice(""),[game.runId]);
  useEffect(()=>setSelected(game.classInfo.startingSkill),[game.classId]);
  useEffect(() => {
    if (["upgrade", "replace", "shop", "won", "dead"].includes(game.phase)) {
      setOpen(false);
    }
  }, [game.phase]);
  if (game.mode !== "test" || game.phase === "lobby") return null;
  const pose=heroPose(game,game.clock);
  const motionNames:Record<string,string>={idle:"站立",walk:"行走",attack:"挥砍",cast:"施法",hurt:"受击",death:"死亡"};
  const directions=["上","右上","右","右下","下","左下","左","左上"];
  return (
    <aside className="test-tools">
      <button className="test-toggle" onClick={() => setOpen(!open)}>
        {open ? "收起测试工具" : "展开测试工具"}
      </button>
      {open && (
        <section aria-label="快速测试工具">
          <h2>
            测试模式 <small>不写入战绩 · 不发放结晶</small>
          </h2>
          <output aria-label="移动诊断">
            坐标 {game.player.x.toFixed(1)}, {game.player.y.toFixed(1)}
            <br />
            按住：{inputDiagnostics.held}
            <br />
            输入：{inputDiagnostics.last}
          </output>
          <output aria-label="攻击画面诊断">
            画面：{motionNames[pose.motion] ?? pose.motion} · {directions[pose.dir]}<br />
            移动朝向：{directions[game.player.dir]} · 最近挥砍：{game.player.attackUntil>0 ? directions[game.player.attackDir] : "尚未出手"}
          </output>
          <output aria-label="战斗回复诊断">
            生命 {game.player.hp.toFixed(2)} / {game.maxHP.toFixed(0)}<br />
            本局击杀回复 {game.combatRecovery.healing.onKill.toFixed(2)} ·
            本局生命偷取 {game.combatRecovery.healing.lifeSteal.toFixed(2)}
          </output>
          <output aria-label="实际承伤诊断">
            实际承伤：物理 {game.damageTaken.physical.toFixed(2)} · 法术 {game.damageTaken.magic.toFixed(2)}<br />
            {Object.entries(game.damageTaken.sources).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([source,value])=>
              <span key={source}>{damageSourceName(source)} {value.toFixed(2)}<br /></span>)}
          </output>
          <label><input type="checkbox" checked={game.test.showDetection} onChange={e=>{game.test.showDetection=e.target.checked;game.emit();}} />显示侦测圈 · {Math.round(game.detectionRange)}px</label>
          <div className="test-row">
            <button onClick={()=>testSpellVisual(game,"hellfire",rank)}>地狱火定格样例</button>
            <button onClick={()=>testSpellVisual(game,"beast",rank)}>神兽喷火定格样例</button>
            <button onClick={()=>testSpellVisual(game,"poison",rank)}>红蓝中毒定格样例</button>
            <button onClick={()=>testSummonWall(game)}>神兽隔墙喷火对照（矿洞）</button>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testSummonPriority(game)}>召唤物首领优先（沃玛）</button>
            <button onClick={()=>testBossEngagement(game)}>Boss接敌与避险（赤月）</button>
            <button onClick={()=>testMeleeDodge(game)}>战士近战避险（沃玛）</button>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testMeleeDodge(game,true)}>战士蓄力抢攻（沃玛）</button>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testMeleeAim(game,"thrust")}>刺杀1→2级游走（沃玛）</button>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testMeleeAim(game,"cleave")}>半月游走选群（沃玛）</button>
            <button onClick={()=>testFootOcclusion(game)}>前景脚部遮挡（赤月）</button>
            <button onClick={()=>testViewportEdge(game)}>地图下沿镜头（沃玛）</button>
            {game.classId!=="wizard" && <button onClick={()=>testRoleCadence(game)}>技能节奏与施毒（沃玛）</button>}
          </div>
          {game.test.meleeAimSample && <><output aria-label="近战自动瞄准诊断">{game.test.meleeAimSample.kind==="thrust" ? "刺杀1→2级" : "半月手动朝向→自动选群"}<br />对照伤害 {game.test.meleeAimSample.beforeDamage} → {game.test.meleeAimSample.afterDamage}<br />实际命中 {game.test.meleeAimSample.hits} · 右移 {(game.test.meleeAimSample.endX-game.test.meleeAimSample.startX).toFixed(1)}px</output><p>固定高血量靶怪，准确强化只用于测试；关闭普攻和自然刷怪。只检验实际位移、选敌和命中，不代表普通局通关。</p></>}
          {game.test.summonPrioritySample && <><output aria-label="召唤物选敌诊断">{game.enemies.map(e=><span key={e.id}>{isBossKind(e.kind) ? "首领" : "近处小怪"}：{Math.round(e.maxHp-e.hp)}伤害<br /></span>)}</output><p>固定靶只检验选敌：首领与更近的小怪分居神兽两侧；射程、视线和喷火范围均照常判定。此样例不代表正常通关能力。</p></>}
          {game.test.cadenceSample && <>
            <output aria-label="技能节奏诊断">样例时间 {game.clock.toFixed(2)}秒<br />{game.skills.map(s=><span key={s.id}>{getSkill(s.id).name}：基础冷却 {getSkill(s.id).cooldown.toFixed(2)}秒 · 当前 {s.cd.toFixed(2)}秒 · 实际伤害 {Math.round(game.damageDealt[s.id]??0)}<br /></span>)}绿毒覆盖 {game.enemies.filter(e=>(e.greenPoison?.until??0)>game.clock).length} / {game.enemies.length} · 红毒覆盖 {game.enemies.filter(e=>(e.redPoison?.until??0)>game.clock).length} / {game.enemies.length}</output>
            <p>无敌、固定高血量靶怪、关闭普攻和刷怪，仅观察真实技能冷却与命中。点击「继续」；道士约4秒后覆盖第二只，点击施毒术可切换红毒。此样例不用于评估生存平衡。</p>
          </>}
          <label>首领挑战构筑 <select aria-label="首领挑战构筑" value={buildId} onChange={e=>setBuildId(e.target.value)}>{TEST_BUILDS.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>setBuildNotice(testBossBuild(game,buildId) ? "" : "当前地图未找到可见的合法首领位置，请换图后重试。")}>载入本章首领挑战</button>
          {buildNotice && <p role="status">{buildNotice}</p>}
          {game.test.bossBuild && <>
            <output aria-label="首领构筑挑战诊断">{game.test.bossBuild.name} · {game.clock.toFixed(1)}秒 / {game.duration}秒<br />首领生命 {Math.max(0,Math.ceil(game.test.bossBuild.boss.hp))} / {Math.ceil(game.test.bossBuild.boss.maxHp)}<br />对首领实际伤害 {Math.round(Math.min(game.test.bossBuild.boss.maxHp,game.test.bossBuild.boss.maxHp-game.test.bossBuild.boss.hp))} · 承伤 {Math.round(game.damageTaken.physical+game.damageTaken.magic)}<br />{game.test.bossBuild.equipment.join(" · ")}</output>
            <p>直接授予预设装备和6／6／3／2／2／1级技能，已切换职业。无敌关闭，自动走位开启；保留第12波首领完整AI和召唤援军，关闭普通波次刷怪。此挑战不代表完整成长／经济或通关平衡，测试不保存战绩。点击「继续」开始，可手动接管。</p>
            <details><summary>查看预设技能等级</summary>{game.test.bossBuild.branches.map(line=><p key={line}>{line}</p>)}</details>
          </>}
          {game.test.footOcclusionSample && <p>固定在原赤月源图前景边缘；脚部被挡时仍显示完整人物／武器轮廓，地图条带保持原图。</p>}
          {game.test.cameraEdgeSample && <p>固定在原沃玛地图最下方的合法地面，检查人物脚部与阴影完整显示在操作栏上方。窗口缩放时随实际操作栏高度调整。</p>}
          {(game.test.engagementSample || game.test.meleeDodgeSample) && <>
            <output aria-label="自动接敌实战诊断">距首领 {game.boss ? Math.round(Math.hypot(game.boss.x-game.player.x,game.boss.y-game.player.y)) : "—"}px · 侦测 {Math.round(game.detectionRange)}px<br />实际输出 {Math.round(Object.values(game.damageDealt).reduce((n,v)=>n+v,0))} · 实际承伤 {Math.round(game.damageTaken.physical+game.damageTaken.magic)}</output>
            <p>已关闭刷怪和无敌，自动走位已开启。点击「继续」观察接敌、攻击和撤离预警；方向键或拖动可接管。{game.test.meleeWindowSample ? "从66px进入普攻距离，利用早期蓄力抢攻后撤离；其他首领技能关闭，只验证近战窗口。" : game.test.meleeDodgeSample ? "此样例固定首领近战，关闭其他首领技能。" : "可切换职业后重新载入。"}测试不保存战绩。</p>
          </>}
          {game.test.summonWallSample && <output aria-label="神兽隔墙伤害诊断">{game.enemies.slice(0,2).map((e,i)=><span key={e.id}>{i ? "可见" : "墙后"}目标实际伤害 {Math.round(e.maxHp-e.hp)}<br /></span>)}同一喷火扇形，按原地图阻挡判定。测试不保存战绩。</output>}
          <button onClick={()=>testChapterVisual(game)}>重置本章并展陈怪物（暂停）</button>
          <div className="test-row">
            <button onClick={()=>testLootVisual(game)}>原版掉落展陈（沃玛）</button>
            <button onClick={()=>testPotionPickup(game)}>验证血瓶拾取</button>
            <button onClick={()=>testPotionReserve(game)}>储药与Q回血（沃玛）</button>
            <button onClick={()=>testPotionReserve(game,true)}>半血自动用药（沃玛）</button>
            <button onClick={()=>testHealthWalk(game)}>自动寻药样例（沃玛）</button>
            <button onClick={async()=>{await sounds.unlock();testPlayerFeedback(game);}}>真实受伤后定格</button>
            <button onClick={async()=>{await sounds.unlock();testPlayerFeedback(game,true);}}>真实死亡演示</button>
          </div>
          {game.test.healthWalkSample && <p>已关闭刷怪，开局缺血60点，自动走位已开启。点击「继续」观察角色自行绕行拾药；方向键和拖动可随时接管。</p>}
          {game.test.potionReserveSample && <p>真实拾取4瓶：储备3瓶、余下1瓶移到远处，随后实际受伤。点击「继续」后按Q或点血瓶；生命≤50%会自动用药，每2秒最多1瓶。测试不保存战绩。</p>}
          {game.test.lootLabels && !game.test.healthWalkSample && <p>五档原版金币堆表示经验／金币，装备与血瓶使用独立落地图。靠近拾取；满血储药最多3瓶，额外留在地面；空槽穿戴装备，否则出售。测试不保存战绩。</p>}
          {game.mapId==="mine" && <>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testIncomingWall(game)}>重置并载入敌伤隔墙样例</button>
            {game.test.incomingWallSample && <>
              <p>敌伤样例：固定种子17，无敌已关闭、关闭刷怪与玩家攻击，尸王实际震地后暂停。先检查隔墙零承伤，再移至可见地面作对照；正常闪避仍生效，测试不保存战绩。</p>
              <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testIncomingWall(game,true)}>移至可见地面并复测震地</button>
            </>}
          </>}
          <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>testCombatRecovery(game)}>
            重置并载入续航样例
          </button>
          {game.test.recoverySample && <p role="status">续航样例：用测试金币买满两种道具，半血、无敌、仅普攻；击杀固定稻草人后暂停，可在属性面板查看实际回复。</p>}
          <p>
            {sounds.status} · 已播放 {sounds.played} 次
          </p>
          <output aria-label="受伤与死亡音效诊断">受伤音效 {sounds.playedByKey.hurt??0} · 阵亡音效 {sounds.playedByKey.death??0}<br />血瓶实际回复 {(game.tao.healing.bloodPotion??0).toFixed(1)}</output>
          <output aria-label="储备血瓶诊断">储备 {game.potions.reserve.length} / 3 · 小瓶 {game.potions.reserve.filter(p=>p===20).length} · 中瓶 {game.potions.reserve.filter(p=>p===35).length}<br />用药冷却 {game.potions.cd.toFixed(2)}秒 · 生命≤50%自动使用<br />治疗音效 {sounds.playedByKey.heal??0}</output>
          <button
            disabled={isGraybox}
            onClick={async () => {
              await sounds.unlock();
              sounds.play("fireball");
              game.emit();
            }}
          >
            {isGraybox ? "此版未提供音效试听" : "试听原版火球音效"}
          </button>
          <div className="test-row">
            <label>
              <input type="checkbox" checked={game.test.spawning}
                onChange={(e)=>{game.test.spawning=e.target.checked;game.emit();}} />
              自然刷怪
            </label>
            <label>
              <input
                type="checkbox"
                checked={game.test.god}
                onChange={(e) => {
                  game.test.god = e.target.checked;
                  game.emit();
                }}
              />
              无敌
            </label>
            <label>
              <input type="checkbox" checked={game.test.autowalk}
                onChange={(e)=>{game.test.autowalk=e.target.checked;game.emit();}} />
              自动走位
            </label>
            <label>
              速度{" "}
              <select
                aria-label="测试速度"
                value={game.test.speed}
                onChange={(e) => {
                  game.test.speed = Number(e.target.value);
                  game.emit();
                }}
              >
                {[1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}×
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => game.pause()}
              disabled={!["battle", "paused"].includes(game.phase)}
            >
              {game.phase === "paused" ? "继续" : "暂停"}
            </button>
          </div>
          {game.test.autowalk && <p>自动避敌和拾取；按方向键或拖动可接管。升级和商店仍由你选择。</p>}
          {!game.test.spawning && <p>波次投放已关闭，场上怪物和 Boss 仍会行动。</p>}
          {game.classId==="warrior" && <>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>
              setScenarioNotice(testMeleeWall(game) ? "已固定两只骷髅战士，装配半月和刺杀并关闭自然刷怪。切回实战，观察墙后敌人不受伤；可手动绕墙接敌。" : "此地图未找到合适的隔墙位置，请切换到矿洞重试。")}>载入隔墙近战样例</button>
            <button disabled={!["battle","paused"].includes(game.phase)} onClick={()=>
              setScenarioNotice(testMeleeFacing(game) ? "已暂停在一次真实半月之后：两只可见骷髅与一只更近的墙后骷髅，检查人物／武器／半月朝向及受伤对象。" : "此地图未找到合适位置，请切换到矿洞重试。")}>载入近战朝向样例</button>
            {scenarioNotice && <p role="status">{scenarioNotice}</p>}
          </>}
          <label>
            地图{" "}
            <select aria-label="测试地图" value={game.mapId}
              onChange={(e) => game.start("test", game.seed, game.classId, false, e.target.value as MapId)}>
              {PLAYABLE_MAP_IDS.map((id) => <option key={id} value={id}>{MAPS[id].name}</option>)}
            </select>
          </label>
          <label>
            职业{" "}
            <select
              aria-label="测试职业"
              value={game.classId}
              onChange={(e) => {
                const id = e.target.value as ClassId;
                game.start("test", game.seed, id);
                setSelected(CLASSES[id].startingSkill);
              }}
            >
              {CLASS_IDS.map((id) => (
                <option key={id} value={id}>
                  {CLASSES[id].name}
                </option>
              ))}
            </select>
          </label>
          {(["weapon", "armor"] as const).map((kind) => (
            <label key={kind}>
              {kind === "weapon" ? "武器外观" : "衣服外观"}
              <select aria-label={kind === "weapon" ? "测试武器" : "测试衣服"}
                value={game.equipment[kind]?.itemId ?? ""}
                onChange={(e) => { if (e.target.value) testWear(game, e.target.value); }}>
                {!game.equipment[kind] && <option value="">基础布衣</option>}
                {ITEMS.filter((i) => i.slot === kind && (!i.classId || i.classId === game.classId) && hasWorldAppearance(i)).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </label>
          ))}
          <p>当前穿戴：{game.equipment.weapon ? getItem(game.equipment.weapon.itemId).name : "空手"} · {game.equipment.armor ? getItem(game.equipment.armor.itemId).name : "基础布衣"}</p>
          {appearanceStatus.loading && <p role="status">正在载入原版素材…</p>}
          {appearanceStatus.error && <p role="alert">{appearanceStatus.error} <button onClick={() => document.dispatchEvent(new Event("retry-appearance"))}>重试素材</button></p>}
          <label>
            人物动作{" "}
            <select
              aria-label="人物动作"
              value={game.test.pose}
              onChange={(e) => {
                game.test.pose = e.target.value;
                game.emit();
              }}
            >
              {["live", "idle", "walk", "attack", "cast", "hurt", "death"].map(
                (p, i) => (
                  <option key={p} value={p}>
                    {
                      ["实战", "站立", "行走", "攻击", "施法", "受击", "死亡"][
                        i
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            检查方向{" "}
            <select
              aria-label="检查方向"
              value={game.test.direction}
              onChange={(e) => {
                game.test.direction = Number(e.target.value);
                game.emit();
              }}
            >
              {["上", "右上", "右", "右下", "下", "左下", "左", "左上"].map(
                (p, i) => (
                  <option key={i} value={i}>
                    {p}
                  </option>
                ),
              )}
            </select>
          </label>
          {game.test.pose !== "live" && (
            <p>动作检查中，战斗模拟暂停；切回“实战”后恢复。</p>
          )}
          <div className="test-row">
            <button
              onClick={() => {
                game.player.hp = game.maxHP;
                game.emit();
              }}
            >
              回满生命
            </button>
            <button
              onClick={() => {
                game.gold += 1000;
                game.emit();
              }}
            >
              金币 +1000
            </button>
          </div>
          <label>
            刷怪{" "}
            <select
              aria-label="测试怪物"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {MONSTERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            数量{" "}
            <input
              aria-label="刷怪数量"
              type="number"
              min="1"
              max="300"
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(300, Number(e.target.value))))
              }
            />
          </label>
          <div className="test-row">
            <button disabled={!["battle", "paused"].includes(game.phase)} onClick={() => testSpawn(game, kind, count)}>
              生成怪物
            </button>
            <button disabled={!["battle", "paused"].includes(game.phase)} onClick={() => testSpawn(game, MAPS[game.mapId].boss, 1)}>
              生成 Boss
            </button>
            <button onClick={() => testClear(game)}>清场</button>
            <button aria-label="测试Boss狂暴与预警" disabled={!game.boss || !["battle", "paused"].includes(game.phase)} onClick={() => testBossPhase(game)}>
              Boss半血 / 技能就绪
            </button>
          </div>
          <label>
            技能{" "}
            <select
              aria-label="测试技能"
              value={selected}
              onChange={(e) => setSelected(e.target.value as SkillId)}
            >
              {SKILLS.filter((s) => s.classId === game.classId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            替换技能槽{" "}
            <select
              aria-label="替换技能槽"
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1} ·{" "}
                  {game.skills[i] ? getSkill(game.skills[i].id).name : "空"}
                </option>
              ))}
            </select>
          </label>
          <label>技能等级 <select aria-label="测试技能等级" value={rank} onChange={e=>setRank(Number(e.target.value))}>
            {[1,2,3,4,5,6].map(level=><option key={level} value={level}>Lv.{level}</option>)}
          </select></label>
          <button onClick={()=>testSkillRank(game,selected,slot,rank)}>应用所选技能等级</button>
          <output aria-label="技能等级诊断">{getSkill(selected).classId===game.classId && <>
            {getSkill(selected).name} · Lv.{rank}：{SKILL_GROWTH[selected][rank-1].label}<br />
            {skillMetrics(game,game.newSkill(selected,rank)).join(" · ")}
          </>}</output>
          <div className="test-row">
            <button onClick={() => testEquip(game, selected, slot)}>
              装备所选技能
            </button>
            <button
              onClick={() => {
                game.skills.forEach((s) => (s.cd = 0));
                game.emit();
              }}
            >
              清除冷却
            </button>
          </div>
          <div className="test-row">
            <button
              onClick={() => {
                testNextWave(game);
              }}
            >
              下一波 / 商店
            </button>
            <button onClick={() => game.start("test", game.seed, game.classId)}>
              重置测试
            </button>
            <button onClick={() => game.lobby()}>退出测试</button>
          </div>
        </section>
      )}
    </aside>
  );
}
