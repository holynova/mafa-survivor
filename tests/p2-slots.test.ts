import { describe, expect, it } from "vitest";
import { Game, type Mode } from "../src/game";
import { type ClassId } from "../src/classes";
import { SKILLS, getSkill } from "../src/content";

function start(classId: ClassId, warriorFourSlot = false, seed = 176) {
  const g = new Game();
  g.start("normal", seed, classId, warriorFourSlot);
  return g;
}

function enemy(g: Game, dx = 100, dy = 0, hp = 1000) {
  g.spawnEnemy("orc");
  const e = g.enemies.at(-1)!;
  e.x = g.player.x + dx;
  e.y = g.player.y + dy;
  e.hp = e.maxHp = hp;
  return e;
}

function cast(g: Game) {
  g.cast(g.skills[0]);
}

describe("warrior 4/6 slot A/B (GDD §6)", () => {
  it("warrior default uses 6 skill slots", () => {
    const g = start("warrior", false);
    expect(g.maxSkills).toBe(6);
  });

  it("warrior four-slot mode limits to 4 skills", () => {
    const g = start("warrior", true);
    expect(g.maxSkills).toBe(4);
  });

  it("wizard and taoist always use 6 slots", () => {
    expect(start("wizard").maxSkills).toBe(6);
    expect(start("taoist").maxSkills).toBe(6);
  });

  it("four-slot warrior triggers replace at the 5th skill", () => {
    const g = start("warrior", true);
    // starter powerstrike already occupies 1 slot; add 3 more manually
    const ids: (typeof SKILLS)[number]["id"][] = [
      "thrust",
      "cleave",
      "firesword",
    ];
    for (const id of ids) {
      const s = g.newSkill(id);
      s.cd = 0;
      g.skills.push(s);
    }
    expect(g.skills).toHaveLength(4);
    expect(g.maxSkills).toBe(4);
    // learning a 5th skill must pause for replacement, never create a 5th slot
    const ice = g.newSkill("ice");
    g.choices = [
      {
        id: "learn-ice",
        kind: "skill",
        skill: "ice",
        name: "冰咆哮",
        description: "",
        value: 0,
      },
    ];
    g.phase = "upgrade";
    g.choose("learn-ice");
    expect(g.phase).toBe("replace");
    expect(g.skills).toHaveLength(4);
    expect(g.pendingSkill).toBe("ice");
    g.replaceSkill(null);
    expect(g.skills).toHaveLength(4);
    expect(g.pendingSkill).toBeNull();
    expect(g.phase).toBe("battle");
  });

  it("six-slot warrior accepts a 6th skill without replace", () => {
    const g = start("warrior", false);
    const ids: (typeof SKILLS)[number]["id"][] = [
      "thrust",
      "cleave",
      "dash",
      "firesword",
      "swordsmanship",
    ];
    for (const id of ids) {
      const s = g.newSkill(id);
      s.cd = 0;
      g.skills.push(s);
    }
    expect(g.skills).toHaveLength(6);
    expect(g.maxSkills).toBe(6);
    // a 7th skill triggers replace
    const ice = g.newSkill("ice");
    g.choices = [
      {
        id: "learn-ice",
        kind: "skill",
        skill: "ice",
        name: "冰咆哮",
        description: "",
        value: 0,
      },
    ];
    g.phase = "upgrade";
    g.choose("learn-ice");
    expect(g.phase).toBe("replace");
    expect(g.skills).toHaveLength(6);
  });
});

describe("three classes same-table experience (GDD §6.3 / P3-11)", () => {
  const classes: ClassId[] = ["wizard", "warrior", "taoist"];
  const modes: Mode[] = ["normal", "trial"];

  function advanceThreeWaves(g: Game) {
    for (let w = 0; w < 3; w++) {
      g.waveTime = g.duration;
      g.endWave();
      if (g.phase === "upgrade") {
        g.choose(g.choices[0].id);
      }
      if (g.phase === "shop") {
        g.nextWave();
      }
      expect(g.phase).toBe("battle");
    }
  }

  it.each(classes)(
    "%s completes the first three waves deterministically without crash",
    (classId) => {
      for (const mode of modes) {
        const g = start(classId, false, 176);
        advanceThreeWaves(g);
        expect(g.wave).toBe(4);
        expect(g.phase).toBe("battle");
      }
    },
  );

  it.each(classes)(
    "%s can learn its starting skill branches through Lv3",
    (classId) => {
      const g = start(classId, false, 176);
      const skill = g.skills[0];
      const def = getSkill(skill.id);
      // rank up twice to Lv3
      for (const branch of def.branches.slice(0, 2)) {
        g.choices = [
          {
            id: `${skill.id}-${branch.field}`,
            kind: "skill",
            skill: skill.id,
            name: def.name,
            description: "",
            field: branch.field,
            value: branch.value,
          },
        ];
        g.phase = "upgrade";
        g.choose(g.choices[0].id);
        expect(g.phase).toBe("battle");
      }
      expect(skill.rank).toBe(3);
    },
  );
});
