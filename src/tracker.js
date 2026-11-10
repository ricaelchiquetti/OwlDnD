import { createApp } from "vue";
import "./style.css";
import TrackerPopover from "./views/TrackerPopover.vue";
import { init } from "./store.js";
import { initTheme } from "./themeHost.js";
import { initInitiative } from "./initiativeStore.js";

initTheme();
init();
initInitiative();
createApp(TrackerPopover).mount("#app");
