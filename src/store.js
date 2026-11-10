import { ref } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { toPlain } from "./plain.js";
import { buildMessage, buildSheetMessage, buildFeatureMessage, chatKey, chatFromMetadata, chatKeysToPrune } from "./chat.js";
import { JOURNAL_KEY, sheetKey, readSheets, removeItem } from "./journal.js";

// The chat used to be kept here, in the browser; it now lives in the scene metadata and this old copy is thrown away.
const OLD_CHAT_STORAGE_KEY = "owldnd.chat";

export const items = ref([]);
export const messages = ref([]);
export const sceneReady = ref(false);
let sceneMetadata = {};

const applySceneMetadata = (metadata) => {
  sceneMetadata = metadata;
  messages.value = chatFromMetadata(metadata);
};
export const sheets = ref({});
export const user = ref({ id: "", role: "PLAYER", name: "" });
export const players = ref([]);
export const connected = ref(false);

const readItems = (metadata) => metadata?.[JOURNAL_KEY]?.items ?? [];

function applyMetadata(metadata) {
  items.value = readItems(metadata);
  sheets.value = readSheets(metadata);
}

// ponytail: last-write-wins on the whole list; per-item keys if concurrent edits collide
export async function saveItems(next) {
  const plain = toPlain(next);
  items.value = plain;
  if (connected.value) await OBR.room.setMetadata({ [JOURNAL_KEY]: { items: plain } });
}

export async function saveSheet(id, sheet) {
  const plain = toPlain(sheet);
  sheets.value = { ...sheets.value, [id]: plain };
  if (connected.value) await OBR.room.setMetadata({ [sheetKey(id)]: plain });
}

// Removes the journal entry and its sheet in a single metadata write.
export async function deleteItem(id) {
  const next = toPlain(removeItem(items.value, id));
  const { [id]: _removed, ...remainingSheets } = sheets.value;
  items.value = next;
  sheets.value = remainingSheets;
  if (connected.value) await OBR.room.setMetadata({ [JOURNAL_KEY]: { items: next }, [sheetKey(id)]: undefined });
}

const newMessageMeta = () => ({ id: crypto.randomUUID().slice(0, 8), time: Date.now(), author: user.value.name || "?", authorId: user.value.id, role: user.value.role });

// One key per message, so two people writing at once never overwrite each other. Going past the limit deletes the oldest.
async function publish(message) {
  const next = { ...sceneMetadata, [chatKey(message.id)]: message };
  const pruned = Object.fromEntries(chatKeysToPrune(next).map((key) => [key, undefined]));
  applySceneMetadata({ ...next, ...pruned });
  await OBR.scene.setMetadata({ [chatKey(message.id)]: message, ...pruned });
}

// The chat belongs to the open scene: without one there is nowhere to write.
async function deliver(message) {
  if (message.error) return message;
  if (!sceneReady.value) return { error: "noScene" };
  await publish(message);
  return { ok: true, message };
}

// Plain text goes to the log as is; "/r 2d6+3" rolls and logs the result.
export const sendChat = (text) => deliver(buildMessage(text, newMessageMeta(), Math.random));

// A roll that comes from the sheet (ability, save, skill, attack, damage, initiative): one card in the chat.
export const sendSheetRoll = (spec) => deliver(buildSheetMessage(spec, newMessageMeta(), Math.random));

// A feature printed from the sheet (name, origin and description) as a card in the chat.
export const sendFeature = (spec) => deliver(buildFeatureMessage(spec, newMessageMeta()));

async function syncScene(ready) {
  sceneReady.value = ready;
  applySceneMetadata(ready ? await OBR.scene.getMetadata() : {});
}

export function init() {
  if (!OBR.isAvailable) return;
  OBR.onReady(async () => {
    connected.value = true;
    const [id, role, name, metadata] = await Promise.all([OBR.player.getId(), OBR.player.getRole(), OBR.player.getName(), OBR.room.getMetadata()]);
    applyMetadata(metadata);
    user.value = { id, role, name };
    players.value = await OBR.party.getPlayers();
    OBR.room.onMetadataChange(applyMetadata);
    globalThis.localStorage?.removeItem(OLD_CHAT_STORAGE_KEY);
    await syncScene(await OBR.scene.isReady());
    OBR.scene.onReadyChange(syncScene);
    OBR.scene.onMetadataChange(applySceneMetadata);
    OBR.party.onChange((p) => (players.value = p));
  });
}
