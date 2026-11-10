import { toPlain } from "./plain.js";

export const Ability = Object.freeze({ STR: "str", DEX: "dex", CON: "con", INT: "int", WIS: "wis", CHA: "cha" });

export const SKILLS = Object.freeze({
  acrobatics: Ability.DEX, animalHandling: Ability.WIS, arcana: Ability.INT, athletics: Ability.STR,
  deception: Ability.CHA, history: Ability.INT, insight: Ability.WIS, intimidation: Ability.CHA,
  investigation: Ability.INT, medicine: Ability.WIS, nature: Ability.INT, perception: Ability.WIS,
  performance: Ability.CHA, persuasion: Ability.CHA, religion: Ability.INT, sleightOfHand: Ability.DEX,
  stealth: Ability.DEX, survival: Ability.WIS,
});

export const HIT_DICE = Object.freeze(["d4", "d6", "d8", "d10", "d12"]);
export const AcMode = Object.freeze({ AUTO: "auto", MANUAL: "manual", CUSTOM: "custom" });
const AC_BASE = 10;
export const newClass = () => ({ name: "", level: 1, die: "d8" });

const MIN_LEVEL = 1;
const MAX_LEVEL = 20;
const DEFAULT_SCORE = 10;
const BASE_PASSIVE = 10;
const flags = (keys) => Object.fromEntries(keys.map((k) => [k, false]));

export const createSheet = () => ({
  level: MIN_LEVEL,
  abilities: Object.fromEntries(Object.values(Ability).map((a) => [a, DEFAULT_SCORE])),
  saveProf: flags(Object.values(Ability)),
  skillProf: flags(Object.keys(SKILLS)),
  expertise: flags(Object.keys(SKILLS)),
  jackOfAllTrades: false,
  extraClasses: [],
  info: { class: "", background: "", race: "", alignment: "", xp: 0 },
  inspiration: false,
  combat: { ac: 10, speed: 30, hpMax: 0, hpCurrent: 0, hpTemp: 0, acMode: AcMode.MANUAL, acCustom: { base: AC_BASE, first: NO_ABILITY, second: NO_ABILITY } },
  hitDice: { current: 1, die: "d8" },
  deathSaves: { successes: 0, failures: 0 },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  equipment: [],
  tools: [],
  proficiencies: [],
  resources: [],
  features: [],
  spellcasting: { ability: "" },
  text: { traits: "", ideals: "", bonds: "", flaws: "" },
  locks: { header: false, traits: false, ideals: false, bonds: false, flaws: false },
});

export const ProficiencyType = Object.freeze({ ARMOR: "armor", WEAPON: "weapon", TOOL: "tool", LANGUAGE: "language", OTHER: "other" });

export const SPELL_ABILITY = "spell";
const NO_ABILITY = "";
const DEFAULT_CRIT_RANGE = 20;

