import { newSpell, normalizeSheet, Ability, SpellAttack, SpellOutput } from "./sheet.js";
import { toPlain } from "./plain.js";

export const DEFAULT_BASE_URL = "https://cdn.jsdelivr.net/gh/5etools-mirror-3/5etools-src@main/data/";
const STORAGE_KEY = "owldnd.codex.spells";

// Every word the converter writes into a spell comes from here, so a translation is a different dictionary, not new logic.
export const EN_TERMS = Object.freeze({
  schools: { A: "Abjuration", C: "Conjuration", D: "Divination", E: "Enchantment", V: "Evocation", I: "Illusion", N: "Necromancy", T: "Transmutation" },
  units: {
    action: ["action", "actions"], bonus: ["bonus action", "bonus actions"], reaction: ["reaction", "reactions"],
    round: ["round", "rounds"], minute: ["minute", "minutes"], hour: ["hour", "hours"], day: ["day", "days"],
  },
  feet: ["feet", "feet"], miles: ["mile", "miles"],
  halfDamage: "Half damage", damageTypes: {},
  instant: "Instantaneous", special: "Special", self: "Self", touch: "Touch", sight: "Sight", unlimited: "Unlimited", untilDispelled: "Until dispelled", upTo: "Up to",
});

const withTerms = (terms) => ({ ...EN_TERMS, ...terms, schools: { ...EN_TERMS.schools, ...terms?.schools }, units: { ...EN_TERMS.units, ...terms?.units } });
const quantity = (amount, [one, many]) => `${amount} ${amount === 1 ? one : many}`;

const SCALING_TAGS = new Set(["scaledamage", "scaledice"]);
const TAG = /\{@(\w+)(?: ([^{}]*))?\}/g;

// {@spell fireball|phb} -> "fireball": a tag keeps only its first field (scaling tags show their increment).
// Innermost tags go first, so nested ones ({@note ... {@filter ...}}) resolve from the inside out.
function stripTags(text) {
  let previous;
  let result = text;
  do {
    previous = result;
    result = result.replace(TAG, (_, tag, body = "") => {
      const fields = body.split("|");
      return SCALING_TAGS.has(tag) ? fields[3] ?? fields[2] ?? fields[0] : fields[0];
    });
  } while (result !== previous);
  return result;
}

function flatten(node) {
  if (typeof node === "string") return stripTags(node);
  if (node?.type === "list") return node.items.map((item) => `• ${flatten(item)}`).join("\n");
  if (node?.type === "table") return (node.rows ?? []).map((row) => row.map(flatten).join(" | ")).join("\n");
  if (node?.entries) return [node.name && `${node.name}.`, ...node.entries.map(flatten)].filter(Boolean).join("\n");
  if (node?.entry) return `${node.name ? `${node.name}. ` : ""}${flatten(node.entry)}`;
  return "";
}
const flattenAll = (nodes = []) => nodes.map(flatten).filter(Boolean).join("\n");

const castingTime = ({ number, unit, condition }, T) => {
  const base = quantity(number, T.units[unit] ?? [unit, unit]);
  return condition ? `${base}, ${stripTags(condition)}` : base;
};

function range({ type, distance }, T) {
  if (type === "special") return T.special;
  const unit = distance?.type;
  const amount = distance?.amount;
  const text = amount ? quantity(amount, T[unit] ?? [unit, unit]) : T[unit] ?? unit ?? "";
  return type === "point" ? text : `${T.self} (${text} ${type})`;
}

function duration({ type, duration: length, upTo }, T) {
  if (type === "instant") return T.instant;
  if (type === "permanent") return T.untilDispelled;
  if (type !== "timed") return T.special;
  const text = quantity(length.amount, T.units[length.type] ?? [length.type, length.type]);
  return upTo ? `${T.upTo} ${text}` : text;
}

const ABILITY_BY_NAME = { strength: Ability.STR, dexterity: Ability.DEX, constitution: Ability.CON, intelligence: Ability.INT, wisdom: Ability.WIS, charisma: Ability.CHA };
const ATTACK_BY_CODE = { M: SpellAttack.MELEE, R: SpellAttack.RANGED };
const DICE = /^\d+d\d+(\s*[+-]\s*\d+)?$/;
const MAX_DAMAGE_LINES = 2;
const CANTRIP_DAMAGE_LINES = 1;
const HEALING_TAG = "HL";
const HALF_DAMAGE = /half as much damage|half damage/i;

// The fields of every {@tag a|b|c} in the raw text, as arrays: [["a","b","c"], ...].
const tagFields = (text, tag) => [...text.matchAll(new RegExp(`\\{@${tag} ([^{}]*)\\}`, "g"))].map((match) => match[1].split("|"));
const diceOf = (text, tag) => [...new Set(tagFields(text, tag).map(([dice]) => dice.trim()).filter((dice) => DICE.test(dice)))];

