// Pure chat and dice rules (no Owlbear imports, so they can be tested in Node).

// The chat used to be stored in the room metadata (one key per message). That metadata has a 16 kB limit shared with the
// journal and the sheets, so it now lives in each browser's localStorage and travels between players by broadcast.
export const CHAT_PREFIX = "owldnd/chat/";

const MAX_DICE_TOTAL = 100;
const MAX_SIDES = 1000;
const MIN_SIDES = 2;
const MAX_FLAT_DIGITS = 5;
const MAX_TEXT_LENGTH = 500;
const MAX_FEATURE_DESCRIPTION = 2000;
const MAX_FEATURE_TITLE = 100;
const DICE_TERM = /^(\d*)d(\d+)$/i;
const FLAT_TERM = new RegExp(`^\\d{1,${MAX_FLAT_DIGITS}}$`);

const invalid = { ok: false };

function parseTerm(token, sign) {
  const dice = DICE_TERM.exec(token);
  if (dice) {
    const count = dice[1] === "" ? 1 : Number(dice[1]);
    const sides = Number(dice[2]);
    return count >= 1 && sides >= MIN_SIDES && sides <= MAX_SIDES ? { kind: "dice", sign, count, sides } : null;
  }
  return FLAT_TERM.test(token) ? { kind: "flat", sign, value: Number(token) } : null;
}

// "2d6+1d4-2": dice terms and whole numbers joined by + or -. At least one die; no leading sign.
export function parseDice(text) {
  const tokens = text.trim().split(/\s*([+-])\s*/);
  const terms = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const sign = i === 0 ? 1 : tokens[i - 1] === "-" ? -1 : 1;
    const term = parseTerm(tokens[i], sign);
    if (!term) return invalid;
    terms.push(term);
  }
  const dice = terms.filter((t) => t.kind === "dice");
  const diceTotal = dice.reduce((sum, t) => sum + t.count, 0);
  return dice.length && diceTotal <= MAX_DICE_TOTAL ? { ok: true, terms } : invalid;
}

export function rollDice(terms, random) {
  const parts = terms.map((term) => {
    if (term.kind === "flat") return { ...term, subtotal: term.sign * term.value };
    const rolls = Array.from({ length: term.count }, () => Math.floor(random() * term.sides) + 1);
    return { ...term, rolls, subtotal: term.sign * rolls.reduce((sum, r) => sum + r, 0) };
  });
  return { parts, total: parts.reduce((sum, p) => sum + p.subtotal, 0) };
}

const describePart = (part) => (part.kind === "flat" ? `${part.value}` : `${part.count}d${part.sides} [${part.rolls.join(", ")}]`);

// "1d4 [3] + 3 = 6"
export function describeRoll({ parts, total }) {
  const body = parts.map((part, index) => (index === 0 ? describePart(part) : `${part.sign < 0 ? "-" : "+"} ${describePart(part)}`)).join(" ");
  return `${body} = ${total}`;
}

export function parseCommand(text) {
  if (!text.startsWith("/")) return { kind: "text", text };
  const [, command, rest] = /^\/(\S+)\s*(.*)$/.exec(text) ?? [];
  if (["r", "roll"].includes(command?.toLowerCase())) return rest ? { kind: "roll", expression: rest } : { kind: "error", error: "invalidRoll" };
  return { kind: "error", error: "unknownCommand" };
}

function rollMessage(expression, meta, random) {
  const parsed = parseDice(expression);
  if (!parsed.ok) return { error: "invalidRoll" };
  const result = rollDice(parsed.terms, random);
  return { ...meta, kind: "roll", expression: expression.replace(/\s+/g, "").toLowerCase(), total: result.total, detail: describeRoll(result) };
}

export const RollMode = Object.freeze({ NORMAL: "normal", ADVANTAGE: "advantage", DISADVANTAGE: "disadvantage" });

const D20_SIDES = 20;

// Shift + click is advantage, Ctrl/Cmd + click is disadvantage; both cancel out.
export function rollModeFromKeys({ shiftKey, ctrlKey, metaKey }) {
  const disadvantage = Boolean(ctrlKey || metaKey);
  if (shiftKey && disadvantage) return RollMode.NORMAL;
  if (shiftKey) return RollMode.ADVANTAGE;
  return disadvantage ? RollMode.DISADVANTAGE : RollMode.NORMAL;
}

// A d20 check. With advantage/disadvantage two dice are rolled and `kept` is the one that counts (the first one on a tie).
export function rollD20(modifier, mode, random) {
  const roll = () => Math.floor(random() * D20_SIDES) + 1;
  const rolls = mode === RollMode.NORMAL ? [roll()] : [roll(), roll()];
  const better = mode === RollMode.ADVANTAGE ? rolls[1] > rolls[0] : rolls[1] < rolls[0];
  const kept = rolls.length > 1 && better ? 1 : 0;
  return { modifier, mode, rolls, kept, total: rolls[kept] + modifier };
}

