import { describe, it, expect } from "vitest";
import { Kind, Visibility, isVisible, canChangeVisibility, createItem, setVisibility } from "./journal.js";

const item = (over = {}) => ({ id: "x", kind: Kind.NOTE, title: "t", owner: "owner", visibility: Visibility.GM, players: [], ...over });
const gm = { id: "gm", role: "GM" };
const player = (id) => ({ id, role: "PLAYER" });

describe("isVisible (CA7)", () => {
  it("GM sees everything", () => expect(isVisible(item(), gm)).toBe(true));
  it("owner sees own GM-level item", () => expect(isVisible(item(), player("owner"))).toBe(true));
  it("other player does not see GM-level item", () => expect(isVisible(item(), player("p2"))).toBe(false));
  it("everyone sees ALL", () => expect(isVisible(item({ visibility: Visibility.ALL }), player("p2"))).toBe(true));
  it("chosen player sees PLAYERS item", () =>
    expect(isVisible(item({ visibility: Visibility.PLAYERS, players: ["p2"] }), player("p2"))).toBe(true));
  it("unchosen player does not see PLAYERS item", () =>
    expect(isVisible(item({ visibility: Visibility.PLAYERS, players: ["p2"] }), player("p3"))).toBe(false));
});

describe("canChangeVisibility (CA9)", () => {
  it("owner and GM can", () => {
    expect(canChangeVisibility(item(), player("owner"))).toBe(true);
    expect(canChangeVisibility(item(), gm)).toBe(true);
  });
  it("others cannot", () => expect(canChangeVisibility(item({ visibility: Visibility.ALL }), player("p2"))).toBe(false));
});

describe("createItem (CA5)", () => {
  it("creates GM-visible item owned by current player with numbered default title", () => {
    const n = createItem(Kind.NOTE, [item(), item({ id: "y" })], "me", "New Note");
    expect(n).toMatchObject({ kind: Kind.NOTE, owner: "me", visibility: Visibility.GM, title: "New Note 3" });
    expect(n.id).toBeTruthy();
  });
  it("numbers per kind", () => {
    const c = createItem(Kind.CHARACTER, [item()], "me", "New Character");
    expect(c.title).toBe("New Character 1");
  });
});

describe("setVisibility (CA8)", () => {
  it("drops players unless PLAYERS", () => {
    const r = setVisibility(item({ visibility: Visibility.PLAYERS, players: ["a"] }), Visibility.ALL);
    expect(r.visibility).toBe(Visibility.ALL);
    expect(r.players).toEqual([]);
  });
  it("keeps chosen players for PLAYERS", () => {
    expect(setVisibility(item(), Visibility.PLAYERS, ["a"]).players).toEqual(["a"]);
  });
});

import { sheetKey, readSheets, SHEET_TOKEN_KEY } from "./journal.js";

describe("sheet storage keys (spec-fase1)", () => {
  it("builds one metadata key per sheet", () => expect(sheetKey("ab12")).toBe("owldnd/sheet/ab12"));
  it("exposes the token metadata key", () => expect(SHEET_TOKEN_KEY).toBe("owldnd/sheet"));
  it("reads only sheet keys from room metadata, indexed by id", () => {
    const metadata = { "owldnd/sheet/a": { level: 1 }, "owldnd/sheet/b": { level: 2 }, "owldnd/journal": { items: [] }, other: 1 };
    expect(readSheets(metadata)).toEqual({ a: { level: 1 }, b: { level: 2 } });
  });
  it("returns empty when metadata is missing", () => expect(readSheets(undefined)).toEqual({}));
});

import { visibleCharacters } from "./journal.js";

describe("visibleCharacters (link picker)", () => {
  const list = [
    item({ id: "1", kind: Kind.CHARACTER }),
    item({ id: "2", kind: Kind.NOTE, visibility: Visibility.ALL }),
    item({ id: "3", kind: Kind.CHARACTER, owner: "other" }),
    item({ id: "4", kind: Kind.CHARACTER, owner: "other", visibility: Visibility.ALL }),
  ];
  it("keeps only characters visible to the user", () =>
    expect(visibleCharacters(list, player("owner")).map((i) => i.id)).toEqual(["1", "4"]));
  it("GM sees all characters", () => expect(visibleCharacters(list, gm).map((i) => i.id)).toEqual(["1", "3", "4"]));
});

import { removeItem } from "./journal.js";

describe("removeItem (delete)", () => {
  it("removes only the item with the given id", () =>
    expect(removeItem([item({ id: "a" }), item({ id: "b" })], "a").map((i) => i.id)).toEqual(["b"]));
  it("is a no-op for unknown ids", () => expect(removeItem([item({ id: "a" })], "zzz")).toHaveLength(1));
});
