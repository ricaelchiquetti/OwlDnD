import { describe, it, expect } from "vitest";
import { isMessage, chatKey, chatFromMetadata, chatKeysToPrune, CHAT_LIMIT, legacyChatKeys, buildFeatureMessage, RollMode, rollModeFromKeys, rollD20, describeCheck, buildSheetMessage, summarizeSheetMessage, parseDice, rollDice, describeRoll, parseCommand, buildMessage, CHAT_PREFIX } from "./chat.js";

// a deterministic "random": returns the given fractions in order
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

describe("parseDice", () => {
  it("reads a single die with an implicit count", () => expect(parseDice("d4")).toEqual({ ok: true, terms: [{ kind: "dice", sign: 1, count: 1, sides: 4 }] }));
  it("reads a die plus a modifier", () =>
    expect(parseDice("d4+3")).toEqual({ ok: true, terms: [{ kind: "dice", sign: 1, count: 1, sides: 4 }, { kind: "flat", sign: 1, value: 3 }] }));
  it("reads several dice of one type", () => expect(parseDice("2d6").terms).toEqual([{ kind: "dice", sign: 1, count: 2, sides: 6 }]));
  it("is case-insensitive and ignores spaces", () => expect(parseDice(" 2D8 + 1d4 + 3 ").terms.map((t) => t.kind)).toEqual(["dice", "dice", "flat"]));
  it("handles subtraction", () => expect(parseDice("d20-2").terms[1]).toEqual({ kind: "flat", sign: -1, value: 2 }));
  it("handles a negative die", () => expect(parseDice("2d6-1d4").terms[1]).toEqual({ kind: "dice", sign: -1, count: 1, sides: 4 }));
  it("mixes several terms", () => expect(parseDice("1d20+5-2").terms).toHaveLength(3));
  it.each([[""], ["abc"], ["d"], ["2d"], ["0d6"], ["2d1"], ["101d6"], ["1d1001"], ["2d6+"], ["+3"], ["3"], ["5+2"], ["1.5d6"], ["2d6 3"], ["d4++3"]])(
    "rejects %j", (text) => expect(parseDice(text).ok).toBe(false));
  it("limits the number of dice in total", () => expect(parseDice("60d6+60d6").ok).toBe(false));
});

describe("rollDice", () => {
  const roll = (text, random) => rollDice(parseDice(text).terms, random);
  it("rolls 1..sides for each die", () => {
    expect(roll("d6", () => 0).total).toBe(1);
    expect(roll("d6", () => 0.999999).total).toBe(6);
  });
  it("adds the modifier", () => expect(roll("d4+3", () => 0.5).total).toBe(3 + 3));
  it("keeps every die so it can be shown", () => {
    const result = roll("2d6", seq(0, 0.5));
    expect(result.parts[0].rolls).toEqual([1, 4]);
    expect(result.total).toBe(5);
  });
  it("subtracts negative terms", () => expect(roll("d20-2", () => 0.5).total).toBe(11 - 2));
  it("subtracts a negative die", () => expect(roll("2d6-1d4", seq(0.999999, 0.999999, 0.999999)).total).toBe(12 - 4));
  it("can total below 1", () => expect(roll("d4-9", () => 0).total).toBe(1 - 9));
});

describe("describeRoll", () => {
  const text = (expr, random) => describeRoll(rollDice(parseDice(expr).terms, random));
  it("shows each die and the final total", () => expect(text("2d6", seq(0.5, 0.999999))).toBe("2d6 [4, 6] = 10"));
  it("shows a modifier", () => expect(text("d4+3", () => 0.5)).toBe("1d4 [3] + 3 = 6"));
  it("shows subtraction", () => expect(text("d20-2", () => 0.5)).toBe("1d20 [11] - 2 = 9"));
});

