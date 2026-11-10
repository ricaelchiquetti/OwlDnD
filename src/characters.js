import OBR from "@owlbear-rodeo/sdk";
import { items, user, saveItems, saveSheet } from "./store.js";
import { Kind, createItem } from "./journal.js";
import { createSheet } from "./sheet.js";

// Asset picker -> journal entry + empty sheet. Tokens are linked later via the token context menu.
export async function createCharacters(titlePrefix) {
  const downloads = await OBR.assets.downloadImages(false, undefined, "CHARACTER");
  if (!downloads.length) return;
  const created = downloads.map((d) => ({ ...createItem(Kind.CHARACTER, items.value, user.value.id, titlePrefix), title: d.name, image: d.image.url }));
  await saveItems([...items.value, ...created]);
  await Promise.all(created.map((c) => saveSheet(c.id, createSheet())));
}
