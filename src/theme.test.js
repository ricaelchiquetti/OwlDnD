import { describe, it, expect } from "vitest";
import { Theme, createThemeStore } from "./theme.js";

const memStore = (init = {}) => ({ data: { ...init }, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } });

describe("theme store", () => {
  it("defaults to dark", () => expect(createThemeStore(memStore()).mode.value).toBe(Theme.DARK));
  it("restores the saved choice", () => expect(createThemeStore(memStore({ "owldnd.theme": "light" })).mode.value).toBe(Theme.LIGHT));
  it("ignores an invalid saved value", () => expect(createThemeStore(memStore({ "owldnd.theme": "pink" })).mode.value).toBe(Theme.DARK));
  it("setTheme changes and persists", () => {
    const s = memStore();
    const store = createThemeStore(s);
    store.setTheme(Theme.LIGHT);
    expect(store.mode.value).toBe(Theme.LIGHT);
    expect(s.getItem("owldnd.theme")).toBe("light");
  });
  it("setTheme rejects unknown values", () => {
    const store = createThemeStore(memStore());
    store.setTheme("pink");
    expect(store.mode.value).toBe(Theme.DARK);
  });
  it("follows Owlbear's theme only until the user chooses one", () => {
    const store = createThemeStore(memStore());
    store.followHost("light");
    expect(store.mode.value).toBe(Theme.LIGHT);
    store.setTheme(Theme.DARK);
    store.followHost("light");
    expect(store.mode.value).toBe(Theme.DARK);
  });
});
