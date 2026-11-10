import { describe, it, expect } from "vitest";
import { reactive } from "vue";
import { toPlain } from "./plain.js";
import { createSheet, setPath } from "./sheet.js";

describe("toPlain", () => {
  it("returns a structured-cloneable copy of a reactive object", () => {
    const state = reactive({ items: [{ id: "a", players: ["x"] }] });
    expect(() => structuredClone(state)).toThrow();
    const plain = toPlain(state);
    expect(() => structuredClone(plain)).not.toThrow();
    expect(plain).toEqual({ items: [{ id: "a", players: ["x"] }] });
  });
});

describe("setPath with reactive sheet", () => {
  it("does not throw and returns a cloneable sheet", () => {
    const next = setPath(reactive(createSheet()), "combat.ac", 16);
    expect(next.combat.ac).toBe(16);
    expect(() => structuredClone(next)).not.toThrow();
  });
});