function combat(raw, description, T) {
  const text = JSON.stringify(raw.entries ?? []);
  const attackType = ATTACK_BY_CODE[raw.spellAttack?.[0]] ?? SpellAttack.NONE;
  const types = raw.damageInflict ?? [];
  const [damage1, damage2] = diceOf(text, "damage").slice(0, raw.level === 0 ? CANTRIP_DAMAGE_LINES : MAX_DAMAGE_LINES).map((dice, index) => ({ dice, type: T.damageTypes[types[index]] ?? types[index] ?? "" }));
  const healing = raw.miscTags?.includes(HEALING_TAG) ? diceOf(text, "dice")[0] ?? "" : "";
  const savingThrow = raw.savingThrow?.[0];
  const isAttack = attackType !== SpellAttack.NONE || Boolean(damage1) || Boolean(healing);
  return {
    output: isAttack ? SpellOutput.ATTACK : SpellOutput.SHEET,
    attackType,
    damage1: damage1 ?? { dice: "", type: "" },
    damage2: damage2 ?? { dice: "", type: "" },
    healing,
    damagePerLevel: tagFields(JSON.stringify([raw.entries, raw.entriesHigherLevel]), "scaledamage")[0]?.[2] ?? "",
    hasSave: Boolean(savingThrow),
    save: { ability: ABILITY_BY_NAME[savingThrow] ?? "", effect: savingThrow && HALF_DAMAGE.test(description) ? T.halfDamage : "" },
  };
}

const materials = (m) => (typeof m === "string" ? m : m?.text ?? "");

export function convertSpell(raw, terms) {
  const T = withTerms(terms);
  const [firstDuration = { type: "instant" }] = raw.duration ?? [];
  const components = raw.components ?? {};
  const description = flattenAll(raw.entries);
  const spell = {
    ...newSpell(),
    name: raw.name,
    school: T.schools[raw.school] ?? raw.school ?? "",
    ritual: Boolean(raw.meta?.ritual),
    castingTime: raw.time?.[0] ? castingTime(raw.time[0], T) : "",
    range: raw.range ? range(raw.range, T) : "",
    v: Boolean(components.v), s: Boolean(components.s), m: Boolean(components.m),
    materials: materials(components.m),
    concentration: Boolean(firstDuration.concentration),
    duration: duration(firstDuration, T),
    description,
    ...combat(raw, description, T),
    higherLevels: flattenAll((raw.entriesHigherLevel ?? []).flatMap((block) => block.entries ?? [block])),
  };
  return { level: raw.level, spell };
}

function normalizeBase(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid URL");
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

async function getJson(url, fetcher) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Download failed: ${url}`);
  return response.json();
}

const getIndex = (base, fetcher) => getJson(`${base}spells/index.json`, fetcher);

export async function fetchSources(baseUrl, fetcher = (url) => fetch(url)) {
  return Object.keys(await getIndex(normalizeBase(baseUrl), fetcher));
}

export async function fetchSpells(baseUrl, sources, terms, fetcher = (url) => fetch(url)) {
  const base = normalizeBase(baseUrl);
  const index = await getIndex(base, fetcher);
  const perSource = await Promise.all(sources.map(async (source) => {
    if (!index[source]) throw new Error(`Unknown source: ${source}`);
    const { spell } = await getJson(`${base}spells/${index[source]}`, fetcher);
    if (!Array.isArray(spell)) throw new Error(`No spells in ${source}`);
    return spell.map((raw) => ({ source, ...convertSpell(raw, terms) }));
  }));
  return perSource.flat();
}

export const mergeSource = (list, source, incoming) => [...list.filter((entry) => entry.source !== source), ...incoming];

export function loadSpells(storage = localStorage) {
  try {
    const list = JSON.parse(storage.getItem(STORAGE_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// ponytail: localStorage (~5 MB); move to IndexedDB if the imported books outgrow it
export const saveSpells = (list, storage = localStorage) => storage.setItem(STORAGE_KEY, JSON.stringify(list));

const fold = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const filterSpells = (list, query, level) => {
  const needle = fold(query.trim());
  return list.filter((entry) => (level === null || entry.level === level) && fold(entry.spell.name).includes(needle));
};

// Copies the spell into the character's list for that level (cantrips for 0); the same name in that list is not added twice.
export function addSpellToSheet(sheet, level, spell) {
  const base = normalizeSheet(sheet);
  const list = level === 0 ? base.spells.cantrips : base.spells.levels[level].list;
  if (list.some((existing) => existing.name === spell.name)) return { sheet: base, added: false };
  const next = [...list, toPlain(spell)];
  const spells = level === 0
    ? { ...base.spells, cantrips: next }
    : { ...base.spells, levels: { ...base.spells.levels, [level]: { ...base.spells.levels[level], list: next } } };
  return { sheet: { ...base, spells }, added: true };
}
