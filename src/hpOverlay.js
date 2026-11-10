import OBR, { buildCurve, buildText } from "@owlbear-rodeo/sdk";
import { JOURNAL_KEY, SHEET_TOKEN_KEY, readSheets, isVisible } from "./journal.js";
import { normalizeSheet, armorClass } from "./sheet.js";
import { hpBarModel, pillPoints, shieldPoints } from "./hp.js";
import { showHpEdit } from "./itemModal.js";
import { setTempMenu } from "./hpTempMenu.js";

const OVERLAY_KEY = "owldnd/hp-overlay";
const BAR_KEY = "owldnd/hp-bar"; // value: { tokenId, kind } on the two clickable bar backgrounds
const Bar = Object.freeze({ HP: "hp", TEMP: "temp" });
const BAR_HEIGHT_RATIO = 0.14;
const TEMP_HEIGHT_RATIO = 0.7;
const GAP_RATIO = 0.04; // between bars
const TOKEN_GAP_RATIO = 0.18; // between the lowest bar and the token
const SHIELD_HEIGHT_RATIO = 2.6; // of the bar height
const SHIELD_ASPECT = 48 / 55.08;
const SHIELD = { fill: "#ffffff", border: "#231f20" };
const TRACK = { fill: "#4a5a4c", opacity: 0.6, border: "#2b3a2d" };
const FILL_COLOR = { hp: "#55c26b", temp: "#4a95dd" };

// Attached to the token so it follows moves; position/size come from the bounds, so scale and rotation are not inherited.
const attached = (builder, tokenId) =>
  builder.attachedTo(tokenId).layer("ATTACHMENT").locked(true).disableHit(true).disableAutoZIndex(true).disableAttachmentBehavior(["SCALE", "ROTATION"]).metadata({ [OVERLAY_KEY]: true });

// `bar` makes the pill clickable: Owlbear has no click events on scene items, so a click shows up as the pill being SELECTED
// (hold Ctrl to select a locked item); see handleBarClick. Everything else stays click-through.
const pill = (tokenId, box, color, opacity, stroke, bar) => {
  const builder = attached(buildCurve(), tokenId).points(pillPoints(box)).closed(true).tension(0).fillColor(color).fillOpacity(opacity).strokeColor(stroke ?? color).strokeWidth(stroke ? box.height * 0.08 : 0);
  return (bar ? builder.disableHit(false).metadata({ [OVERLAY_KEY]: true, [BAR_KEY]: { tokenId, kind: bar } }) : builder).build();
};

const label = (tokenId, box, text, { fill = "#ffffff", stroke = "#000000" } = {}) =>
  attached(buildText(), tokenId).position({ x: box.x, y: box.y }).width(box.width).height(box.height).plainText(text).textType("PLAIN")
    .textAlign("CENTER").textAlignVertical("MIDDLE").fontWeight(800).fontSize(box.height * 0.85).padding(0)
    .fillColor(fill).strokeColor(stroke).strokeWidth(box.height * 0.06).build();

// The sheet's AC shield with the armor class, to the left of the hit point bar and centred on it.
function shieldItems(tokenId, hpBox, gap, ac) {
  const height = hpBox.height * SHIELD_HEIGHT_RATIO;
  const box = { x: hpBox.x - gap - height * SHIELD_ASPECT, y: hpBox.y + (hpBox.height - height) / 2, width: height * SHIELD_ASPECT, height };
  const outline = attached(buildCurve(), tokenId).points(shieldPoints(box)).closed(true).tension(0).fillColor(SHIELD.fill).fillOpacity(1).strokeColor(SHIELD.border).strokeWidth(height * 0.05).build();
  const numberBox = { ...box, y: box.y + height * 0.2, height: height * 0.45 };
  return [outline, label(tokenId, numberBox, String(ac), { fill: SHIELD.border, stroke: SHIELD.fill })];
}

