import { isGraybox } from "./release";
import { useEffect, useState } from "react";
import { sounds } from "./sound";
import { game } from "./game";
import { CLASS_IDS, CLASSES, type ClassId } from "./classes";
import { SKILLS, MONSTERS, MAPS, PLAYABLE_MAP_IDS, getSkill, type SkillId, type MapId } from "./content";
import { inputDiagnostics } from "./input";
import { hasWorldAppearance } from "./appearance";
import { appearanceStatus } from "./renderer";
import { ITEMS, getItem } from "./content";
import { testWear, testSpawn, testEquip, testClear, testBossPhase, testMeleeWall } from "./test-mode";
export function TestTools() {
  const [open, setOpen] = useState(true),
    [kind, setKind] = useState("orc"),
    [count, setCount] = useState(10);
  const [selected, setSelected] = useState<SkillId>(
      game.classInfo.startingSkill,
    ),
    [slot, setSlot] = useState(0);
  const [scenarioNotice,setScenarioNotice]=useState("");
  useEffect(()=>setScenarioNotice(""),[game.runId]);
  useEffect(() => {
    if (["upgrade", "replace", "shop", "won", "dead"].includes(game.phase)) {
      setOpen(false);
    }
  }, [game.phase]);
  if (game.mode !== "test" || game.phase === "lobby") return null;
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
          <p>
            {sounds.status} · 已播放 {sounds.played} 次
          </p>
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
                if (game.phase === "shop") game.nextWave();
                else if (game.phase === "battle") {
                  game.exp = 0;
                  game.waveTime = game.duration;
                  game.endWave();
                }
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