const withModifier = (modifier) => (modifier === 0 ? "" : ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`);

// Shown when hovering the number: "1d20 [11] + 5 = 16" or, with two dice, "2d20 [11, 19] → 19 + 5 = 24".
export function describeCheck({ modifier, rolls, kept, total }) {
  const dice = rolls.length > 1 ? `${rolls.length}d20 [${rolls.join(", ")}] → ${rolls[kept]}` : `1d20 [${rolls[0]}]`;
  return `${dice}${withModifier(modifier)} = ${total}`;
}

const DEFAULT_CRIT_RANGE = 20;
const NATURAL_ONE = 1;

// A critical is the d20 that counts (the kept one) reaching the weapon's crit range; a natural 1 never is, and a bad range means 20.
function isCritical({ rolls, kept }, critRange) {
  const range = Number.isInteger(critRange) ? critRange : DEFAULT_CRIT_RANGE;
  const natural = rolls[kept];
  return natural > NATURAL_ONE && natural >= range;
}

const doubleDice = (terms) => terms.map((term) => (term.kind === "dice" ? { ...term, count: term.count * 2 } : term));

// A roll that comes from the sheet: a d20 check, damage lines, or both (an attack). One message, shown as a card.
// On a critical (spec CC1) the dice of every damage line are rolled twice; flat bonuses are not doubled.
export function buildSheetMessage({ character, label, modifier, mode = RollMode.NORMAL, critRange, damage = [] }, meta, random) {
  if (modifier === undefined && !damage.length) return { error: "invalidRoll" };
  const message = { ...meta, kind: "sheet", character, label };
  if (modifier !== undefined) message.check = rollD20(modifier, mode, random);
  if (!damage.length) return message;
  const crit = message.check ? isCritical(message.check, critRange) : false;
  if (crit) message.crit = true;
  message.damage = [];
  for (const line of damage) {
    const parsed = parseDice(line.expression);
    if (!parsed.ok) return { error: "invalidRoll" };
    const result = rollDice(crit ? doubleDice(parsed.terms) : parsed.terms, random);
    message.damage.push({ expression: line.expression, type: line.type, total: result.total, detail: describeRoll(result) });
  }
  return message;
}

// A feature printed from the sheet. Needs at least a name or a description; long text is capped.
export function buildFeatureMessage({ character, name, source, description }, meta) {
  const title = name.trim().slice(0, MAX_FEATURE_TITLE);
  const text = description.trim().slice(0, MAX_FEATURE_DESCRIPTION);
  if (!title && !text) return { error: "empty" };
  return { ...meta, kind: "feature", character, name: title, source: source.trim().slice(0, MAX_FEATURE_TITLE), description: text };
}

// One line for the toast: "Peper: Longsword — 24 (16 / 24) · 8 Slashing".
export function summarizeSheetMessage({ character, label, check, damage = [], crit }) {
  const parts = [];
  if (check) parts.push(check.rolls.length > 1 ? `${check.total} (${check.rolls.map((r) => r + check.modifier).join(" / ")})` : `${check.total}`);
  if (crit) parts.push("Crit!");
  for (const line of damage) parts.push(line.type ? `${line.total} ${line.type}` : `${line.total}`);
  return `${character}: ${label} — ${parts.join(" · ")}`;
}

// Returns the message to store, or { error } (nothing is sent) when the input is empty or not a valid command.
export function buildMessage(text, meta, random) {
  const trimmed = text.trim();
  if (!trimmed) return { error: "empty" };
  const command = parseCommand(trimmed);
  if (command.kind === "error") return { error: command.error };
  if (command.kind === "text") return { ...meta, kind: "text", text: command.text.slice(0, MAX_TEXT_LENGTH) };
  return rollMessage(command.expression, meta, random);
}

export const isMessage = (m) => Boolean(m) && typeof m === "object" && typeof m.id === "string" && typeof m.time === "number" && typeof m.author === "string" && ["text", "roll", "sheet", "feature"].includes(m.kind);

const byTime = (a, b) => a.time - b.time || a.id.localeCompare(b.id);

export const CHAT_LIMIT = 50;
export const chatKey = (id) => `${CHAT_PREFIX}${id}`;

// Valid chat messages in a scene's metadata as [key, message], oldest first. Anything else (other keys, other extensions, bad values) is ignored.
const chatEntries = (metadata) =>
  Object.entries(metadata ?? {})
    .filter(([key, value]) => key.startsWith(CHAT_PREFIX) && isMessage(value))
    .sort(([, a], [, b]) => byTime(a, b));

export const chatFromMetadata = (metadata, cap = CHAT_LIMIT) => chatEntries(metadata).map(([, message]) => message).slice(-cap);

// The keys of the oldest messages beyond the cap; the caller deletes them when it adds a message.
export function chatKeysToPrune(metadata, cap = CHAT_LIMIT) {
  const entries = chatEntries(metadata);
  return entries.slice(0, Math.max(entries.length - cap, 0)).map(([key]) => key);
}

export const legacyChatKeys = (metadata) => Object.keys(metadata ?? {}).filter((key) => key.startsWith(CHAT_PREFIX));
