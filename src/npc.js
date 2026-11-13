import { Ability, SKILLS, withDefaults, setPath, abilityModifier, normalizeSheet } from "./sheet.js";
import { parseDice } from "./chat.js";

export const NPC_SKILLS = Object.freeze(Object.keys(SKILLS));
export const ActionKind = Object.freeze({ MELEE: "melee", RANGED: "ranged" });
export const ACTION_LISTS = Object.freeze(["actions", "bonusActions", "reactions", "legendary"]);

const DEFAULT_SCORE = 10;
const abilityMap = (value) => Object.fromEntries(Object.values(Ability).map((a) => [a, value]));
const damageLine = () => ({ dice: "", type: "" });

export const newAction = () => ({
  name: "", attack: false, kind: ActionKind.MELEE, reach: "", toHit: 0, target: "",
  damage1: damageLine(), damage2: damageLine(), description: "",
});

export const createNpcSheet = () => ({
  npc: true,
  type: "",
  combat: { ac: 10, acType: "", speed: "30ft", hpMax: 0, hpCurrent: 0, hpTemp: 0, hpFormula: "" },
  abilities: abilityMap(DEFAULT_SCORE),
  saves: abilityMap(0),
  skills: Object.fromEntries(NPC_SKILLS.map((s) => [s, 0])),
  vulnerabilities: "", resistances: "", damageImmunities: "", conditionImmunities: "",
  senses: "", languages: "", challenge: "", xp: 0, proficiencyBonus: 0, tokenSize: 1,
  isCaster: false, hasBonusAction: false, hasReactions: false, legendaryActions: 0, hasMythic: false, mythicText: "",
  actions: [], bonusActions: [], reactions: [], legendary: [],
});

const normalizeAction = (action) => ({
  ...withDefaults(newAction(), action),
});

export function normalizeNpc(saved) {
  const base = withDefaults(createNpcSheet(), saved);
  const lists = Object.fromEntries(ACTION_LISTS.map((key) => [key, (Array.isArray(saved?.[key]) ? saved[key] : []).map(normalizeAction)]));
  return { ...base, ...lists, npc: true };
}

export const normalizeAnySheet = (saved) => (saved?.npc ? normalizeNpc(saved) : normalizeSheet(saved));

const XP_BY_CHALLENGE = Object.freeze({
  0: 10, "1/8": 25, "1/4": 50, "1/2": 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
  11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
  21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000,
});

export const xpForChallenge = (challenge) => XP_BY_CHALLENGE[String(challenge).trim()] ?? null;

// Typing the maximum also fills the current hit points, and typing the challenge fills the XP: nothing to adjust by hand.
export function setNpcPath(npc, path, value) {
  const next = setPath(npc, path, value);
  if (path === "combat.hpMax") return setPath(next, "combat.hpCurrent", value);
  const xp = path === "challenge" ? xpForChallenge(value) : null;
  return xp === null ? next : setPath(next, "xp", xp);
}

export const npcModifier = abilityModifier;

// Average the way stat blocks print it: dice average rounded down plus the flat part.
export function averageDice(expression) {
  const parsed = parseDice(expression ?? "");
  if (!parsed.ok) return null;
  const sum = parsed.terms.reduce((acc, t) => acc + t.sign * (t.kind === "flat" ? t.value : (t.count * (t.sides + 1)) / 2), 0);
  return Math.floor(sum);
}

export function damageLabel({ dice, type }) {
  const average = averageDice(dice);
  if (average === null) return "";
  return `${average} (${dice.trim()})${type ? ` ${type}` : ""}`;
}

const rollable = (line) => parseDice(line.dice ?? "").ok;

// What the chat rolls for an action: the d20 (attacks only) and every damage line that has valid dice.
export function actionRolls(action) {
  const damage = [action.damage1, action.damage2].filter(rollable).map((line) => ({ expression: line.dice.trim(), type: line.type }));
  return { ...(action.attack ? { modifier: Number(action.toHit) || 0 } : {}), damage };
}

export const hpFormulaRoll = (formula, label) => (parseDice(formula ?? "").ok ? { label, damage: [{ expression: formula.trim(), type: "HP" }] } : null);

export function npcSections(npc) {
  return [
    "actions",
    ...(npc.hasBonusAction ? ["bonusActions"] : []),
    ...(npc.hasReactions ? ["reactions"] : []),
    ...(npc.legendaryActions > 0 ? ["legendary"] : []),
    ...(npc.hasMythic ? ["mythic"] : []),
  ];
}

export const skillEntries = (npc) => Object.entries(npc.skills).filter(([, value]) => value !== 0);

// A save is the ability modifier plus the bonus typed on the sheet (proficiency and the like).
export const saveTotal = (npc, ability) => npcModifier(npc.abilities[ability]) + npc.saves[ability];

export const saveEntries = (npc) => Object.values(Ability).map((a) => [a, saveTotal(npc, a)]);
