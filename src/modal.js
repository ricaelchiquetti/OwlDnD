import { createApp } from "vue";
import "./style.css";
import ItemModal from "./views/ItemModal.vue";
import { init } from "./store.js";
import { initTheme } from "./themeHost.js";

// The popover opens with hidePaper, so the page paints its own (themed) background; html is transparent.
document.documentElement.classList.add("frame-page");
initTheme();
init();
createApp(ItemModal).mount("#app");