function barItems(tokenId, bounds, model) {
  const height = bounds.width * BAR_HEIGHT_RATIO;
  const tempHeight = height * TEMP_HEIGHT_RATIO;
  const gap = bounds.width * GAP_RATIO;
  const tempRow = model.temp > 0 ? tempHeight + gap : 0;
  const hpBox = { x: bounds.min.x, y: bounds.min.y - bounds.width * TOKEN_GAP_RATIO - tempRow - height, width: bounds.width, height };
  const items = [...shieldItems(tokenId, hpBox, gap, model.ac), pill(tokenId, hpBox, TRACK.fill, TRACK.opacity, TRACK.border, Bar.HP)];
  if (model.fraction > 0) items.push(pill(tokenId, { ...hpBox, width: Math.max(height, hpBox.width * model.fraction) }, FILL_COLOR.hp, 1));
  items.push(label(tokenId, hpBox, model.label));
  if (model.temp > 0) {
    const tempBox = { x: bounds.min.x, y: hpBox.y + height + gap, width: bounds.width, height: tempHeight };
    items.push(pill(tokenId, tempBox, FILL_COLOR.temp, 1, TRACK.border, Bar.TEMP), label(tokenId, tempBox, String(model.temp)));
  }
  return items;
}

// Auto z-index is off (the pieces are added at once, so its order is arbitrary): stack them in drawing order, above whatever is already there.
const stacked = (items) => {
  const base = Date.now();
  return items.map((item, index) => ({ ...item, zIndex: base + index }));
};

async function clear() {
  const old = await OBR.scene.local.getItems((item) => item.metadata[OVERLAY_KEY]);
  if (old.length) await OBR.scene.local.deleteItems(old.map((item) => item.id));
}

// The token's bar model, or null when it has no linked sheet, no maximum, or the player can't see the sheet.
async function modelFor(token) {
  const sheetId = token?.metadata?.[SHEET_TOKEN_KEY];
  if (!sheetId) return null;
  const [metadata, id, role] = await Promise.all([OBR.room.getMetadata(), OBR.player.getId(), OBR.player.getRole()]);
  const entry = (metadata[JOURNAL_KEY]?.items ?? []).find((i) => i.id === sheetId);
  const sheet = readSheets(metadata)[sheetId];
  if (!entry || !sheet || !isVisible(entry, { id, role })) return null;
  const normalized = normalizeSheet(sheet);
  const model = hpBarModel(normalized.combat);
  return model && { ...model, ac: armorClass(normalized) };
}

let latest = 0;

// The clicked bar, i.e. the clickable pill that is currently selected.
async function pressedBar(selection) {
  if (!selection.length) return null;
  const [pill] = await OBR.scene.local.getItems((item) => selection.includes(item.id) && item.metadata[BAR_KEY]);
  return pill ? { ...pill.metadata[BAR_KEY], pillId: pill.id } : null;
}

// A click on a bar: give the selection back to the token and open the box where the new value is typed, over the bar.
async function handleBarClick({ tokenId, kind, pillId }) {
  await OBR.player.select([tokenId]);
  const [token] = await OBR.scene.items.getItems([tokenId]);
  const sheetId = token?.metadata?.[SHEET_TOKEN_KEY];
  if (sheetId) await showHpEdit(pillId, sheetId, kind);
}

// Redraws the bar for the current selection: one linked token shows it, anything else clears it.
export async function refreshHpOverlay() {
  const run = ++latest;
  const selection = (await OBR.player.getSelection()) ?? [];
  const pressed = await pressedBar(selection);
  if (pressed) return handleBarClick(pressed);
  const [token] = selection.length === 1 ? await OBR.scene.items.getItems(selection) : [];
  const model = await modelFor(token);
  const bounds = model && (await OBR.scene.items.getItemBounds([token.id]));
  if (run !== latest) return;
  await setTempMenu(model?.temp > 0);
  await clear();
  if (model) await OBR.scene.local.addItems(stacked(barItems(token.id, bounds, model)));
}

export function watchHpOverlay() {
  const refresh = () => refreshHpOverlay().catch(() => {});
  OBR.player.onChange(refresh);
  OBR.room.onMetadataChange(refresh);
  OBR.scene.items.onChange(refresh);
  OBR.scene.onReadyChange((ready) => ready && refresh());
  refresh();
}
