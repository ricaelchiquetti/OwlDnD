// Pure initiative rules (no Owlbear imports, so they can be tested in Node).
import { SHEET_TOKEN_KEY } from "./journal.js";

export const INITIATIVE_KEY = "owldnd/initiative";
export const TURN_KEY = "owldnd/turn";

const UNNAMED = "?";

// Highest first; a tie goes to the higher bonus, then to the name.
export const sortEntries = (entries) =>
  [...entries].sort((a, b) => b.value - a.value || b.bonus - a.bonus || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

export function readEntries(items) {
  return items.flatMap((item) => {
    const data = item.metadata?.[INITIATIVE_KEY];
    if (typeof data?.value !== "number") return [];
    return [{ id: item.id, name: item.name || UNNAMED, value: data.value, bonus: data.bonus ?? 0, image: item.image?.url ?? null }];
  });
}

// Next in order; after the last one a new round starts. If the current one is gone, restart at the top of the same round.
export function nextTurn(order, current, round) {
  if (!order.length) return { current: null, round };
  const index = order.findIndex((entry) => entry.id === current);
  if (current === null) return { current: order[0].id, round: round || 1 };
  if (index === -1) return { current: order[0].id, round };
  const last = index === order.length - 1;
  return { current: order[last ? 0 : index + 1].id, round: last ? round + 1 : round };
}

// Back one turn; before the first one it wraps to the last of the previous round (round 1 has no previous, so it stays).
export function previousTurn(order, current, round) {
  if (!order.length) return { current: null, round };
  if (current === null) return { current: null, round };
  const index = order.findIndex((entry) => entry.id === current);
  if (index === -1) return { current: order[0].id, round };
  if (index > 0) return { current: order[index - 1].id, round };
  return round > 1 ? { current: order[order.length - 1].id, round: round - 1 } : { current: order[0].id, round };
}

export const tokensLinkedTo = (items, sheetId) => items.filter((item) => item.metadata?.[SHEET_TOKEN_KEY] === sheetId).map((item) => item.id);

export function withoutInitiative(metadata) {
  const { [INITIATIVE_KEY]: _removed, ...rest } = metadata;
  return rest;
}
