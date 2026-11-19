import { describe, it, expect, vi } from "vitest";
import { convertSpell, fetchSources, fetchSpells, mergeSource, loadSpells, saveSpells, filterSpells, addSpellToSheet, DEFAULT_BASE_URL } from "./codex.js";
import { newSpell, createSheet } from "./sheet.js";

const fireball = {
  name: "Fireball", source: "PHB", level: 3, school: "V", savingThrow: ["dexterity"], damageInflict: ["fire"],
  time: [{ number: 1, unit: "action" }],
  range: { type: "point", distance: { type: "feet", amount: 150 } },
  components: { v: true, s: true, m: "a tiny ball of bat guano and sulfur" },
  duration: [{ type: "instant" }],
  entries: ["A bright streak flashes. Each creature takes {@damage 8d6} fire damage; see {@spell fireball|phb}.", "A target takes half as much damage on a successful save.", { type: "list", items: ["one", "two"] }],
  entriesHigherLevel: [{ type: "entries", name: "At Higher Levels", entries: ["The damage increases by {@scaledamage 8d6|3-9|1d6}."] }],
};

describe("convertSpell: save, attack, damage and healing", () => {
  const entries = (...text) => ({ entries: text });
  const base = { name: "X", level: 1, school: "V", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "instant" }] };

  it("CA16 a saving-throw spell marks the save with its ability and the half-damage effect", () => {
    expect(convertSpell(fireball).spell).toMatchObject({ hasSave: true, save: { ability: "dex", effect: "Half damage" } });
  });

  it("CA16 a save without half damage leaves the effect empty; no save leaves it off", () => {
    const hold = { ...base, savingThrow: ["wisdom"], ...entries("The target is paralyzed.") };
    expect(convertSpell(hold).spell).toMatchObject({ hasSave: true, save: { ability: "wis", effect: "" } });
    expect(convertSpell({ ...base, ...entries("Nothing.") }).spell).toMatchObject({ hasSave: false, save: { ability: "", effect: "" } });
  });

  it("CA17 a damage spell becomes an attack-output spell with its dice and type", () => {
    expect(convertSpell(fireball).spell).toMatchObject({ output: "attack", attackType: "", damage1: { dice: "8d6", type: "fire" }, damage2: { dice: "", type: "" } });
  });

  it("CA17 spellAttack sets ranged/melee", () => {
    const ray = { ...base, spellAttack: ["R"], damageInflict: ["cold"], ...entries("Make a ranged spell attack. Takes {@damage 1d8} cold damage.") };
    expect(convertSpell(ray).spell).toMatchObject({ output: "attack", attackType: "ranged", damage1: { dice: "1d8", type: "cold" } });
    expect(convertSpell({ ...ray, spellAttack: ["M"] }).spell.attackType).toBe("melee");
  });

  it("CA17 two damage lines map to the two damage types in order", () => {
    const storm = { ...base, damageInflict: ["bludgeoning", "cold"], ...entries("{@damage 2d8} bludgeoning and {@damage 4d6} cold.") };
    expect(convertSpell(storm).spell).toMatchObject({ damage1: { dice: "2d8", type: "bludgeoning" }, damage2: { dice: "4d6", type: "cold" } });
  });

  it("CA17 a cantrip keeps one damage line (the other dice are its level-5 scaling)", () => {
    const bolt = { ...base, level: 0, spellAttack: ["R"], damageInflict: ["fire"], ...entries("{@damage 1d10} fire damage. It becomes {@damage 2d10} at 5th level.") };
    expect(convertSpell(bolt).spell).toMatchObject({ damage1: { dice: "1d10", type: "fire" }, damage2: { dice: "", type: "" } });
  });

  it("CA17 the per-level increase fills damagePerLevel", () => {
    expect(convertSpell(fireball).spell.damagePerLevel).toBe("1d6");
  });

  it("CA18 a healing spell fills healing and is attack-output", () => {
    const cure = { ...base, miscTags: ["HL"], ...entries("regains hit points equal to {@dice 1d8} + your modifier.") };
    expect(convertSpell(cure).spell).toMatchObject({ output: "attack", healing: "1d8" });
  });

  it("CA19 a utility spell stays a sheet-output spell", () => {
    expect(convertSpell({ ...base, ...entries("You see in the dark.") }).spell).toMatchObject({ output: "sheet", attackType: "", hasSave: false, healing: "", damage1: { dice: "", type: "" } });
  });

  it("CA12 terms translate the half-damage effect and the damage types", () => {
    const terms = { halfDamage: "Metade do dano", damageTypes: { fire: "fogo" } };
    expect(convertSpell(fireball, terms).spell).toMatchObject({ save: { effect: "Metade do dano" }, damage1: { type: "fogo" } });
  });
});