describe("parseCommand", () => {
  it("recognizes /r", () => expect(parseCommand("/r d4+3")).toEqual({ kind: "roll", expression: "d4+3" }));
  it("recognizes /roll", () => expect(parseCommand("/roll 2d6")).toEqual({ kind: "roll", expression: "2d6" }));
  it("is case-insensitive about the command", () => expect(parseCommand("/R 2d6").kind).toBe("roll"));
  it("treats ordinary text as a message", () => expect(parseCommand("hello there")).toEqual({ kind: "text", text: "hello there" }));
  it("a slash in the middle is just text", () => expect(parseCommand("and/or 2d6")).toEqual({ kind: "text", text: "and/or 2d6" }));
  it("a roll command with nothing to roll is an error", () => expect(parseCommand("/r").kind).toBe("error"));
  it("an unknown command is an error", () => expect(parseCommand("/dance now").kind).toBe("error"));
});

describe("buildMessage", () => {
  const meta = { id: "m1", time: 1000, author: "Ana", authorId: "p1" };
  it("builds a text message", () => expect(buildMessage("hi", meta, () => 0)).toEqual({ ...meta, kind: "text", text: "hi" }));
  it("builds a roll message with the dice and the total", () => {
    const message = buildMessage("/r 2d6+1", meta, seq(0, 0.999999));
    expect(message).toMatchObject({ ...meta, kind: "roll", expression: "2d6+1", total: 8, detail: "2d6 [1, 6] + 1 = 8" });
  });
  it("reports an invalid roll without building a message", () => expect(buildMessage("/r banana", meta, () => 0)).toEqual({ error: "invalidRoll" }));
  it("reports an unknown command", () => expect(buildMessage("/dance", meta, () => 0)).toEqual({ error: "unknownCommand" }));
  it("reports an empty roll", () => expect(buildMessage("/r", meta, () => 0)).toEqual({ error: "invalidRoll" }));
  it("trims and rejects empty text", () => expect(buildMessage("   ", meta, () => 0)).toEqual({ error: "empty" }));
  it("limits the length of a text message", () => expect(buildMessage("x".repeat(600), meta, () => 0).text).toHaveLength(500));
});

describe("isMessage", () => {
  const base = { id: "a", time: 1, author: "A", authorId: "p" };
  it.each(["text", "roll", "sheet", "feature"])("accepts kind %s", (kind) => expect(isMessage({ ...base, kind })).toBe(true));
  it.each([[null], ["str"], [{}], [{ ...base, kind: "weird" }], [{ ...base, kind: "text", time: "now" }], [{ ...base, kind: "text", id: 5 }]])("rejects %j", (value) =>
    expect(isMessage(value)).toBe(false));
});

describe("scene chat log (spec-chat-cena)", () => {
  const msg = (id, time) => ({ id, time, kind: "text", text: id, author: "A", authorId: "p" });
  const meta = (...messages) => Object.fromEntries(messages.map((m) => [chatKey(m.id), m]));
  it("CA1 chatKey is the prefix plus the id", () => expect(chatKey("a")).toBe(`${CHAT_PREFIX}a`));
  it("CA2 an empty scene has an empty log", () => expect(chatFromMetadata({})).toEqual([]));
  it("CA2 tolerates missing metadata", () => expect(chatFromMetadata(undefined)).toEqual([]));
  it("CA3 reads messages oldest first", () => expect(chatFromMetadata(meta(msg("b", 2), msg("a", 1)), 10).map((m) => m.id)).toEqual(["a", "b"]));
  it("orders messages at the same time by id", () => expect(chatFromMetadata(meta(msg("b", 5), msg("a", 5)), 10).map((m) => m.id)).toEqual(["a", "b"]));
  it("CA3 shows only the newest `cap` messages", () => expect(chatFromMetadata(meta(msg("a", 1), msg("b", 2), msg("c", 3)), 2).map((m) => m.id)).toEqual(["b", "c"]));
  it("CA4 ignores keys that are not chat messages", () => expect(chatFromMetadata({ ...meta(msg("a", 1)), "other/ext": msg("x", 0), "owldnd/turn": { round: 1 } }, 10).map((m) => m.id)).toEqual(["a"]));
  it("CA5 ignores invalid values under the chat prefix", () => expect(chatFromMetadata({ ...meta(msg("a", 1)), [chatKey("bad")]: { nope: true } }, 10).map((m) => m.id)).toEqual(["a"]));
  it("the default limit is 50", () => expect(CHAT_LIMIT).toBe(50));
});

