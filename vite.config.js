import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/OwlDnD/" : "/",
  plugins: [vue()],
  build: { rollupOptions: { input: { main: "index.html", modal: "modal.html", background: "background.html", link: "link.html", tracker: "tracker.html", hp: "hp.html", hpEdit: "hp-edit.html" } } },
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
}));
