import { describe, it, expect } from "vitest";
import { findLimit, metadataSize, limitSummary, formatKb, withoutKey } from "./probe.js";

const range = { low: 256, high: 262144, tolerance: 256 };
const countingProbe = (limit) => {
  const calls = [];
  const fits = async (size) => { calls.push(size); return size <= limit; };
  return { fits, calls };
};

describe("findLimit", () => {
  it("finds the largest size that fits, within the tolerance", async () => {
    const { fits } = countingProbe(16000);
    const { max, capped } = await findLimit(fits, range);
    expect(max).toBeLessThanOrEqual(16000);
    expect(max).toBeGreaterThan(16000 - range.tolerance);
    expect(capped).toBe(false);
  });
  it.each([1000, 5000, 16384, 100000])("works for a limit of %i", async (limit) => {
    const { fits } = countingProbe(limit);
    const { max } = await findLimit(fits, range);
    expect(max).toBeLessThanOrEqual(limit);
    expect(max).toBeGreaterThan(limit - range.tolerance - 1);
  });
  it("is 0 when even the smallest size is refused", async () => expect((await findLimit(async () => false, range)).max).toBe(0));
  it("reports a cap when everything up to the top fits", async () => expect(await findLimit(async () => true, range)).toEqual({ max: range.high, capped: true }));
  it("needs only a handful of attempts", async () => {
    const { fits, calls } = countingProbe(16000);
    await findLimit(fits, range);
    expect(calls.length).toBeLessThanOrEqual(14);
  });
  it("never asks for a size outside the range", async () => {
    const { fits, calls } = countingProbe(16000);
    await findLimit(fits, range);
    for (const size of calls) {
      expect(size).toBeGreaterThanOrEqual(range.low);
      expect(size).toBeLessThanOrEqual(range.high);
    }
  });
});

describe("metadataSize", () => {
  it("is the size in bytes of the JSON", () => expect(metadataSize({ a: "xyz" })).toBe(JSON.stringify({ a: "xyz" }).length));
  it("counts multi-byte characters as bytes", () => expect(metadataSize({ a: "é" })).toBe(new TextEncoder().encode('{"a":"é"}').length));
  it("is 2 for an empty object", () => expect(metadataSize({})).toBe(2));
  it("handles missing metadata", () => expect(metadataSize(undefined)).toBe(2));
});

describe("withoutKey", () => {
  it("drops the test key and keeps the rest", () => expect(withoutKey({ a: 1, t: "x" }, "t")).toEqual({ a: 1 }));
  it("handles missing metadata", () => expect(withoutKey(undefined, "t")).toEqual({}));
});

describe("limitSummary", () => {
  const BASE = 4096;
  describe("with a baseline measurement (a 4 KB value stored first)", () => {
    it("is a shared limit when the free space shrinks by about the baseline", () =>
      expect(limitSummary({ usage: 100, max: 16000, capped: false, baselineBytes: BASE, withBaseline: 11900 })).toEqual({ kind: "total", totalBytes: 16100 }));
    it("is a per-value limit when the free space does not change", () =>
      expect(limitSummary({ usage: 100, max: 16000, capped: false, baselineBytes: BASE, withBaseline: 16000 })).toEqual({ kind: "perValue", totalBytes: 16100 }));
    it("is unclear when it shrinks by something in between", () =>
      expect(limitSummary({ usage: 100, max: 16000, capped: false, baselineBytes: BASE, withBaseline: 14000 }).kind).toBe("other"));
    it("tolerates the measurement resolution", () =>
      expect(limitSummary({ usage: 0, max: 16128, capped: false, baselineBytes: BASE, withBaseline: 12032 }).kind).toBe("total"));
  });
  describe("without a baseline", () => {
    it("recognizes a limit shared by the whole object when usage + free space is about 16 kB", () =>
      expect(limitSummary({ usage: 3000, max: 13000, capped: false })).toEqual({ kind: "total", totalBytes: 16000 }));
    it("is unclear when it does not add up to 16 kB", () => expect(limitSummary({ usage: 12000, max: 16000, capped: false }).kind).toBe("other"));
  });
  it("no limit found up to the top of the range", () => expect(limitSummary({ usage: 100, max: 262144, capped: true }).kind).toBe("none"));
  it("nothing fits", () => expect(limitSummary({ usage: 0, max: 0, capped: false }).kind).toBe("blocked"));
});

describe("formatKb", () => {
  it.each([[0, "0 KB"], [1024, "1 KB"], [16384, "16 KB"], [1536, "1.5 KB"], [13172, "12.9 KB"]])("%i -> %s", (bytes, text) => expect(formatKb(bytes)).toBe(text));
});
