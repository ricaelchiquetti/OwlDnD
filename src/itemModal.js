import OBR from "@owlbear-rodeo/sdk";

const DEFAULT_BOX = { left: 60, top: 60, width: 960, height: 700 };
const OTHER_SLOT = { a: "b", b: "a" };
export const HEADER_HEIGHT = 36;

export const popoverId = (itemId, slot) => `owldnd/item/${itemId}/${slot}`;

// Moving = open the same sheet in the other slot at the new spot, then close the old one (the API can't move a popover).
export function showSheet(itemId, slot, box, minimized = false, tokenId = null) {
  const height = minimized ? HEADER_HEIGHT : box.height;
  const query = new URLSearchParams({ id: itemId, slot, l: box.left, t: box.top, w: box.width, h: box.height, m: minimized ? 1 : 0 });
  if (tokenId) query.set("token", tokenId);
  return OBR.popover.open({
    id: popoverId(itemId, slot),
    url: `/modal.html?${query}`,
    width: box.width,
    height,
    hidePaper: true,
    anchorReference: "POSITION",
    anchorPosition: { left: box.left, top: box.top },
    anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
    transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
    disableClickAway: true,
    marginThreshold: 0,
  });
}

export const otherSlot = (slot) => OTHER_SLOT[slot];

const CASCADE_STEP = 28;
const CASCADE_POSITIONS = 8;
let openedCount = 0;

// Closing the other slot first avoids a duplicate when the sheet was moved (and therefore lives in slot "b").
export async function openItem(itemId, tokenId = null) {
  await OBR.popover.close(popoverId(itemId, otherSlot("a")));
  const offset = (openedCount++ % CASCADE_POSITIONS) * CASCADE_STEP;
  await showSheet(itemId, "a", { ...DEFAULT_BOX, left: DEFAULT_BOX.left + offset, top: DEFAULT_BOX.top + offset }, false, tokenId);
}

export const LINK_MODAL_ID = "owldnd/link";
const LINK_WIDTH = 360;
const LINK_HEIGHT = 420;

export const openLink = (tokenId) =>
  OBR.modal.open({ id: LINK_MODAL_ID, url: `/link.html?token=${encodeURIComponent(tokenId)}`, width: LINK_WIDTH, height: LINK_HEIGHT });

export const TRACKER_ID = "owldnd/initiative-tracker";
export const OPEN_TRACKER_CHANNEL = "owldnd/open-tracker";
const TRACKER_WIDTH = 300;
const TRACKER_HEIGHT = 420;
const TRACKER_MARGIN = 16;
const TRACKER_TOP = 72;

// Opens the tracker on THIS client, docked at the top-right of the viewport.
export async function showTracker() {
  const viewportWidth = await OBR.viewport.getWidth();
  return OBR.popover.open({
    id: TRACKER_ID,
    url: "/tracker.html",
    width: TRACKER_WIDTH,
    height: TRACKER_HEIGHT,
    anchorReference: "POSITION",
    anchorPosition: { left: viewportWidth - TRACKER_MARGIN, top: TRACKER_TOP },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    disableClickAway: true,
    marginThreshold: 0,
  });
}

// Opening the tracker opens it for everyone in the room: each client's background page listens for this message.
export const openTrackerForEveryone = () => OBR.broadcast.sendMessage(OPEN_TRACKER_CHANNEL, null, { destination: "ALL" });

export const HP_EDIT_ID = "owldnd/hp-edit";
const HP_EDIT_WIDTH = 180;
const HP_EDIT_HEIGHT = 52;
const HP_EDIT_OFFSET = 6;

// Opens over the clicked bar (a local scene item) at its screen position. The popover can't follow the token, so it is short-lived (closes on click-away).
export async function showHpEdit(barItemId, sheetId, kind) {
  const bounds = await OBR.scene.local.getItemBounds([barItemId]);
  const top = await OBR.viewport.transformPoint({ x: bounds.center.x, y: bounds.min.y });
  return OBR.popover.open({
    id: HP_EDIT_ID,
    url: `/hp-edit.html?sheet=${encodeURIComponent(sheetId)}&kind=${kind}`,
    width: HP_EDIT_WIDTH,
    height: HP_EDIT_HEIGHT,
    anchorReference: "POSITION",
    anchorPosition: { left: top.x, top: top.y - HP_EDIT_OFFSET },
    anchorOrigin: { horizontal: "CENTER", vertical: "TOP" },
    transformOrigin: { horizontal: "CENTER", vertical: "BOTTOM" },
  });
}
