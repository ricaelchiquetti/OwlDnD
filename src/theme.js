import { ref } from "vue";

export const Theme = Object.freeze({ DARK: "dark", LIGHT: "light" });
const STORAGE_KEY = "owldnd.theme";
const isTheme = (value) => Object.values(Theme).includes(value);

export function createThemeStore(storage) {
  const saved = storage.getItem(STORAGE_KEY);
  const mode = ref(isTheme(saved) ? saved : Theme.DARK);
  return {
    mode,
    setTheme(next) {
      if (!isTheme(next)) return;
      mode.value = next;
      storage.setItem(STORAGE_KEY, next);
    },
    // Until the user picks a theme, mirror the Owlbear one (not persisted).
    followHost(hostMode) {
      if (!isTheme(storage.getItem(STORAGE_KEY)) && isTheme(hostMode)) mode.value = hostMode;
    },
  };
}

export const store = createThemeStore(globalThis.localStorage ?? { getItem: () => null, setItem() {} });
export const { mode: theme, setTheme } = store;
export const THEME_STORAGE_KEY = STORAGE_KEY;
