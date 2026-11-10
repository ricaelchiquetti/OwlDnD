import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { init } from "./store.js";
import { initTheme } from "./themeHost.js";

initTheme();
init();
createApp(App).mount("#app");
