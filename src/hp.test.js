import { describe, it, expect } from "vitest";
import { applyHpInput, applyTempInput } from "./hp.js";

const hp = (current, max, temp = 0) => ({ current, max, temp });

describe("applyHpInput (CA2-CA4)", () => {
  it("-5 removes 5", () => expect(applyHpInput(hp(10, 20), "-5")).toEqual(hp(5, 20)));
  it("+5 adds 5", () => expect(applyHpInput(hp(10, 20), "+5")).toEqual(hp(15, 20)));
  it("+ is capped at max", () => expect(applyHpInput(hp(18, 20), "+5").current).toBe(20));
  it("a plain number sets the value", () => expect(applyHpInput(hp(10, 20), "12").current).toBe(12));
  it("a plain number is capped at max", () => expect(applyHpInput(hp(10, 20), "99").current).toBe(20));
  it("damage never goes below 0", () => expect(applyHpInput(hp(3, 20), "-9").current).toBe(0));
  it("damage hits temp first (CA3)", () => expect(applyHpInput(hp(10, 20, 4), "-6")).toEqual(hp(8, 20, 0)));
  it("damage fully absorbed by temp", () => expect(applyHpInput(hp(10, 20, 8), "-5")).toEqual(hp(10, 20, 3)));
  it("healing leaves temp alone", () => expect(applyHpInput(hp(10, 20, 4), "+3")).toEqual(hp(13, 20, 4)));
  it.each(["", "abc", "+", "-", "1.5", "5-"])("invalid %j returns null", (text) => expect(applyHpInput(hp(10, 20), text)).toBeNull());
  it("tolerates spaces", () => expect(applyHpInput(hp(10, 20), " -5 ").current).toBe(5));
});

describe("applyTempInput (CA6)", () => {
  it("+n adds", () => expect(applyTempInput(3, "+2")).toBe(5));
  it("-n removes, min 0", () => expect(applyTempInput(3, "-9")).toBe(0));
  it("n sets", () => expect(applyTempInput(3, "7")).toBe(7));
  it("invalid returns null", () => expect(applyTempInput(3, "x")).toBeNull());
});

import { hpBarModel, pillPoints, shieldPoints } from "./hp.js";

describe("hpBarModel", () => {
  it("label and fraction", () => expect(hpBarModel({ hpCurrent: 14, hpMax: 17, hpTemp: 0 })).toEqual({ label: "14/17", fraction: 14 / 17, temp: 0 }));
  it("fraction is capped to 0..1", () => expect(hpBarModel({ hpCurrent: 30, hpMax: 17, hpTemp: 0 }).fraction).toBe(1));
  it("no max means no bar (CA7)", () => expect(hpBarModel({ hpCurrent: 5, hpMax: 0, hpTemp: 0 })).toBeNull());
  it("carries temp", () => expect(hpBarModel({ hpCurrent: 1, hpMax: 2, hpTemp: 3 }).temp).toBe(3));
});

describe("pillPoints", () => {
  const pts = pillPoints({ x: 10, y: 20, width: 100, height: 20 });
  it("stays inside the box", () => {
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(10);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(110);
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(20);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(40);
  });
});

describe("shieldPoints", () => {
  const pts = shieldPoints({ x: 10, y: 20, width: 48, height: 55 });
  it("stays inside the box", () => {
    expect(Math.min(...pts.map((p) => p.x))).toBeGreaterThanOrEqual(10);
    expect(Math.max(...pts.map((p) => p.x))).toBeLessThanOrEqual(58);
    expect(Math.min(...pts.map((p) => p.y))).toBeGreaterThanOrEqual(20);
    expect(Math.max(...pts.map((p) => p.y))).toBeLessThanOrEqual(75);
  });
  it("ends in a point at the bottom centre", () => expect(pts.find((p) => p.y === 75)).toEqual({ x: 34, y: 75 }));
});
