import { describe, it, expect } from "vitest";
import { createNpcSheet, normalizeNpc, normalizeAnySheet, setNpcPath, newAction, averageDice, damageLabel, actionRolls, hpFormulaRoll, npcSections, skillEntries, NPC_SKILLS, xpForChallenge, saveTotal, saveEntries } from "./npc.js";
import { parseDice } from "./chat.js";
import { hpBarModel } from "./hp.js";
import { Kind, visibleLinkable, Visibility } from "./journal.js";

const attack = (over = {}) => ({ ...newAction(), name: "Scimitar", attack: true, toHit: 4, damage1: { dice: "1d6", type: "Slashing" }, ...over });

describe("createNpcSheet / normalizeNpc (CA16)", () => {
  it("starts with 10s, no actions and the npc marker", () => {
    const npc = createNpcSheet();
    expect(npc.npc).toBe(true);
    expect(npc.abilities.str).toBe(10);
    expect(npc.actions).toEqual([]);
  });
  it("fills missing fields of an old or partial sheet", () => {
    const npc = normalizeNpc({ npc: true, abilities: { dex: 15 }, actions: [{ name: "Bite" }] });
    expect(npc.abilities).toMatchObject({ dex: 15, str: 10 });
    expect(npc.actions[0]).toMatchObject({ name: "Bite", attack: false, damage1: { dice: "", type: "" } });
  });
  it("survives garbage", () => expect(normalizeNpc(null).actions).toEqual([]));
  it("normalizeAnySheet picks the npc normalizer only for npc sheets", () => {
    expect(normalizeAnySheet({ npc: true }).actions).toEqual([]);
    expect(normalizeAnySheet({}).attacks).toEqual([]);
  });
});

describe("setNpcPath / hp bar (CA14)", () => {
  it("setting the max hp also fills current hp (nothing to adjust by hand)", () => {
    const npc = setNpcPath(createNpcSheet(), "combat.hpMax", 15);
    expect(npc.combat).toMatchObject({ hpMax: 15, hpCurrent: 15 });
  });
  it("other paths are untouched", () => expect(setNpcPath(createNpcSheet(), "type", "Fey").combat.hpCurrent).toBe(0));
  it("the token bar reads the npc combat block", () =>
    expect(hpBarModel(setNpcPath(createNpcSheet(), "combat.hpMax", 15).combat)).toMatchObject({ label: "15/15" }));
});

describe("averageDice (CA9)", () => {
  it.each([["1d6", 3], ["1d6+2", 5], ["2d6+5", 12], ["1d8-1", 3]])("%s -> %i", (expr, avg) => expect(averageDice(expr)).toBe(avg));
  it("null for invalid or empty", () => {
    expect(averageDice("")).toBeNull();
    expect(averageDice("abc")).toBeNull();
  });
});

describe("damageLabel (CA9)", () => {
  it("average, dice and type", () => expect(damageLabel({ dice: "1d6+2", type: "Piercing" })).toBe("5 (1d6+2) Piercing"));
  it("empty without dice", () => expect(damageLabel({ dice: "", type: "x" })).toBe(""));
});

describe("actionRolls (CA10)", () => {
  it("attack action: d20 bonus plus every damage line with dice", () => {
    const rolls = actionRolls(attack({ damage2: { dice: "2d4", type: "Fire" } }));
    expect(rolls.modifier).toBe(4);
    expect(rolls.damage).toEqual([{ expression: "1d6", type: "Slashing" }, { expression: "2d4", type: "Fire" }]);
  });
  it("non-attack has no d20", () => expect(actionRolls(attack({ attack: false })).modifier).toBeUndefined());
  it("drops invalid dice instead of failing the whole roll", () => {
    const rolls = actionRolls(attack({ damage1: { dice: "oops", type: "" } }));
    expect(rolls.damage).toEqual([]);
  });
  it("every expression it returns is rollable", () => {
    for (const line of actionRolls(attack()).damage) expect(parseDice(line.expression).ok).toBe(true);
  });
});

