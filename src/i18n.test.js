import { describe, it, expect } from "vitest";
import { createI18n } from "./i18n.js";

const memStore = (init = {}) => ({ data: { ...init }, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } });

describe("i18n (CA3)", () => {
  it("defaults to English", () => expect(createI18n(memStore()).t("tab.chat")).toBe("Chat"));
  it("switching to pt-BR translates and persists", () => {
    const s = memStore();
    const i = createI18n(s);
    i.setLocale("pt-BR");
    expect(i.t("tab.settings")).toBe("Configurações");
    expect(s.getItem("owldnd.locale")).toBe("pt-BR");
  });
  it("restores saved locale", () => expect(createI18n(memStore({ "owldnd.locale": "pt-BR" })).locale.value).toBe("pt-BR"));
  it("ignores unknown saved locale", () => expect(createI18n(memStore({ "owldnd.locale": "xx" })).locale.value).toBe("en"));
  it("falls back to key when missing", () => expect(createI18n(memStore()).t("nope")).toBe("nope"));
});

import { messages } from "./i18n.js";
import { SKILLS, Ability } from "./sheet.js";

describe("translations", () => {
  it("en and pt-BR define the same keys", () => expect(Object.keys(messages["pt-BR"]).sort()).toEqual(Object.keys(messages.en).sort()));
  it("every skill and ability has a label", () => {
    for (const skill of Object.keys(SKILLS)) expect(messages.en[`skill.${skill}`]).toBeTruthy();
    for (const ability of Object.values(Ability)) expect(messages.en[`ability.${ability}`]).toBeTruthy();
  });
});
