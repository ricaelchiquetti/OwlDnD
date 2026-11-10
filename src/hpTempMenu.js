import OBR from "@owlbear-rodeo/sdk";
import { SHEET_TOKEN_KEY } from "./journal.js";

const TEMP_MENU_ID = "owldnd/hp-temp";
const TEMP_EMBED_HEIGHT = 48;
let shown = false;

// Menu entries can't depend on sheet data, so the "HP temp" row is created when the selected token has temporary hit points
// and removed when it has none.
export async function setTempMenu(visible) {
  if (visible === shown) return;
  shown = visible;
  if (!visible) return OBR.contextMenu.remove(TEMP_MENU_ID);
  return OBR.contextMenu.create({
    id: TEMP_MENU_ID,
    icons: [{ icon: "/sheet-icon.svg", label: "HP temp", filter: { max: 1, every: [{ key: ["metadata", SHEET_TOKEN_KEY], value: undefined, operator: "!=" }] } }],
    embed: { url: "/hp.html?kind=temp", height: TEMP_EMBED_HEIGHT },
  });
}
