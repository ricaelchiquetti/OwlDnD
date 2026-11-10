import { createApp } from "vue";
import "./style.css";
import LinkModal from "./views/LinkModal.vue";
import { init } from "./store.js";
import { initTheme } from "./themeHost.js";

initTheme();
init();
createApp(LinkModal).mount("#app");
