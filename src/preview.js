import { createApp, h } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import Settings from "./views/Settings.vue";
import { connected, user } from "./store.js";

document.documentElement.dataset.theme = "dark";
const mk = (allowed) => { let data = {}; return { get: async () => structuredClone(data), set: async (u) => { if (!allowed) return; for (const [k, v] of Object.entries(u)) v === undefined ? delete data[k] : (data[k] = v); } }; };
const roomA = mk(true), sceneA = mk(false), tokenA = mk(true);   // a player: the scene refuses writes
OBR.room.getMetadata = roomA.get; OBR.room.setMetadata = roomA.set;
OBR.scene.getMetadata = sceneA.get; OBR.scene.setMetadata = sceneA.set;
OBR.scene.isReady = async () => true;
OBR.scene.items.getItems = async () => [{ id: "t1", metadata: await tokenA.get() }];
OBR.scene.items.updateItems = async (ids, fn) => { const cur = await tokenA.get(); const t = { metadata: structuredClone(cur) }; fn([t]); const u = {}; for (const k of new Set([...Object.keys(cur), ...Object.keys(t.metadata)])) u[k] = t.metadata[k]; await tokenA.set(u); };

connected.value = true;
user.value = { id: "p", role: "PLAYER", name: "Jogador" };
createApp({ render: () => h("div", { class: "frame" }, [h("main", { style: "max-width:420px" }, [h(Settings)])]) }).mount("#app");
setTimeout(() => { document.querySelector(".diagnostics").open = true; document.querySelectorAll(".diagnostics button")[1].click(); }, 300);
