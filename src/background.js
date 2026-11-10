import OBR from "@owlbear-rodeo/sdk";
import { SHEET_TOKEN_KEY } from "./journal.js";
import { INITIATIVE_KEY } from "./initiative.js";
import { openItem, openLink, showTracker, openTrackerForEveryone, OPEN_TRACKER_CHANNEL } from "./itemModal.js";
import { setInitiative, removeInitiative } from "./initiativeStore.js";
import { watchHpOverlay } from "./hpOverlay.js";
import { legacyChatKeys } from "./chat.js";

const ICON = "/sheet-icon.svg";
const INITIATIVE_ICON = "/initiative-icon.svg";
// Added from the context menu with no roll: the value starts at 0 and the GM edits it. Only the sheet click rolls.
const UNROLLED_INITIATIVE = 0;
const HP_EMBED_HEIGHT = 48;
const isCharacterToken = { key: "layer", value: "CHARACTER" };
const hasInitiative = { key: ["metadata", INITIATIVE_KEY], value: undefined, operator: "!=" };
const noInitiative = { key: ["metadata", INITIATIVE_KEY], value: undefined };
const isLinked = { key: ["metadata", SHEET_TOKEN_KEY], value: undefined, operator: "!=" };

OBR.onReady(() => {
  OBR.contextMenu.create({
    id: "owldnd/link-character",
    icons: [{ icon: ICON, label: "Link character", filter: { max: 1, every: [isCharacterToken] } }],
    onClick: ({ items }) => openLink(items[0].id),
  });
  OBR.contextMenu.create({
    id: "owldnd/open-sheet",
    icons: [{ icon: ICON, label: "Open sheet", filter: { max: 1, every: [isCharacterToken, isLinked] } }],
    onClick: ({ items }) => openItem(items[0].metadata[SHEET_TOKEN_KEY], items[0].id),
  });
  // Embedded in the token menu (below the token): a box that accepts -5 / +5 / 12.
  OBR.contextMenu.create({
    id: "owldnd/hp",
    icons: [{ icon: ICON, label: "HP", filter: { max: 1, every: [isLinked] } }],
    embed: { url: "/hp.html", height: HP_EMBED_HEIGHT },
  });
  OBR.contextMenu.create({
    id: "owldnd/add-initiative",
    icons: [{ icon: ICON, label: "Add to initiative", filter: { every: [isCharacterToken, noInitiative] } }],
    onClick: ({ items }) =>
      setInitiative(items.map((item) => item.id), UNROLLED_INITIATIVE, 0).catch((error) => OBR.notification.show(`Could not add to initiative: ${error.message}`, "ERROR")),
  });
  OBR.contextMenu.create({
    id: "owldnd/remove-initiative",
    icons: [{ icon: ICON, label: "Remove from initiative", filter: { every: [isCharacterToken, hasInitiative] } }],
    onClick: ({ items }) => removeInitiative(items.map((item) => item.id)),
  });
  // Left toolbar button. Returning false keeps it from becoming the active tool, so it behaves as a plain button.
  OBR.tool.create({
    id: "owldnd/initiative-tool",
    icons: [{ icon: INITIATIVE_ICON, label: "Initiative" }],
    onClick: () => {
      openTrackerForEveryone();
      return false;
    },
  });
  // The hit point bar over the selected, linked token is drawn as local scene items.
  watchHpOverlay();
  OBR.broadcast.onMessage(OPEN_TRACKER_CHANNEL, showTracker);
  removeLegacyChat();
});

// The chat used to live in the room metadata, whose 16 kB limit it blew past. The GM clears the old keys once.
async function removeLegacyChat() {
  if ((await OBR.player.getRole()) !== "GM") return;
  const keys = legacyChatKeys(await OBR.room.getMetadata());
  if (keys.length) await OBR.room.setMetadata(Object.fromEntries(keys.map((key) => [key, undefined])));
}