describe("convertSpell", () => {
  it("CA1 maps the basic fields onto a full Spell", () => {
    const { level, spell } = convertSpell(fireball);
    expect(level).toBe(3);
    expect(Object.keys(spell)).toEqual(expect.arrayContaining(Object.keys(newSpell())));
    expect(spell).toMatchObject({ name: "Fireball", school: "Evocation", castingTime: "1 action", range: "150 feet", duration: "Instantaneous" });
  });

  it("CA2 maps components, with a string material", () => {
    expect(convertSpell(fireball).spell).toMatchObject({ v: true, s: true, m: true, materials: "a tiny ball of bat guano and sulfur" });
  });

  it("CA2 maps an object material and a spell without material", () => {
    const withCost = { ...fireball, components: { v: true, m: { text: "a diamond", cost: 30000 } } };
    expect(convertSpell(withCost).spell).toMatchObject({ s: false, m: true, materials: "a diamond" });
    expect(convertSpell({ ...fireball, components: { v: true } }).spell).toMatchObject({ m: false, materials: "" });
  });

  it("CA3 concentration sets the flag and keeps the duration clean", () => {
    const bless = { ...fireball, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }] };
    expect(convertSpell(bless).spell).toMatchObject({ concentration: true, duration: "1 minute" });
  });

  it("CA3 plural duration and ritual", () => {
    const spell = convertSpell({ ...fireball, meta: { ritual: true }, duration: [{ type: "timed", duration: { type: "hour", amount: 8 } }] }).spell;
    expect(spell).toMatchObject({ ritual: true, concentration: false, duration: "8 hours" });
  });

  it("CA4 flattens text, lists and tags into plain text", () => {
    const { description, higherLevels } = convertSpell(fireball).spell;
    expect(description).toContain("8d6 fire damage; see fireball.");
    expect(description).toContain("one");
    expect(description).toContain("two");
    expect(description).not.toContain("{@");
    expect(higherLevels).toBe("The damage increases by 1d6.");
  });

  it("CA4 resolves nested tags", () => {
    const nested = { ...fireball, entries: ["Extra {@note choices {@filter animal form|bestiary|x=y} may apply}."] };
    expect(convertSpell(nested).spell.description).toBe("Extra choices animal form may apply.");
  });

  it("CA5 level 0 is a cantrip, special range and self/touch", () => {
    const { level, spell } = convertSpell({ ...fireball, level: 0, range: { type: "point", distance: { type: "touch" } } });
    expect(level).toBe(0);
    expect(spell.range).toBe("Touch");
    expect(convertSpell({ ...fireball, range: { type: "special" } }).spell.range).toBe("Special");
    expect(convertSpell({ ...fireball, range: { type: "cone", distance: { type: "feet", amount: 15 } } }).spell.range).toBe("Self (15 feet cone)");
  });

  it("CA12 a custom terms dictionary changes the output without touching the converter", () => {
    const terms = { schools: { V: "Evocação" }, instant: "Instantânea", feet: ["pé", "pés"], units: { action: ["ação", "ações"] } };
    expect(convertSpell(fireball, terms).spell).toMatchObject({ school: "Evocação", duration: "Instantânea", range: "150 pés", castingTime: "1 ação" });
  });
});

const jsonResponse = (body, ok = true) => ({ ok, json: async () => body });
const fakeFetch = (routes) => vi.fn(async (url) => (url in routes ? jsonResponse(routes[url]) : jsonResponse({}, false)));