describe("chatKeysToPrune", () => {
  const msg = (id, time) => ({ id, time, kind: "text", text: id, author: "A", authorId: "p" });
  const meta = (...messages) => Object.fromEntries(messages.map((m) => [chatKey(m.id), m]));
  it("nothing to prune within the cap", () => expect(chatKeysToPrune(meta(msg("a", 1), msg("b", 2)), 2)).toEqual([]));
  it("returns the oldest keys beyond the cap", () => expect(chatKeysToPrune(meta(msg("a", 1), msg("b", 2), msg("c", 3)), 2)).toEqual([chatKey("a")]));
  it("CA4 never returns keys that are not valid chat messages", () =>
    expect(chatKeysToPrune({ ...meta(msg("a", 1), msg("b", 2)), "other/ext": 1, [chatKey("bad")]: {} }, 1)).toEqual([chatKey("a")]));
});

describe("legacyChatKeys (chat used to live in the room metadata, which has a 16 kB limit)", () => {
  it("lists the old chat keys so they can be removed", () =>
    expect(legacyChatKeys({ [`${CHAT_PREFIX}a`]: {}, [`${CHAT_PREFIX}b`]: {}, "owldnd/journal": {}, other: 1 })).toEqual([`${CHAT_PREFIX}a`, `${CHAT_PREFIX}b`]));
  it("is empty without metadata", () => expect(legacyChatKeys(undefined)).toEqual([]));
});

describe("rollModeFromKeys", () => {
  it("is normal without modifier keys", () => expect(rollModeFromKeys({})).toBe(RollMode.NORMAL));
  it("Shift is advantage", () => expect(rollModeFromKeys({ shiftKey: true })).toBe(RollMode.ADVANTAGE));
  it("Ctrl is disadvantage", () => expect(rollModeFromKeys({ ctrlKey: true })).toBe(RollMode.DISADVANTAGE));
  it("Cmd is disadvantage too (Mac)", () => expect(rollModeFromKeys({ metaKey: true })).toBe(RollMode.DISADVANTAGE));
  it("both together cancel out", () => expect(rollModeFromKeys({ shiftKey: true, ctrlKey: true })).toBe(RollMode.NORMAL));
});

describe("rollD20", () => {
  it("a normal check is one d20 plus the modifier", () => expect(rollD20(5, RollMode.NORMAL, () => 0.5)).toEqual({ modifier: 5, mode: "normal", rolls: [11], kept: 0, total: 16 }));
  it("advantage rolls two and keeps the higher", () =>
    expect(rollD20(5, RollMode.ADVANTAGE, seq(0.5, 0.9))).toEqual({ modifier: 5, mode: "advantage", rolls: [11, 19], kept: 1, total: 24 }));
  it("advantage keeps the first when the second is lower", () => expect(rollD20(0, RollMode.ADVANTAGE, seq(0.9, 0.1)).kept).toBe(0));
  it("disadvantage keeps the lower", () => expect(rollD20(5, RollMode.DISADVANTAGE, seq(0.9, 0.1))).toMatchObject({ rolls: [19, 3], kept: 1, total: 8 }));
  it("a tie keeps the first die", () => expect(rollD20(0, RollMode.DISADVANTAGE, () => 0.5).kept).toBe(0));
  it("the modifier can be negative", () => expect(rollD20(-2, RollMode.NORMAL, () => 0.5).total).toBe(9));
});