describe("hpFormulaRoll (CA12)", () => {
  it("rolls the formula as a healing-style line", () => expect(hpFormulaRoll("3d6", "Goblin")).toMatchObject({ damage: [{ expression: "3d6" }] }));
  it("null when empty or invalid", () => {
    expect(hpFormulaRoll("", "x")).toBeNull();
    expect(hpFormulaRoll("zzz", "x")).toBeNull();
  });
});

describe("npcSections (CA6)", () => {
  const sections = (over) => npcSections({ ...createNpcSheet(), ...over });
  it("actions and bonus action by default", () => expect(sections({ hasBonusAction: true })).toEqual(["actions", "bonusActions"]));
  it("hides bonus action", () => expect(sections({ hasBonusAction: false })).toEqual(["actions"]));
  it("reactions, legendary and mythic follow their flags", () =>
    expect(sections({ hasBonusAction: false, hasReactions: true, legendaryActions: 3, hasMythic: true })).toEqual(["actions", "reactions", "legendary", "mythic"]));
});

describe("skillEntries (CA4)", () => {
  it("lists only skills different from zero", () => {
    const npc = { ...createNpcSheet(), skills: { ...createNpcSheet().skills, stealth: 6 } };
    expect(skillEntries(npc)).toEqual([["stealth", 6]]);
  });
  it("covers the 18 skills", () => expect(NPC_SKILLS).toHaveLength(18));
});

describe("journal integration (CA1, CA15)", () => {
  const items = [
    { id: "1", kind: Kind.NPC, visibility: Visibility.ALL, players: [], owner: "o" },
    { id: "2", kind: Kind.CHARACTER, visibility: Visibility.ALL, players: [], owner: "o" },
  ];
  it("npc and character are both linkable to a token", () => expect(visibleLinkable(items, { id: "p", role: "PLAYER" })).toHaveLength(2));
  it("there is no NOTE kind anymore", () => expect(Kind.NOTE).toBeUndefined());
});

describe("challenge -> xp", () => {
  it.each([["0", 10], ["1/8", 25], ["1/4", 50], ["1/2", 100], ["1", 200], ["5", 1800], ["30", 155000], [" 1/4 ", 50]])("CR %s -> %i XP", (cr, xp) => expect(xpForChallenge(cr)).toBe(xp));
  it("null for unknown values", () => {
    expect(xpForChallenge("")).toBeNull();
    expect(xpForChallenge("abc")).toBeNull();
    expect(xpForChallenge("31")).toBeNull();
  });
  it("typing the challenge fills the xp", () => expect(setNpcPath(createNpcSheet(), "challenge", "1/4").xp).toBe(50));
  it("an unknown challenge keeps the xp typed by hand", () => {
    const npc = setNpcPath(setNpcPath(createNpcSheet(), "xp", 77), "challenge", "???");
    expect(npc.xp).toBe(77);
  });
});

describe("saving throws (auto + bonus)", () => {
  const npc = (abilities, saves) => ({ ...createNpcSheet(), abilities: { ...createNpcSheet().abilities, ...abilities }, saves: { ...createNpcSheet().saves, ...saves } });
  it("is the ability modifier plus the typed bonus", () => {
    expect(saveTotal(npc({ dex: 15 }, { dex: 2 }), "dex")).toBe(4);
    expect(saveTotal(npc({ str: 8 }, {}), "str")).toBe(-1);
  });
  it("lists all six saves with their totals", () => {
    const entries = saveEntries(npc({ dex: 15, con: 14 }, { dex: 2 }));
    expect(entries).toHaveLength(6);
    expect(entries).toContainEqual(["dex", 4]);
    expect(entries).toContainEqual(["con", 2]);
    expect(entries).toContainEqual(["str", 0]);
  });
});