describe("fetchSources / fetchSpells", () => {
  const base = "https://example.com/data/";

  it("CA6 lists the sources of spells/index.json", async () => {
    const fetcher = fakeFetch({ [`${base}spells/index.json`]: { PHB: "spells-phb.json", XGE: "spells-xge.json" } });
    expect(await fetchSources(base, fetcher)).toEqual(["PHB", "XGE"]);
  });

  it("CA6 rejects a non-http(s) URL before any request", async () => {
    const fetcher = vi.fn();
    await expect(fetchSources("javascript:alert(1)", fetcher)).rejects.toThrow();
    await expect(fetchSources("not a url", fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("CA6 adds the trailing slash when missing", async () => {
    const fetcher = fakeFetch({ [`${base}spells/index.json`]: { PHB: "spells-phb.json" } });
    expect(await fetchSources("https://example.com/data", fetcher)).toEqual(["PHB"]);
  });

  it("CA7 downloads only the chosen sources, one request each", async () => {
    const fetcher = fakeFetch({
      [`${base}spells/index.json`]: { PHB: "spells-phb.json", XGE: "spells-xge.json" },
      [`${base}spells/spells-phb.json`]: { spell: [fireball] },
    });
    const spells = await fetchSpells(base, ["PHB"], undefined, fetcher);
    expect(spells).toEqual([{ level: 3, source: "PHB", spell: convertSpell(fireball).spell }]);
    expect(fetcher).not.toHaveBeenCalledWith(`${base}spells/spells-xge.json`);
  });

  it("CA7 any failing source aborts with an error", async () => {
    const fetcher = fakeFetch({ [`${base}spells/index.json`]: { PHB: "spells-phb.json" } });
    await expect(fetchSpells(base, ["PHB"], undefined, fetcher)).rejects.toThrow();
  });

  it("rejects a response without spell[]", async () => {
    const fetcher = fakeFetch({ [`${base}spells/index.json`]: { PHB: "spells-phb.json" }, [`${base}spells/spells-phb.json`]: { nope: 1 } });
    await expect(fetchSpells(base, ["PHB"], undefined, fetcher)).rejects.toThrow();
  });

  it("uses the jsDelivr CDN as the default base", () => {
    expect(DEFAULT_BASE_URL).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/.+\/data\/$/);
  });
});

describe("storage and search", () => {
  const entry = (source, name, level = 1) => ({ source, level, spell: { ...newSpell(), name } });
  const memory = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) };
  };

  it("CA9 reimporting a source replaces it instead of duplicating", () => {
    const merged = mergeSource([entry("PHB", "Old"), entry("XGE", "Keep")], "PHB", [entry("PHB", "New")]);
    expect(merged.map((e) => e.spell.name)).toEqual(["Keep", "New"]);
  });

  it("CA9 round-trips through storage; empty or corrupt storage gives []", () => {
    const storage = memory();
    expect(loadSpells(storage)).toEqual([]);
    saveSpells([entry("PHB", "A")], storage);
    expect(loadSpells(storage)).toEqual([entry("PHB", "A")]);
    storage.setItem("owldnd.codex.spells", "{broken");
    expect(loadSpells(storage)).toEqual([]);
  });

  it("CA10 filters by name (case/accents-insensitive) and by level", () => {
    const list = [entry("PHB", "Fireball", 3), entry("PHB", "Bola de Fogo", 3), entry("PHB", "Shield", 1)];
    expect(filterSpells(list, "fire", null).map((e) => e.spell.name)).toEqual(["Fireball"]);
    expect(filterSpells(list, "", 1).map((e) => e.spell.name)).toEqual(["Shield"]);
    expect(filterSpells(list, "", null)).toHaveLength(3);
    expect(filterSpells(list, "bola de fógo", 3)).toHaveLength(1);
  });
});

describe("addSpellToSheet", () => {
  const spell = { ...newSpell(), name: "Fireball" };

  it("CA13 adds a level 1-9 spell to that level's list, leaving the rest alone", () => {
    const sheet = createSheet();
    const { sheet: next, added } = addSpellToSheet(sheet, 3, spell);
    expect(added).toBe(true);
    expect(next.spells.levels[3].list.map((s) => s.name)).toEqual(["Fireball"]);
    expect(next.spells.levels[2].list).toEqual([]);
    expect(sheet.spells.levels[3].list).toEqual([]);
  });

  it("CA13 level 0 goes to the cantrips", () => {
    expect(addSpellToSheet(createSheet(), 0, { ...spell, name: "Light" }).sheet.spells.cantrips.map((s) => s.name)).toEqual(["Light"]);
  });

  it("CA14 a spell with the same name in that list is not added twice", () => {
    const once = addSpellToSheet(createSheet(), 3, spell).sheet;
    const twice = addSpellToSheet(once, 3, spell);
    expect(twice.added).toBe(false);
    expect(twice.sheet.spells.levels[3].list).toHaveLength(1);
  });

  it("CA13 accepts a reactive (Proxy) spell, as the UI passes it", () => {
    const { sheet } = addSpellToSheet(createSheet(), 3, new Proxy(spell, {}));
    expect(sheet.spells.levels[3].list[0]).toEqual(spell);
  });

  it("CA15 an old sheet without spells gets the defaults before adding", () => {
    const { sheet } = addSpellToSheet({ name: "legacy" }, 1, spell);
    expect(sheet.spells.levels[1].list).toHaveLength(1);
    expect(sheet.spells.levels[9].list).toEqual([]);
  });
});