describe("describeCheck (the hover text)", () => {
  it("a normal check", () => expect(describeCheck(rollD20(5, RollMode.NORMAL, () => 0.5))).toBe("1d20 [11] + 5 = 16"));
  it("a negative modifier", () => expect(describeCheck(rollD20(-1, RollMode.NORMAL, () => 0.5))).toBe("1d20 [11] - 1 = 10"));
  it("no modifier", () => expect(describeCheck(rollD20(0, RollMode.NORMAL, () => 0.5))).toBe("1d20 [11] = 11"));
  it("shows both dice and the one that counts", () => expect(describeCheck(rollD20(5, RollMode.ADVANTAGE, seq(0.5, 0.9)))).toBe("2d20 [11, 19] → 19 + 5 = 24"));
});

describe("buildSheetMessage (the rolls that come from the sheet)", () => {
  const meta = { id: "m1", time: 1000, author: "Ana", authorId: "p1", role: "GM" };
  const spec = { character: "Peper", label: "Longsword" };
  it("a check only", () => {
    const message = buildSheetMessage({ ...spec, modifier: 5 }, meta, () => 0.5);
    expect(message).toMatchObject({ ...meta, kind: "sheet", character: "Peper", label: "Longsword", check: { modifier: 5, mode: "normal", rolls: [11], kept: 0, total: 16 } });
    expect(message.damage).toBeUndefined();
  });
  it("a check with advantage", () =>
    expect(buildSheetMessage({ ...spec, modifier: 5, mode: RollMode.ADVANTAGE }, meta, seq(0.5, 0.9)).check).toMatchObject({ rolls: [11, 19], kept: 1, total: 24 }));
  it("attack and damage together, in one message", () => {
    const message = buildSheetMessage({ ...spec, modifier: 5, damage: [{ expression: "1d8+3", type: "Slashing" }] }, meta, seq(0.5, 0.5));
    expect(message.check.total).toBe(16);
    expect(message.damage).toEqual([{ expression: "1d8+3", type: "Slashing", total: 8, detail: "1d8 [5] + 3 = 8" }]);
  });
  it("damage alone has no check", () => {
    const message = buildSheetMessage({ ...spec, damage: [{ expression: "2d6", type: "Fire" }] }, meta, () => 0);
    expect(message.check).toBeUndefined();
    expect(message.damage[0].total).toBe(2);
  });
  it("several damage lines stay separate", () =>
    expect(buildSheetMessage({ ...spec, damage: [{ expression: "1d8", type: "Slashing" }, { expression: "1d6", type: "Fire" }] }, meta, () => 0).damage.map((d) => d.type)).toEqual(["Slashing", "Fire"]));
  it("rejects a damage expression that cannot be rolled", () =>
    expect(buildSheetMessage({ ...spec, damage: [{ expression: "banana", type: "" }] }, meta, () => 0)).toEqual({ error: "invalidRoll" }));
  it("rejects a roll with nothing to roll", () => expect(buildSheetMessage({ ...spec }, meta, () => 0)).toEqual({ error: "invalidRoll" }));
  describe("critical hit doubles the damage dice (spec CC1-CC5)", () => {
    const attack = (extra) => ({ ...spec, modifier: 5, damage: [{ expression: "1d8+3", type: "Slashing" }], ...extra });
    it("CC1 a natural 20 rolls the dice twice, not the flat bonus", () => {
      const message = buildSheetMessage(attack(), meta, seq(0.99, 0.5, 0.5));
      expect(message.crit).toBe(true);
      expect(message.damage[0].detail).toBe("2d8 [5, 5] + 3 = 13");
    });
    it("CC1 a crit range of 19 makes a 19 a critical", () => expect(buildSheetMessage(attack({ critRange: 19 }), meta, seq(0.9, 0.5, 0.5)).crit).toBe(true));
    it("CC2 below the crit range is normal", () => {
      const message = buildSheetMessage(attack({ critRange: 19 }), meta, seq(0.85, 0.5));
      expect(message.crit).toBeFalsy();
      expect(message.damage[0].detail).toBe("1d8 [5] + 3 = 8");
    });
    it("CC2 a missing crit range means 20", () => expect(buildSheetMessage(attack(), meta, seq(0.9, 0.5)).crit).toBeFalsy());
    it("CC2 an invalid crit range means 20", () => expect(buildSheetMessage(attack({ critRange: "x" }), meta, seq(0.9, 0.5)).crit).toBeFalsy());
    it("CC2 a natural 1 is never a critical", () => expect(buildSheetMessage(attack({ critRange: 1 }), meta, seq(0, 0.5)).crit).toBeFalsy());
    it("CC3 with advantage the kept d20 counts", () => expect(buildSheetMessage(attack({ mode: RollMode.ADVANTAGE }), meta, seq(0.1, 0.99, 0.5, 0.5)).crit).toBe(true));
    it("CC3 a dropped natural 20 does not count", () => expect(buildSheetMessage(attack({ mode: RollMode.DISADVANTAGE }), meta, seq(0.99, 0.1, 0.5)).crit).toBeFalsy());
    it("CC4 damage alone is never a critical", () => expect(buildSheetMessage({ ...spec, critRange: 1, damage: [{ expression: "1d8", type: "" }] }, meta, () => 0.99).crit).toBeFalsy());
    it("CC1 every damage line doubles", () =>
      expect(buildSheetMessage(attack({ damage: [{ expression: "1d8+3", type: "" }, { expression: "1d6", type: "" }] }), meta, seq(0.99, 0, 0, 0, 0)).damage.map((d) => d.detail)).toEqual(["2d8 [1, 1] + 3 = 5", "2d6 [1, 1] = 2"]));
  });
  it("a typed /r message is not a sheet message", () => expect(buildMessage("/r d6", meta, () => 0).kind).toBe("roll"));
});

