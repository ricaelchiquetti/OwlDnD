import { createApp } from "vue";
import "./style.css";
import HpEdit from "./views/HpEdit.vue";
import { init } from "./store.js";
import { initTheme } from "./themeHost.js";

initTheme();
init();
createApp(HpEdit).mount("#app");
