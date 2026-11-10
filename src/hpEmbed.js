import { createApp } from "vue";
import "./style.css";
import HpEmbed from "./views/HpEmbed.vue";
import { init } from "./store.js";
import { initTheme } from "./themeHost.js";

initTheme();
init();
createApp(HpEmbed).mount("#app");