describe("summarizeSheetMessage (the toast)", () => {
  const meta = { id: "m", time: 1, author: "Ana", authorId: "p", role: "PLAYER" };
  const make = (spec, random) => buildSheetMessage({ character: "Peper", label: "Longsword", ...spec }, meta, random);
  it("a check", () => expect(summarizeSheetMessage(make({ modifier: 5 }, () => 0.5))).toBe("Peper: Longsword — 16"));
  it("shows both totals when there is advantage", () =>
    expect(summarizeSheetMessage(make({ modifier: 5, mode: RollMode.ADVANTAGE }, seq(0.5, 0.9)))).toBe("Peper: Longsword — 24 (16 / 24)"));
  it("adds the damage", () =>
    expect(summarizeSheetMessage(make({ modifier: 5, damage: [{ expression: "1d8+3", type: "Slashing" }] }, seq(0.5, 0.5)))).toBe("Peper: Longsword — 16 · 8 Slashing"));
  it("damage alone", () => expect(summarizeSheetMessage(make({ damage: [{ expression: "2d6", type: "" }] }, () => 0))).toBe("Peper: Longsword — 2"));
});

describe("buildFeatureMessage (print a feature in the chat)", () => {
  const meta = { id: "m1", time: 1000, author: "Ana", authorId: "p1", role: "GM" };
  const feature = { character: "Peper", name: "Second Wind", source: "Class: Fighter", description: "Regain hit points." };
  it("builds a feature message with the sheet's data", () => expect(buildFeatureMessage(feature, meta)).toEqual({ ...meta, kind: "feature", ...feature }));
  it("trims the text", () => expect(buildFeatureMessage({ ...feature, name: "  Rage  " }, meta).name).toBe("Rage"));
  it("works with only a name", () => expect(buildFeatureMessage({ character: "P", name: "Darkvision", source: "", description: "" }, meta).kind).toBe("feature"));
  it("works with only a description", () => expect(buildFeatureMessage({ character: "P", name: "", source: "", description: "text" }, meta).description).toBe("text"));
  it("refuses a feature with nothing in it", () => expect(buildFeatureMessage({ character: "P", name: " ", source: "", description: "" }, meta)).toEqual({ error: "empty" }));
  it("caps a very long description so the room metadata does not balloon", () =>
    expect(buildFeatureMessage({ ...feature, description: "x".repeat(5000) }, meta).description).toHaveLength(2000));
});
