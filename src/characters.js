import OBR from "@owlbear-rodeo/sdk";
import { items, user, saveItems, saveSheet } from "./store.js";
import { Kind, createItem } from "./journal.js";
import { createSheet } from "./sheet.js";
import { createNpcSheet } from "./npc.js";

// Asset picker -> journal entry + empty sheet. Tokens are linked later via the token context menu.
async function createFromAssets(kind, assetType, titlePrefix, newSheet) {
  const downloads = await OBR.assets.downloadImages(false, undefined, assetType);
  if (!downloads.length) return;
  const created = downloads.map((d) => ({ ...createItem(kind, items.value, user.value.id, titlePrefix), title: d.name, image: d.image.url }));
  await saveItems([...items.value, ...created]);
  await Promise.all(created.map((c) => saveSheet(c.id, newSheet())));
}

export const createCharacters = (titlePrefix) => createFromAssets(Kind.CHARACTER, "CHARACTER", titlePrefix, createSheet);
export const createNpcs = (titlePrefix) => createFromAssets(Kind.NPC, "CHARACTER", titlePrefix, createNpcSheet);
