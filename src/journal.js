export const Kind = Object.freeze({ CHARACTER: 1, NOTE: 2 });
export const Visibility = Object.freeze({ GM: 1, PLAYERS: 2, ALL: 3 });

const isGm = (user) => user.role === "GM";

export function isVisible(item, user) {
  if (isGm(user) || item.owner === user.id) return true;
  if (item.visibility === Visibility.ALL) return true;
  return item.visibility === Visibility.PLAYERS && item.players.includes(user.id);
}

export const canChangeVisibility = (item, user) => isGm(user) || item.owner === user.id;

export function createItem(kind, items, owner, titlePrefix) {
  const count = items.filter((i) => i.kind === kind).length + 1;
  return {
    id: crypto.randomUUID().slice(0, 8),
    kind,
    title: `${titlePrefix} ${count}`,
    owner,
    visibility: Visibility.GM,
    players: [],
  };
}

export function setVisibility(item, visibility, players = []) {
  return { ...item, visibility, players: visibility === Visibility.PLAYERS ? players : [] };
}

export const JOURNAL_KEY = "owldnd/journal";
export const SHEET_TOKEN_KEY = "owldnd/sheet";
const SHEET_PREFIX = `${SHEET_TOKEN_KEY}/`;

export const sheetKey = (id) => `${SHEET_PREFIX}${id}`;

export function readSheets(metadata) {
  return Object.fromEntries(
    Object.entries(metadata ?? {})
      .filter(([key]) => key.startsWith(SHEET_PREFIX))
      .map(([key, sheet]) => [key.slice(SHEET_PREFIX.length), sheet]),
  );
}

export const visibleCharacters = (items, user) =>
  items.filter((i) => i.kind === Kind.CHARACTER && isVisible(i, user));

export const removeItem = (items, id) => items.filter((i) => i.id !== id);
