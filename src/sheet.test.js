import { describe, it, expect } from "vitest";
import { parseDice } from "./chat.js";
import { hitDiceExpression, damageExpression, deathSaveBonus, DEATH_SAVE, newItemEffect, ALL_SAVES, EffectTarget, abilityScoreModified, abilityScore, EffectMode, Ability, SKILLS, createSheet, abilityModifier, proficiencyBonus, savingThrow, skillBonus, passivePerception, initiative } from "./sheet.js";

describe("abilityModifier (CA-F1)", () => {
  it.each([[1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [20, 5], [30, 10]])("score %i -> %i", (score, mod) =>
    expect(abilityModifier(score)).toBe(mod));
});

describe("proficiencyBonus (CA-F2)", () => {
  it.each([[1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [13, 5], [17, 6], [20, 6]])("level %i -> +%i", (lvl, pb) =>
    expect(proficiencyBonus(lvl)).toBe(pb));
  it("clamps below 1 and above 20", () => {
    expect(proficiencyBonus(0)).toBe(2);
    expect(proficiencyBonus(99)).toBe(6);
  });
});

describe("createSheet (CA-F7)", () => {
  it("starts at level 1, scores 10, no proficiencies", () => {
    const s = createSheet();
    expect(s.level).toBe(1);
    expect(Object.values(s.abilities)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(Object.values(s.saveProf).some(Boolean)).toBe(false);
    expect(Object.values(s.skillProf).some(Boolean)).toBe(false);
  });
});

describe("savingThrow (CA-F3)", () => {
  it("adds proficiency only when proficient", () => {
    const s = { ...createSheet(), level: 5, abilities: { ...createSheet().abilities, str: 16 }, saveProf: { ...createSheet().saveProf, str: true } };
    expect(savingThrow(s, Ability.STR)).toBe(3 + 3);
    expect(savingThrow(s, Ability.DEX)).toBe(0);
  });
});

describe("skills (CA-F4)", () => {
  it("has the 18 official skills", () => expect(Object.keys(SKILLS)).toHaveLength(18));
  it("uses the linked ability", () => {
    expect(SKILLS.athletics).toBe(Ability.STR);
    expect(SKILLS.stealth).toBe(Ability.DEX);
    expect(SKILLS.perception).toBe(Ability.WIS);
    expect(SKILLS.arcana).toBe(Ability.INT);
    expect(SKILLS.persuasion).toBe(Ability.CHA);
  });
  it("adds ability mod and proficiency when proficient", () => {
    const base = createSheet();
    const s = { ...base, abilities: { ...base.abilities, dex: 14 }, skillProf: { ...base.skillProf, stealth: true } };
    expect(skillBonus(s, "stealth")).toBe(2 + 2);
    expect(skillBonus(s, "acrobatics")).toBe(2);
  });
});

describe("derived stats", () => {
  it("passive perception = 10 + perception bonus (CA-F5)", () => {
    const base = createSheet();
    const s = { ...base, abilities: { ...base.abilities, wis: 14 }, skillProf: { ...base.skillProf, perception: true } };
    expect(passivePerception(s)).toBe(10 + 2 + 2);
  });
  it("initiative = dex mod (CA-F6)", () => {
    const base = createSheet();
    expect(initiative({ ...base, abilities: { ...base.abilities, dex: 8 } })).toBe(-1);
  });
});

import { EquipmentKind, ArmorType, newEquipment, automaticArmorClass, hitDiceTotal, hitDiceTypes, HIT_DICE, AcMode, newClass, characterLevel, armorClass, ASK_ABILITY, ToolProficiency, newTool, toolBonus, toolBonusText, SPELL_ABILITY, newAttack, signed, modifierFor, attackBonus, attackBonusText, damageText, attackDamageText, saveDc, normalizeSheet, newResource, newFeature, setPath, totalWeight, Encumbrance, encumbrance, featureIndexes, withDefaults } from "./sheet.js";

describe("page 1 fields (CA-F7)", () => {
  it("new sheet has every page 1 section with defaults", () => {
    const s = createSheet();
    expect(s.info).toEqual({ class: "", background: "", race: "", alignment: "", xp: 0 });
    expect(s.inspiration).toBe(false);
    expect(s.combat).toEqual({ ac: 10, speed: 30, hpMax: 0, hpCurrent: 0, hpTemp: 0, acMode: "manual", acCustom: { base: 10, first: "", second: "" } });
    expect(s.extraClasses).toEqual([]);
    expect(Object.values(s.expertise).some(Boolean)).toBe(false);
    expect(s.jackOfAllTrades).toBe(false);
    expect(s.hitDice).toEqual({ current: 1, die: "d8" });
    expect(s.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(s.currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
    expect(s.text).toEqual({ traits: "", ideals: "", bonds: "", flaws: "" });
    expect(s.spellcasting).toEqual({ ability: "" });
    expect(s.locks).toEqual({ header: false, traits: false, ideals: false, bonds: false, flaws: false });
    for (const list of ["attacks", "equipment", "tools", "proficiencies", "resources", "features"]) expect(s[list]).toEqual([]);
  });
});

describe("totalWeight", () => {
  it("sums quantity times weight", () =>
    expect(totalWeight([{ qty: 2, weight: 5 }, { qty: 1, weight: 0.5 }, { qty: 10, weight: 0.1 }])).toBe(11.5));
  it("is zero for an empty list", () => expect(totalWeight([])).toBe(0));
  it("ignores blank numbers", () => expect(totalWeight([{ qty: "", weight: 3 }, { qty: 2, weight: undefined }])).toBe(0));
});

describe("encumbrance", () => {
  it.each([[45, 9, Encumbrance.NONE], [46, 9, Encumbrance.ENCUMBERED], [90, 9, Encumbrance.ENCUMBERED], [117.5, 9, Encumbrance.HEAVILY]])(
    "weight %f with STR %i -> %s", (weight, str, expected) => expect(encumbrance(weight, str)).toBe(expected));
});

describe("featureIndexes (filter)", () => {
  const features = [{ name: "Darkvision", source: "Racial: Half-Elf" }, { name: "Channel Divinity", source: "Class: Cleric" }];
  it("returns every index for an empty query", () => expect(featureIndexes(features, "  ")).toEqual([0, 1]));
  it("matches name case-insensitively", () => expect(featureIndexes(features, "dark")).toEqual([0]));
  it("matches source", () => expect(featureIndexes(features, "CLERIC")).toEqual([1]));
});

describe("withDefaults", () => {
  it("fills missing fields from the defaults", () => expect(withDefaults({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 9 } })).toEqual({ a: 1, b: { c: 9, d: 3 } }));
  it("keeps saved arrays and primitives of the same type", () => expect(withDefaults({ list: [], n: 0 }, { list: [1], n: 5 })).toEqual({ list: [1], n: 5 }));
  it("falls back to the default when the saved type differs", () => expect(withDefaults({ hitDice: { total: 1 } }, { hitDice: "" })).toEqual({ hitDice: { total: 1 } }));
  it("handles a missing saved value", () => expect(withDefaults({ a: 1 }, undefined)).toEqual({ a: 1 }));
});

describe("setPath", () => {
  it("sets a nested value without mutating the original", () => {
    const s = createSheet();
    const next = setPath(s, "combat.ac", 15);
    expect(next.combat.ac).toBe(15);
    expect(s.combat.ac).toBe(10);
  });
  it("works for array indexes", () => {
    const s = { ...createSheet(), attacks: [{ name: "a", bonus: "", damage: "" }] };
    expect(setPath(s, "attacks.0.name", "Sword").attacks[0].name).toBe("Sword");
  });
  it("rejects prototype pollution paths", () => {
    expect(() => setPath(createSheet(), "__proto__.x", 1)).toThrow();
    expect(() => setPath(createSheet(), "constructor.prototype.x", 1)).toThrow();
  });
});

describe("new list entries start unlocked", () => {
  it("resources and features carry a locked flag", () => {
    expect(newResource().locked).toBe(false);
    expect(newFeature().locked).toBe(false);
  });
});

const withScores = (scores, extra = {}) => {
  const base = createSheet();
  return { ...base, ...extra, abilities: { ...base.abilities, ...scores } };
};
const attackWith = (over = {}) => {
  const a = newAttack();
  return { ...a, ...over, attack: { ...a.attack, ...(over.attack ?? {}) }, damage: { ...a.damage, ...(over.damage ?? {}) }, damage2: { ...a.damage2, ...(over.damage2 ?? {}) } };
};

describe("signed", () => {
  it.each([[3, "+3"], [0, "+0"], [-1, "-1"]])("%i -> %s", (n, text) => expect(signed(n)).toBe(text));
});

describe("modifierFor (any ability or spell)", () => {
  it("uses the ability modifier", () => expect(modifierFor(withScores({ str: 16 }), "str")).toBe(3));
  it("resolves SPELL to the spellcasting ability", () =>
    expect(modifierFor(withScores({ wis: 16 }, { spellcasting: { ability: "wis" } }), SPELL_ABILITY)).toBe(3));
  it("is 0 when the spellcasting ability is not set", () => expect(modifierFor(withScores({ wis: 16 }), SPELL_ABILITY)).toBe(0));
  it("is 0 for no ability", () => expect(modifierFor(withScores({ str: 16 }), "")).toBe(0));
});

describe("attackBonus", () => {
  it("is null (shown as -) when the attack roll is off", () => {
    expect(attackBonus(withScores({}), attackWith())).toBeNull();
    expect(attackBonusText(withScores({}), attackWith())).toBe("-");
  });
  it("adds ability mod and proficiency", () =>
    expect(attackBonusText(withScores({ str: 16 }), attackWith({ attack: { enabled: true, ability: "str", proficient: true } }))).toBe("+5"));
  it("omits proficiency when not proficient", () =>
    expect(attackBonus(withScores({ str: 16 }), attackWith({ attack: { enabled: true, ability: "str" } }))).toBe(3));
  it("adds the extra bonus and the magic bonus", () =>
    expect(attackBonus(withScores({}), attackWith({ magicBonus: 1, attack: { enabled: true, ability: "str", bonus: 2 } }))).toBe(3));
  it("works with the spellcasting ability", () =>
    expect(attackBonus(withScores({ wis: 16 }, { spellcasting: { ability: "wis" } }), attackWith({ attack: { enabled: true, ability: SPELL_ABILITY, proficient: true } }))).toBe(5));
});

describe("damageText", () => {
  const sheet = withScores({ str: 16 });
  it("is empty when the damage line is off", () => expect(damageText(sheet, attackWith().damage)).toBe(""));
  it("adds the ability modifier and shows the type", () =>
    expect(damageText(sheet, attackWith({ damage: { enabled: true, dice: "1d8", ability: "str", type: "Slashing" } }).damage)).toBe("1d8+3 Slashing"));
  it("shows negative modifiers", () =>
    expect(damageText(withScores({ str: 8 }), attackWith({ damage: { enabled: true, dice: "1d6", ability: "str", type: "Piercing" } }).damage)).toBe("1d6-1 Piercing"));
  it("omits the modifier when it is zero", () =>
    expect(damageText(sheet, attackWith({ damage: { enabled: true, dice: "3d6", type: "Fire" } }).damage)).toBe("3d6 Fire"));
  it("adds flat bonus and magic bonus", () =>
    expect(damageText(sheet, attackWith({ damage: { enabled: true, dice: "1d8", bonus: 2, type: "Fire" } }).damage, 1)).toBe("1d8+3 Fire"));
});

describe("attackDamageText", () => {
  it("joins damage and damage 2; magic bonus only on the first", () => {
    const a = attackWith({ magicBonus: 1, damage: { enabled: true, dice: "1d8", type: "Slashing" }, damage2: { enabled: true, dice: "1d6", type: "Fire" } });
    expect(attackDamageText(withScores({}), a)).toBe("1d8+1 Slashing + 1d6 Fire");
  });
});

describe("saveDc", () => {
  it("is 8 + proficiency + ability modifier", () => expect(saveDc(withScores({ wis: 16 }, { spellcasting: { ability: "wis" } }), SPELL_ABILITY)).toBe(13));
  it("accepts any ability", () => expect(saveDc(withScores({ int: 14 }), "int")).toBe(12));
});

describe("normalizeSheet", () => {
  it("fills new attack fields and drops the old text fields", () => {
    const sheet = normalizeSheet({ ...createSheet(), attacks: [{ name: "Sword", bonus: "+5", damage: "1d8" }] });
    expect(sheet.attacks[0].name).toBe("Sword");
    expect(sheet.attacks[0].damage).toEqual(newAttack().damage);
    expect(sheet.attacks[0].bonus).toBeUndefined();
  });
  it("returns a full default sheet for missing data", () => expect(normalizeSheet(undefined)).toEqual(createSheet()));
});

describe("toolBonus", () => {
  const sheet = withScores({ dex: 14 }, { level: 5 });
  const tool = (over) => ({ ...newTool(), ...over });
  it("a new tool is proficient and asks for the attribute", () => {
    expect(newTool().proficiency).toBe(ToolProficiency.PROFICIENT);
    expect(newTool().ability).toBe(ASK_ABILITY);
  });
  it("is unknown (?) while the attribute is 'ask'", () => {
    expect(toolBonus(sheet, tool())).toBeNull();
    expect(toolBonusText(sheet, tool())).toBe("?");
  });
  it.each([
    [ToolProficiency.NONE, 2],
    [ToolProficiency.HALF, 3],
    [ToolProficiency.PROFICIENT, 5],
    [ToolProficiency.EXPERTISE, 8],
  ])("%s -> %i (dex +2, proficiency +3)", (proficiency, expected) =>
    expect(toolBonus(sheet, tool({ ability: "dex", proficiency }))).toBe(expected));
  it("adds the mods", () => expect(toolBonusText(sheet, tool({ ability: "dex", mods: 1 }))).toBe("+6"));
});

describe("normalizeSheet tools", () => {
  it("migrates the old proficient flag", () => {
    const sheet = normalizeSheet({ ...createSheet(), tools: [{ name: "A", proficient: false, ability: "str" }, { name: "B", proficient: true, ability: "dex" }] });
    expect(sheet.tools.map((t) => t.proficiency)).toEqual([ToolProficiency.NONE, ToolProficiency.PROFICIENT]);
    expect(sheet.tools[1].ability).toBe("dex");
    expect(sheet.tools[0].mods).toBe(0);
  });
  it("keeps the new format untouched", () =>
    expect(normalizeSheet({ ...createSheet(), tools: [{ name: "C", proficiency: "expertise", ability: "ask", mods: 2 }] }).tools[0].proficiency).toBe("expertise"));
});

describe("multiclass (characterLevel)", () => {
  it("is the main level without extra classes", () => expect(characterLevel(withScores({}, { level: 3 }))).toBe(3));
  it("sums the levels of every class", () =>
    expect(characterLevel(withScores({}, { level: 3, extraClasses: [{ ...newClass(), level: 2 }, { ...newClass(), level: 4 }] }))).toBe(9));
  it("drives the proficiency bonus (level 9 -> +4)", () =>
    expect(savingThrow(withScores({ str: 10 }, { level: 5, extraClasses: [{ ...newClass(), level: 4 }], saveProf: { ...createSheet().saveProf, str: true } }), "str")).toBe(4));
  it("a new class entry starts at level 1 with a d8", () => expect(newClass()).toEqual({ name: "", level: 1, die: "d8" }));
});

describe("expertise", () => {
  const sheet = (extra = {}) => withScores({ dex: 14 }, { level: 5, ...extra });
  it("doubles the proficiency bonus for the chosen skill", () =>
    expect(skillBonus(sheet({ skillProf: { ...createSheet().skillProf, stealth: true }, expertise: { ...createSheet().expertise, stealth: true } }), "stealth")).toBe(2 + 6));
  it("counts as proficient even if the proficiency box is off", () =>
    expect(skillBonus(sheet({ expertise: { ...createSheet().expertise, stealth: true } }), "stealth")).toBe(8));
  it("does not affect other skills", () =>
    expect(skillBonus(sheet({ expertise: { ...createSheet().expertise, stealth: true } }), "acrobatics")).toBe(2));
});

describe("Jack of All Trades", () => {
  const jack = (extra = {}) => withScores({ dex: 14 }, { level: 5, jackOfAllTrades: true, ...extra });
  it("adds half the proficiency bonus (rounded down) to skills without proficiency", () => expect(skillBonus(jack(), "acrobatics")).toBe(2 + 1));
  it("does not change proficient skills", () =>
    expect(skillBonus(jack({ skillProf: { ...createSheet().skillProf, acrobatics: true } }), "acrobatics")).toBe(5));
  it("applies to initiative", () => expect(initiative(jack())).toBe(3));
  it("is off by default", () => expect(initiative(withScores({ dex: 14 }, { level: 5 }))).toBe(2));
  it("applies to tools without proficiency", () =>
    expect(toolBonus(jack(), { ...newTool(), ability: "dex", proficiency: ToolProficiency.NONE })).toBe(3));
  it("does not apply to proficient tools", () =>
    expect(toolBonus(jack(), { ...newTool(), ability: "dex", proficiency: ToolProficiency.PROFICIENT })).toBe(5));
  it("feeds the passive perception", () => expect(passivePerception(jack({ abilities: { ...createSheet().abilities, wis: 10 } }))).toBe(11));
});

describe("hit dice list", () => it("goes from d4 to d12", () => expect(HIT_DICE).toEqual(["d4", "d6", "d8", "d10", "d12"])));

describe("armorClass", () => {
  const sheet = (combat) => withScores({ dex: 14, con: 16 }, { combat: { ...createSheet().combat, ...combat } });
  it("manual returns the typed value", () => expect(armorClass(sheet({ acMode: AcMode.MANUAL, ac: 17 }))).toBe(17));
  it("automatic is 10 + Dexterity modifier", () => expect(armorClass(sheet({ acMode: AcMode.AUTO, ac: 99 }))).toBe(12));
  it("custom is 10 + two chosen abilities", () =>
    expect(armorClass(sheet({ acMode: AcMode.CUSTOM, acCustom: { base: 10, first: "dex", second: "con" } }))).toBe(15));
  it("custom with none selected is 10", () =>
    expect(armorClass(sheet({ acMode: AcMode.CUSTOM, acCustom: { base: 10, first: "", second: "" } }))).toBe(10));
  it("custom uses any number as the base", () => {
    expect(armorClass(sheet({ acMode: AcMode.CUSTOM, acCustom: { base: 13, first: "dex", second: "" } }))).toBe(15);
    expect(armorClass(sheet({ acMode: AcMode.CUSTOM, acCustom: { base: -2, first: "", second: "" } }))).toBe(-2);
  });
  it("custom with a single ability", () =>
    expect(armorClass(sheet({ acMode: AcMode.CUSTOM, acCustom: { base: 10, first: "con", second: "" } }))).toBe(13));
});

describe("normalizeSheet with the new options", () => {
  it("fills the new fields on a sheet saved before them", () => {
    const old = createSheet();
    delete old.extraClasses; delete old.expertise; delete old.jackOfAllTrades;
    old.combat = { ac: 15, speed: 30, hpMax: 1, hpCurrent: 1, hpTemp: 0 };
    const sheet = normalizeSheet(old);
    expect(sheet.extraClasses).toEqual([]);
    expect(sheet.jackOfAllTrades).toBe(false);
    expect(sheet.combat.acMode).toBe("manual");
    expect(sheet.combat.ac).toBe(15);
  });
  it("gives a sheet with the old custom AC (no base) the default base 10", () => {
    const old = createSheet();
    old.combat.acCustom = { first: "dex", second: "" };
    expect(normalizeSheet(old).combat.acCustom.base).toBe(10);
  });
});

describe("hitDiceTypes (multiclass)", () => {
  const sheet = (die, extras) => withScores({}, { hitDice: { current: 1, die }, extraClasses: extras.map((d) => ({ ...newClass(), die: d })) });
  it("is just the main die without extra classes", () => expect(hitDiceTypes(sheet("d10", []))).toEqual(["d10"]));
  it("lists the main die first, then each extra class die", () => expect(hitDiceTypes(sheet("d8", ["d10", "d6"]))).toEqual(["d8", "d10", "d6"]));
  it("does not repeat a die type", () => expect(hitDiceTypes(sheet("d8", ["d8", "d10"]))).toEqual(["d8", "d10"]));
});

describe("normalizeSheet extra class die", () => {
  it("gives an extra class saved without a die the default d8", () =>
    expect(normalizeSheet({ ...createSheet(), extraClasses: [{ name: "Cleric", level: 2 }] }).extraClasses[0]).toEqual({ name: "Cleric", level: 2, die: "d8" }));
  it("keeps a chosen die", () =>
    expect(normalizeSheet({ ...createSheet(), extraClasses: [{ name: "Cleric", level: 2, die: "d12" }] }).extraClasses[0].die).toBe("d12"));
});

describe("hitDiceTotal", () => {
  it("is the character level", () => expect(hitDiceTotal(withScores({}, { level: 4 }))).toBe(4));
  it("is the total level across every class", () =>
    expect(hitDiceTotal(withScores({}, { level: 3, extraClasses: [{ ...newClass(), level: 2 }] }))).toBe(5));
  it("is no longer stored on the sheet", () => expect(createSheet().hitDice.total).toBeUndefined());
});

describe("equipment kinds", () => {
  it("a new item is a plain item with no armor data", () =>
    expect(newEquipment()).toEqual({ name: "", qty: 1, weight: 0, equipped: false, kind: EquipmentKind.ITEM, armorType: ArmorType.LIGHT, ac: 0, acBonus: 0, description: "", effects: [] }));
});

describe("automaticArmorClass", () => {
  const gear = (over) => ({ ...newEquipment(), equipped: true, ...over });
  const withGear = (items, dex = 14) => withScores({ dex }, { equipment: items });
  const armor = (ac, armorType, over = {}) => gear({ kind: EquipmentKind.ARMOR, ac, armorType, ...over });
  const shield = (ac = 2, over = {}) => gear({ kind: EquipmentKind.SHIELD, ac, ...over });

  it("is 10 + Dex without armor", () => expect(automaticArmorClass(withGear([]))).toBe(12));
  it("light armor adds the full Dex modifier", () => expect(automaticArmorClass(withGear([armor(11, ArmorType.LIGHT)], 14))).toBe(13));
  it("medium armor caps the Dex modifier at +2", () => expect(automaticArmorClass(withGear([armor(14, ArmorType.MEDIUM)], 18))).toBe(16));
  it("medium armor still applies a negative Dex modifier", () => expect(automaticArmorClass(withGear([armor(14, ArmorType.MEDIUM)], 8))).toBe(13));
  it("heavy armor ignores Dex, positive or negative", () => {
    expect(automaticArmorClass(withGear([armor(16, ArmorType.HEAVY)], 18))).toBe(16);
    expect(automaticArmorClass(withGear([armor(16, ArmorType.HEAVY)], 6))).toBe(16);
  });
  it("wearing armor replaces the unarmored value, even when that was higher", () =>
    expect(automaticArmorClass(withGear([armor(11, ArmorType.HEAVY)], 18))).toBe(11));
  it("adds the armor magic bonus", () => expect(automaticArmorClass(withGear([armor(16, ArmorType.HEAVY, { acBonus: 1 })]))).toBe(17));
  it("ignores armor that is not equipped", () => expect(automaticArmorClass(withGear([armor(16, ArmorType.HEAVY, { equipped: false })]))).toBe(12));
  it("uses the best of several equipped armors", () =>
    expect(automaticArmorClass(withGear([armor(11, ArmorType.LIGHT), armor(16, ArmorType.HEAVY)]))).toBe(16));
  it("adds an equipped shield, with its magic bonus", () => {
    expect(automaticArmorClass(withGear([armor(16, ArmorType.HEAVY), shield()]))).toBe(18);
    expect(automaticArmorClass(withGear([shield(2, { acBonus: 1 })]))).toBe(15);
  });
  it("ignores a shield that is not equipped", () => expect(automaticArmorClass(withGear([shield(2, { equipped: false })]))).toBe(12));
  it("counts only the best shield", () => expect(automaticArmorClass(withGear([shield(2), shield(3)]))).toBe(15));
  it("ignores weapons and plain items even if they carry an ac value", () =>
    expect(automaticArmorClass(withGear([gear({ kind: EquipmentKind.WEAPON, ac: 9 }), gear({ ac: 9 })]))).toBe(12));
  it("is what the Automatic mode returns", () =>
    expect(armorClass(withScores({ dex: 14 }, { equipment: [armor(16, ArmorType.HEAVY)], combat: { ...createSheet().combat, acMode: AcMode.AUTO } }))).toBe(16));
  it("manual mode ignores equipment", () =>
    expect(armorClass(withScores({ dex: 14 }, { equipment: [armor(16, ArmorType.HEAVY)], combat: { ...createSheet().combat, acMode: AcMode.MANUAL, ac: 11 } }))).toBe(11));
});

describe("normalizeSheet equipment", () => {
  it("keeps the description of a magic item", () =>
    expect(normalizeSheet({ ...createSheet(), equipment: [{ ...newEquipment(), name: "Cloak", description: "+1 to saving throws" }] }).equipment[0].description).toBe("+1 to saving throws"));
  it("fills the armor fields on items saved before them", () => {
    const sheet = normalizeSheet({ ...createSheet(), equipment: [{ name: "Rope", qty: 1, weight: 10, equipped: true }] });
    expect(sheet.equipment[0]).toEqual({ name: "Rope", qty: 1, weight: 10, equipped: true, kind: "item", armorType: "light", ac: 0, acBonus: 0, description: "", effects: [] });
  });
});

describe("Magic Item attribute effects", () => {
  const magic = (effects, over = {}) => ({ ...newEquipment(), kind: EquipmentKind.MAGIC, equipped: true, effects, ...over });
  const effect = (ability, mode, value) => ({ target: EffectTarget.ABILITY, ability, mode, value });
  const saveEffect = (ability, value) => ({ target: EffectTarget.SAVE, ability, mode: EffectMode.ADD, value });
  const acEffect = (value) => ({ target: EffectTarget.AC, ability: "", mode: EffectMode.ADD, value });
  const sheetWith = (items, scores = {}) => withScores(scores, { equipment: items });

  it("Magic Item is a kind, and a new effect sets Strength to 19", () => {
    expect(EquipmentKind.MAGIC).toBe("magic");
    expect(newItemEffect()).toEqual({ target: EffectTarget.ABILITY, ability: "str", mode: EffectMode.SET, value: 19 });
  });
  it("a new saving throw effect is +1 to every save, and a new AC effect is +1 AC", () => {
    expect(newItemEffect(EffectTarget.SAVE)).toEqual({ target: EffectTarget.SAVE, ability: ALL_SAVES, mode: EffectMode.ADD, value: 1 });
    expect(newItemEffect(EffectTarget.AC)).toEqual({ target: EffectTarget.AC, ability: "", mode: EffectMode.ADD, value: 1 });
  });
  it("saving throw and AC effects do not change the ability score", () =>
    expect(abilityScore(sheetWith([magic([saveEffect("con", 3), acEffect(2)])], { con: 12 }), "con")).toBe(12));

  describe("saving throw bonus", () => {
    it("adds to the chosen ability's save", () =>
      expect(savingThrow(sheetWith([magic([saveEffect("wis", 2)])], { wis: 10 }), "wis")).toBe(2));
    it("does not touch other saves", () =>
      expect(savingThrow(sheetWith([magic([saveEffect("wis", 2)])], { dex: 10 }), "dex")).toBe(0));
    it("'all' applies to every save", () => {
      const sheet = sheetWith([magic([saveEffect(ALL_SAVES, 1)])], {});
      expect(savingThrow(sheet, "str")).toBe(1);
      expect(savingThrow(sheet, "cha")).toBe(1);
    });
    it("stacks across effects and items, and keeps the proficiency bonus", () => {
      const sheet = sheetWith([magic([saveEffect("con", 1)]), magic([saveEffect(ALL_SAVES, 1)])], { con: 14 });
      sheet.saveProf = { ...sheet.saveProf, con: true };
      expect(savingThrow(sheet, "con")).toBe(2 + 2 + 1 + 1);
    });
    it("ignores items that are not equipped", () =>
      expect(savingThrow(sheetWith([magic([saveEffect(ALL_SAVES, 1)], { equipped: false })], {}), "str")).toBe(0));
    it("is not counted as an ability effect", () =>
      expect(savingThrow(sheetWith([magic([effect("str", EffectMode.SET, 18)])], { str: 10 }), "str")).toBe(4));
  });

  describe("death save bonus", () => {
    it("is 0 without effects", () => expect(deathSaveBonus(sheetWith([]))).toBe(0));
    it("takes a bonus aimed at death saves", () => expect(deathSaveBonus(sheetWith([magic([saveEffect(DEATH_SAVE, 2)])]))).toBe(2));
    it("'all saves' includes death saves", () => expect(deathSaveBonus(sheetWith([magic([saveEffect(ALL_SAVES, 1)])]))).toBe(1));
    it("stacks a specific and an 'all' bonus", () =>
      expect(deathSaveBonus(sheetWith([magic([saveEffect(ALL_SAVES, 1)]), magic([saveEffect(DEATH_SAVE, 2)])]))).toBe(3));
    it("a bonus for one ability's save does not count", () => expect(deathSaveBonus(sheetWith([magic([saveEffect("wis", 2)])]))).toBe(0));
    it("ignores items that are not equipped", () =>
      expect(deathSaveBonus(sheetWith([magic([saveEffect(DEATH_SAVE, 2)], { equipped: false })]))).toBe(0));
    it("is not counted as an ability effect", () => expect(deathSaveBonus(sheetWith([magic([effect("wis", EffectMode.ADD, 2)])]))).toBe(0));
    it("a death-save-only bonus does not change any ability's saving throw", () => {
      const sheet = sheetWith([magic([saveEffect(DEATH_SAVE, 2)])], {});
      for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) expect(savingThrow(sheet, ability)).toBe(0);
    });
  });

  describe("AC bonus", () => {
    const acSheet = (items, mode, extra = {}) => withScores({ dex: 14 }, { equipment: items, combat: { ...createSheet().combat, acMode: mode, ...extra } });
    it("adds to the Automatic AC", () => expect(armorClass(acSheet([magic([acEffect(1)])], AcMode.AUTO))).toBe(13));
    it("adds to the Custom AC", () =>
      expect(armorClass(acSheet([magic([acEffect(2)])], AcMode.CUSTOM, { acCustom: { base: 10, first: "dex", second: "" } }))).toBe(14));
    it("does not apply to the Manual AC, which is the final value you typed", () =>
      expect(armorClass(acSheet([magic([acEffect(2)])], AcMode.MANUAL, { ac: 15 }))).toBe(15));
    it("stacks across effects and items", () =>
      expect(armorClass(acSheet([magic([acEffect(1), acEffect(1)]), magic([acEffect(2)])], AcMode.AUTO))).toBe(16));
    it("ignores items that are not equipped", () =>
      expect(armorClass(acSheet([magic([acEffect(1)], { equipped: false })], AcMode.AUTO))).toBe(12));
    it("works on top of equipped armor", () =>
      expect(armorClass(acSheet([{ ...newEquipment(), equipped: true, kind: EquipmentKind.ARMOR, armorType: ArmorType.HEAVY, ac: 16 }, magic([acEffect(1)])], AcMode.AUTO))).toBe(17));
  });
  it("is the base score without effects", () => expect(abilityScore(sheetWith([]), "con")).toBe(10));
  it("'set to' raises the score when it is higher", () =>
    expect(abilityScore(sheetWith([magic([effect("con", EffectMode.SET, 18)])], { con: 12 }), "con")).toBe(18));
  it("'set to' does nothing when the base is already higher or equal", () => {
    expect(abilityScore(sheetWith([magic([effect("con", EffectMode.SET, 18)])], { con: 20 }), "con")).toBe(20);
    expect(abilityScore(sheetWith([magic([effect("con", EffectMode.SET, 18)])], { con: 18 }), "con")).toBe(18);
  });
  it("'add' adds to the score", () => expect(abilityScore(sheetWith([magic([effect("wis", EffectMode.ADD, 2)])], { wis: 14 }), "wis")).toBe(16));
  it("applies 'set to' first and 'add' on top", () =>
    expect(abilityScore(sheetWith([magic([effect("str", EffectMode.ADD, 1), effect("str", EffectMode.SET, 19)])], { str: 10 }), "str")).toBe(20));
  it("takes the highest 'set to' among several items", () =>
    expect(abilityScore(sheetWith([magic([effect("str", EffectMode.SET, 21)]), magic([effect("str", EffectMode.SET, 19)])], { str: 10 }), "str")).toBe(21));
  it("sums every 'add' across items", () =>
    expect(abilityScore(sheetWith([magic([effect("dex", EffectMode.ADD, 1)]), magic([effect("dex", EffectMode.ADD, 2)])], { dex: 10 }), "dex")).toBe(13));
  it("ignores items that are not equipped", () =>
    expect(abilityScore(sheetWith([magic([effect("con", EffectMode.SET, 18)], { equipped: false })], { con: 12 }), "con")).toBe(12));
  it("ignores effects on items that are not Magic Items", () =>
    expect(abilityScore(sheetWith([magic([effect("con", EffectMode.SET, 18)], { kind: EquipmentKind.ITEM })], { con: 12 }), "con")).toBe(12));
  it("leaves other abilities alone", () => expect(abilityScore(sheetWith([magic([effect("con", EffectMode.SET, 18)])], { str: 9 }), "str")).toBe(9));
  it("never goes above 30", () => expect(abilityScore(sheetWith([magic([effect("str", EffectMode.ADD, 8)])], { str: 25 }), "str")).toBe(30));
  it("tells whether an item is changing the score", () => {
    const sheet = sheetWith([magic([effect("con", EffectMode.SET, 18)])], { con: 12 });
    expect(abilityScoreModified(sheet, "con")).toBe(true);
    expect(abilityScoreModified(sheet, "str")).toBe(false);
  });

  describe("derived values use the effective score", () => {
    const belt = [magic([effect("str", EffectMode.SET, 21)])];
    it("modifier", () => expect(modifierFor(sheetWith(belt, { str: 10 }), "str")).toBe(5));
    it("saving throw", () => expect(savingThrow(sheetWith([magic([effect("con", EffectMode.SET, 18)])], { con: 10 }), "con")).toBe(4));
    it("skill", () => expect(skillBonus(sheetWith(belt, { str: 10 }), "athletics")).toBe(5));
    it("initiative", () => expect(initiative(sheetWith([magic([effect("dex", EffectMode.ADD, 4)])], { dex: 10 }))).toBe(2));
    it("automatic armor class", () =>
      expect(automaticArmorClass(sheetWith([magic([effect("dex", EffectMode.SET, 18)])], { dex: 10 }))).toBe(14));
  });
});

describe("normalizeSheet item effects", () => {
  const withEffects = (effects) => normalizeSheet({ ...createSheet(), equipment: [{ ...newEquipment(), kind: "magic", effects }] }).equipment[0].effects;
  it("gives an effect saved before targets existed the 'ability' target", () =>
    expect(withEffects([{ ability: "con", mode: "set", value: 18 }])).toEqual([{ target: "ability", ability: "con", mode: "set", value: 18 }]));
  it("keeps a saving throw and an AC effect untouched", () => {
    const saved = [{ target: "save", ability: "all", mode: "add", value: 1 }, { target: "ac", ability: "", mode: "add", value: 2 }];
    expect(withEffects(saved)).toEqual(saved);
  });
});

describe("damageExpression (what the chat rolls)", () => {
  const sheet = withScores({ str: 16 });
  const line = (over) => ({ ...newAttack().damage, enabled: true, ...over });
  it("is the dice plus the modifier, without the damage type", () =>
    expect(damageExpression(sheet, line({ dice: "1d8", ability: "str", type: "Slashing" }))).toBe("1d8+3"));
  it("omits a zero modifier", () => expect(damageExpression(sheet, line({ dice: "3d6", type: "Fire" }))).toBe("3d6"));
  it("shows a negative modifier", () => expect(damageExpression(withScores({ str: 8 }), line({ dice: "1d6", ability: "str" }))).toBe("1d6-1"));
  it("adds the flat bonus and the magic bonus", () => expect(damageExpression(sheet, line({ dice: "1d8", bonus: 2 }), 1)).toBe("1d8+3"));
  it("is empty when the line is off", () => expect(damageExpression(sheet, line({ dice: "1d8", enabled: false }))).toBe(""));
  it("is empty without dice, since there is nothing to roll", () => expect(damageExpression(sheet, line({ dice: "", ability: "str" }))).toBe(""));
});

describe("hitDiceExpression (what a hit die click rolls)", () => {
  it("is the die plus the Constitution modifier", () => expect(hitDiceExpression(withScores({ con: 14 }), "d8")).toBe("1d8+2"));
  it("shows a negative modifier", () => expect(hitDiceExpression(withScores({ con: 8 }), "d10")).toBe("1d10-1"));
  it("omits a zero modifier", () => expect(hitDiceExpression(withScores({ con: 10 }), "d6")).toBe("1d6"));
  it("uses the Constitution with item effects", () =>
    expect(hitDiceExpression(withScores({ con: 10 }, { equipment: [{ ...newEquipment(), kind: EquipmentKind.MAGIC, equipped: true, effects: [{ target: "ability", ability: "con", mode: "set", value: 18 }] }] }), "d8")).toBe("1d8+4"));
  it("always parses as a valid roll", () => expect(parseDice(hitDiceExpression(withScores({ con: 16 }), "d12")).ok).toBe(true));
});
