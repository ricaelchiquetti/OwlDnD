import { watchEffect } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { theme, store, THEME_STORAGE_KEY } from "./theme.js";

const isTheme = (value) => value === "dark" || value === "light";

// Call once per page entry: applies the theme to <html>, keeps pages in sync and follows Owlbear by default.
export function initTheme() {
  watchEffect(() => (document.documentElement.dataset.theme = theme.value));
  addEventListener("storage", (e) => e.key === THEME_STORAGE_KEY && isTheme(e.newValue) && (theme.value = e.newValue));
  if (!OBR.isAvailable) return;
  OBR.onReady(async () => {
    store.followHost((await OBR.theme.getTheme()).mode.toLowerCase());
    OBR.theme.onChange((t) => store.followHost(t.mode.toLowerCase()));
  });
}
