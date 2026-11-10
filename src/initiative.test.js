import { describe, it, expect } from "vitest";
import { INITIATIVE_KEY, sortEntries, readEntries, nextTurn, previousTurn, tokensLinkedTo, withoutInitiative } from "./initiative.js";

const entry = (id, name, value, bonus = 0) => ({ id, name, value, bonus });

describe("sortEntries", () => {
  it("orders by initiative, highest first", () =>
    expect(sortEntries([entry("a", "A", 10), entry("b", "B", 18), entry("c", "C", 14)]).map((e) => e.id)).toEqual(["b", "c", "a"]));
  it("breaks a tie by the higher bonus", () =>
    expect(sortEntries([entry("a", "A", 15, 1), entry("b", "B", 15, 4)]).map((e) => e.id)).toEqual(["b", "a"]));
  it("then by name", () =>
    expect(sortEntries([entry("a", "Zed", 15, 2), entry("b", "Amy", 15, 2)]).map((e) => e.id)).toEqual(["b", "a"]));
  it("does not mutate the input", () => {
    const list = [entry("a", "A", 1), entry("b", "B", 2)];
    sortEntries(list);
    expect(list.map((e) => e.id)).toEqual(["a", "b"]);
  });
  it("handles decimal values used as manual tiebreakers", () =>
    expect(sortEntries([entry("a", "A", 15), entry("b", "B", 15.5)]).map((e) => e.id)).toEqual(["b", "a"]));
});

describe("readEntries", () => {
  const token = (id, name, value, extra = {}) => ({ id, name, metadata: value === undefined ? {} : { [INITIATIVE_KEY]: { value, bonus: 2 } }, ...extra });
  it("keeps only items that have initiative", () =>
    expect(readEntries([token("a", "Orc", 12), token("b", "Rock")])).toEqual([{ id: "a", name: "Orc", value: 12, bonus: 2, image: null }]));
  it("carries the token image so the list can show an icon", () =>
    expect(readEntries([token("a", "Orc", 12, { image: { url: "https://x/orc.png", width: 1, height: 1, mime: "image/png" } })])[0].image).toBe("https://x/orc.png"));
  it("falls back to a placeholder when the token has no name", () => expect(readEntries([token("a", "", 12)])[0].name).toBe("?"));
  it("ignores malformed values", () =>
    expect(readEntries([{ id: "a", name: "X", metadata: { [INITIATIVE_KEY]: { value: "nope" } } }])).toEqual([]));
  it("tolerates an item with no metadata at all", () => expect(readEntries([{ id: "a", name: "X" }])).toEqual([]));
});

describe("nextTurn", () => {
  const order = [entry("a", "A", 18), entry("b", "B", 14), entry("c", "C", 9)];
  it("starts at the top of round 1", () => expect(nextTurn(order, null, 0)).toEqual({ current: "a", round: 1 }));
  it("moves to the next in order", () => expect(nextTurn(order, "a", 1)).toEqual({ current: "b", round: 1 }));
  it("wraps to the top and starts a new round", () => expect(nextTurn(order, "c", 1)).toEqual({ current: "a", round: 2 }));
  it("restarts at the top when the current one was removed, keeping the round", () => expect(nextTurn(order, "gone", 3)).toEqual({ current: "a", round: 3 }));
  it("does nothing for an empty order", () => expect(nextTurn([], "a", 2)).toEqual({ current: null, round: 2 }));
  it("a single combatant gains a round every turn", () => expect(nextTurn([entry("a", "A", 10)], "a", 1)).toEqual({ current: "a", round: 2 }));
});

describe("tokensLinkedTo (sheet click)", () => {
  const items = [
    { id: "t1", metadata: { "owldnd/sheet": "S1" } },
    { id: "t2", metadata: { "owldnd/sheet": "S2" } },
    { id: "t3", metadata: { "owldnd/sheet": "S1" } },
    { id: "t4", metadata: {} },
    { id: "t5" },
  ];
  it("finds every token linked to the sheet", () => expect(tokensLinkedTo(items, "S1")).toEqual(["t1", "t3"]));
  it("is empty when no token is linked", () => expect(tokensLinkedTo(items, "S9")).toEqual([]));
});

describe("withoutInitiative", () => {
  it("returns the metadata without the initiative key, leaving the rest", () =>
    expect(withoutInitiative({ [INITIATIVE_KEY]: { value: 1 }, other: 2 })).toEqual({ other: 2 }));
});

describe("previousTurn", () => {
  const order = [entry("a", "A", 18), entry("b", "B", 14), entry("c", "C", 9)];
  it("moves to the one before", () => expect(previousTurn(order, "b", 2)).toEqual({ current: "a", round: 2 }));
  it("from the top, wraps to the last and goes back one round", () => expect(previousTurn(order, "a", 3)).toEqual({ current: "c", round: 2 }));
  it("never goes below round 1: at the top of round 1 it stays", () => expect(previousTurn(order, "a", 1)).toEqual({ current: "a", round: 1 }));
  it("does nothing when nobody has the turn yet", () => expect(previousTurn(order, null, 0)).toEqual({ current: null, round: 0 }));
  it("restarts at the top when the current one was removed, keeping the round", () => expect(previousTurn(order, "gone", 3)).toEqual({ current: "a", round: 3 }));
  it("does nothing for an empty order", () => expect(previousTurn([], "a", 2)).toEqual({ current: null, round: 2 }));
  it("is the inverse of nextTurn", () => {
    const forward = nextTurn(order, "b", 2);
    expect(previousTurn(order, forward.current, forward.round)).toEqual({ current: "b", round: 2 });
    const wrapped = nextTurn(order, "c", 2);
    expect(previousTurn(order, wrapped.current, wrapped.round)).toEqual({ current: "c", round: 2 });
  });
});