const newDamage = () => ({ enabled: false, dice: "", ability: NO_ABILITY, bonus: 0, type: "", crit: "" });
export const newAttack = () => ({
  name: "",
  range: "",
  description: "",
  attack: { enabled: false, ability: Ability.STR, bonus: 0, proficient: false },
  magicBonus: 0,
  critRange: DEFAULT_CRIT_RANGE,
  damage: newDamage(),
  damage2: newDamage(),
  save: { enabled: false, ability: Ability.STR, dc: SPELL_ABILITY },
  saveEffect: "",
});
export const EquipmentKind = Object.freeze({ ITEM: "item", WEAPON: "weapon", ARMOR: "armor", SHIELD: "shield", MAGIC: "magic" });
export const EffectMode = Object.freeze({ SET: "set", ADD: "add" });
export const EffectTarget = Object.freeze({ ABILITY: "ability", SAVE: "save", AC: "ac" });
export const ALL_SAVES = "all";
export const DEATH_SAVE = "death";
// ABILITY changes a score (set to / add); SAVE adds to saving throws (one ability or all); AC adds to armor class.
export function newItemEffect(target = EffectTarget.ABILITY) {
  if (target === EffectTarget.SAVE) return { target, ability: ALL_SAVES, mode: EffectMode.ADD, value: 1 };
  if (target === EffectTarget.AC) return { target, ability: "", mode: EffectMode.ADD, value: 1 };
  return { target, ability: Ability.STR, mode: EffectMode.SET, value: 19 };
}
export const ArmorType = Object.freeze({ LIGHT: "light", MEDIUM: "medium", HEAVY: "heavy" });
// For armor `ac` is the base AC; for a shield it is the AC bonus. `acBonus` is the magic bonus on top; `description` holds a magic item's effect; `effects` are the attribute effects of a Magic Item.
export const newEquipment = () => ({ name: "", qty: 1, weight: 0, equipped: false, kind: EquipmentKind.ITEM, armorType: ArmorType.LIGHT, ac: 0, acBonus: 0, description: "", effects: [] });
export const ASK_ABILITY = "ask";
export const ToolProficiency = Object.freeze({ NONE: "none", HALF: "half", PROFICIENT: "proficient", EXPERTISE: "expertise" });
const HALF_PROFICIENCY = 0.5;
const TOOL_PROFICIENCY_FACTOR = { none: 0, half: 0.5, proficient: 1, expertise: 2 };
export const newTool = () => ({ name: "", proficiency: ToolProficiency.PROFICIENT, ability: ASK_ABILITY, mods: 0 });
export const newProficiency = () => ({ type: ProficiencyType.LANGUAGE, name: "" });
export const newResource = () => ({ name: "", total: 1, current: 1, locked: false });
export const newFeature = () => ({ name: "", source: "", description: "", locked: false });

export const Encumbrance = Object.freeze({ NONE: "none", ENCUMBERED: "encumbered", HEAVILY: "heavily" });
const ENCUMBERED_PER_STR = 5;
const HEAVILY_PER_STR = 10;
const WEIGHT_PRECISION = 100;

export function totalWeight(equipment) {
  const sum = equipment.reduce((acc, item) => acc + (Number(item.qty) || 0) * (Number(item.weight) || 0), 0);
  return Math.round(sum * WEIGHT_PRECISION) / WEIGHT_PRECISION;
}

export function encumbrance(weight, strengthScore) {
  if (weight > strengthScore * HEAVILY_PER_STR) return Encumbrance.HEAVILY;
  if (weight > strengthScore * ENCUMBERED_PER_STR) return Encumbrance.ENCUMBERED;
  return Encumbrance.NONE;
}

export function featureIndexes(features, query) {
  const needle = query.trim().toLowerCase();
  return features.flatMap((f, index) => (`${f.name} ${f.source}`.toLowerCase().includes(needle) ? [index] : []));
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Saved sheets may predate new fields (or have another shape): keep what matches, default the rest.
export function withDefaults(defaults, saved) {
  if (!isPlainObject(saved)) return defaults;
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = saved[key];
      if (isPlainObject(fallback)) return [key, withDefaults(fallback, value)];
      const sameType = Array.isArray(fallback) ? Array.isArray(value) : typeof value === typeof fallback;
      return [key, sameType ? value : fallback];
    }),
  );
}

export const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

const MAX_ABILITY_SCORE = 30;

const itemEffects = (sheet, target) =>
  sheet.equipment
    .filter((item) => item.equipped && item.kind === EquipmentKind.MAGIC)
    .flatMap((item) => item.effects)
    .filter((effect) => effect.target === target);

const sumValues = (effects) => effects.reduce((sum, e) => sum + e.value, 0);

// Base score -> highest "set to" (only helps if higher) -> every "add" on top -> capped at 30.
export function abilityScore(sheet, ability) {
  const effects = itemEffects(sheet, EffectTarget.ABILITY).filter((e) => e.ability === ability);
  const setTo = effects.filter((e) => e.mode === EffectMode.SET).map((e) => e.value);
  const added = sumValues(effects.filter((e) => e.mode === EffectMode.ADD));
  return Math.min(Math.max(sheet.abilities[ability], ...setTo) + added, MAX_ABILITY_SCORE);
}

const saveBonusFromItems = (sheet, ability) =>
  sumValues(itemEffects(sheet, EffectTarget.SAVE).filter((e) => e.ability === ability || e.ability === ALL_SAVES));

// Death saves have no ability: only "death" and "all saves" effects reach them.
export const deathSaveBonus = (sheet) => saveBonusFromItems(sheet, DEATH_SAVE);

const acBonusFromItems = (sheet) => sumValues(itemEffects(sheet, EffectTarget.AC));

export const abilityScoreModified = (sheet, ability) => abilityScore(sheet, ability) !== sheet.abilities[ability];

// An ability reference is an Ability, SPELL_ABILITY (the sheet's spellcasting ability) or "" (none).
export function modifierFor(sheet, ref) {
  const ability = ref === SPELL_ABILITY ? sheet.spellcasting.ability : ref;
  return ability ? abilityModifier(abilityScore(sheet, ability)) : 0;
}

export function attackBonus(sheet, attack) {
  if (!attack.attack.enabled) return null;
  const proficiency = attack.attack.proficient ? proficiencyBonus(characterLevel(sheet)) : 0;
  return modifierFor(sheet, attack.attack.ability) + proficiency + attack.attack.bonus + attack.magicBonus;
}

export function attackBonusText(sheet, attack) {
  const bonus = attackBonus(sheet, attack);
  return bonus === null ? "-" : signed(bonus);
}

// A hit die spent on a rest: the die plus the Constitution modifier.
export function hitDiceExpression(sheet, die) {
  const flat = modifierFor(sheet, Ability.CON);
  return `1${die}${flat ? signed(flat) : ""}`;
}

const flatDamage = (sheet, damage, magicBonus) => modifierFor(sheet, damage.ability) + damage.bonus + magicBonus;

// What the chat rolls for a damage line: the dice plus the flat part (no damage type). Empty when there is nothing to roll.
export function damageExpression(sheet, damage, magicBonus = 0) {
  if (!damage.enabled || !damage.dice) return "";
  const flat = flatDamage(sheet, damage, magicBonus);
  return `${damage.dice}${flat ? signed(flat) : ""}`;
}

export function damageText(sheet, damage, magicBonus = 0) {
  if (!damage.enabled) return "";
  const amount = damage.dice ? damageExpression(sheet, damage, magicBonus) : String(flatDamage(sheet, damage, magicBonus));
  return damage.type ? `${amount} ${damage.type}` : amount;
}

// The magic bonus applies to the first damage line only.
export const attackDamageText = (sheet, attack) =>
  [damageText(sheet, attack.damage, attack.magicBonus), damageText(sheet, attack.damage2)].filter(Boolean).join(" + ");

// null while the attribute is "ask": the bonus depends on the check being made.
export function toolBonus(sheet, tool) {
  if (tool.ability === ASK_ABILITY) return null;
  const factor = tool.proficiency === ToolProficiency.NONE && sheet.jackOfAllTrades ? HALF_PROFICIENCY : TOOL_PROFICIENCY_FACTOR[tool.proficiency];
  const proficiency = Math.floor(proficiencyBonus(characterLevel(sheet)) * factor);
  return modifierFor(sheet, tool.ability) + proficiency + tool.mods;
}

export function toolBonusText(sheet, tool) {
  const bonus = toolBonus(sheet, tool);
  return bonus === null ? "?" : signed(bonus);
}

// Tools used to carry a boolean "proficient" flag.
const migrateTool = (tool) => ({
  ...withDefaults(newTool(), tool),
  proficiency: tool.proficiency ?? (tool.proficient === false ? ToolProficiency.NONE : ToolProficiency.PROFICIENT),
});

export const saveDc = (sheet, ref) => 8 + proficiencyBonus(characterLevel(sheet)) + modifierFor(sheet, ref);

export const normalizeSheet = (saved) => ({
  ...withDefaults(createSheet(), saved),
  attacks: (Array.isArray(saved?.attacks) ? saved.attacks : []).map((attack) => withDefaults(newAttack(), attack)),
  tools: (Array.isArray(saved?.tools) ? saved.tools : []).map(migrateTool),
  equipment: (Array.isArray(saved?.equipment) ? saved.equipment : []).map((entry) => {
    const item = withDefaults(newEquipment(), entry);
    return { ...item, effects: item.effects.map((effect) => withDefaults(newItemEffect(), effect)) };
  }),
  extraClasses: (Array.isArray(saved?.extraClasses) ? saved.extraClasses : []).map((entry) => withDefaults(newClass(), entry)),
});

const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];

export function setPath(sheet, path, value) {
  const keys = path.split(".");
  if (keys.some((k) => FORBIDDEN_KEYS.includes(k))) throw new Error(`Invalid sheet path: ${path}`);
  const next = toPlain(sheet);
  const parent = keys.slice(0, -1).reduce((node, key) => node[key], next);
  parent[keys.at(-1)] = value;
  return next;
}

export const abilityModifier = (score) => Math.floor((score - 10) / 2);

export const proficiencyBonus = (level) => 2 + Math.floor((Math.min(Math.max(level, MIN_LEVEL), MAX_LEVEL) - 1) / 4);

// Total level across every class (multiclass): it drives the proficiency bonus.
export const characterLevel = (sheet) => sheet.level + (sheet.extraClasses ?? []).reduce((sum, c) => sum + (Number(c.level) || 0), 0);

// One hit die per character level, across every class.
export const hitDiceTotal = (sheet) => characterLevel(sheet);

// Distinct hit die types across all classes, main class first.
export const hitDiceTypes = (sheet) => [...new Set([sheet.hitDice.die, ...sheet.extraClasses.map((c) => c.die)].filter(Boolean))];

export const savingThrow = (sheet, ability) =>
  abilityModifier(abilityScore(sheet, ability)) + (sheet.saveProf[ability] ? proficiencyBonus(characterLevel(sheet)) : 0) + saveBonusFromItems(sheet, ability);

const jackOfAllTradesBonus = (sheet) => (sheet.jackOfAllTrades ? Math.floor(proficiencyBonus(characterLevel(sheet)) * HALF_PROFICIENCY) : 0);

// Expertise doubles the bonus and implies proficiency; Jack of All Trades only helps when there is none.
function skillProficiency(sheet, skill) {
  const bonus = proficiencyBonus(characterLevel(sheet));
  if (sheet.expertise[skill]) return bonus * 2;
  return sheet.skillProf[skill] ? bonus : jackOfAllTradesBonus(sheet);
}

export const skillBonus = (sheet, skill) => abilityModifier(abilityScore(sheet, SKILLS[skill])) + skillProficiency(sheet, skill);

export const passivePerception = (sheet) => BASE_PASSIVE + skillBonus(sheet, "perception");

export const initiative = (sheet) => modifierFor(sheet, Ability.DEX) + jackOfAllTradesBonus(sheet);

const MEDIUM_ARMOR_DEX_CAP = 2;

// Heavy armor ignores Dex (even a negative one); medium caps it at +2; light takes all of it.
const dexForArmor = (armorType, dex) => {
  if (armorType === ArmorType.HEAVY) return 0;
  return armorType === ArmorType.MEDIUM ? Math.min(dex, MEDIUM_ARMOR_DEX_CAP) : dex;
};

const equippedOf = (sheet, kind) => sheet.equipment.filter((item) => item.equipped && item.kind === kind);

// Unarmored is 10 + Dex; the best equipped armor replaces that base, and the best equipped shield adds on top.
export function automaticArmorClass(sheet) {
  const dex = modifierFor(sheet, Ability.DEX);
  const armors = equippedOf(sheet, EquipmentKind.ARMOR).map((a) => a.ac + a.acBonus + dexForArmor(a.armorType, dex));
  const shields = equippedOf(sheet, EquipmentKind.SHIELD).map((s) => s.ac + s.acBonus);
  const body = armors.length ? Math.max(...armors) : AC_BASE + dex;
  return body + Math.max(0, ...shields);
}

// Item AC bonuses apply to Automatic and Custom; Manual is the final value you typed.
export function armorClass(sheet) {
  const { acMode, ac, acCustom } = sheet.combat;
  if (acMode === AcMode.AUTO) return automaticArmorClass(sheet) + acBonusFromItems(sheet);
  if (acMode === AcMode.CUSTOM) return acCustom.base + modifierFor(sheet, acCustom.first) + modifierFor(sheet, acCustom.second) + acBonusFromItems(sheet);
  return ac;
}
