import { ref } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { popoverId, showSheet, otherSlot, HEADER_HEIGHT } from "./itemModal.js";

const MIN_WIDTH = 360;
const MIN_HEIGHT = 240;

const params = new URLSearchParams(location.search);
const number = (key, fallback) => Number(params.get(key)) || fallback;

export const itemId = params.get("id");
// Set when the sheet was opened from a token on the scene (context menu), so initiative targets that token.
export const tokenId = params.get("token");
const slot = params.get("slot") === "b" ? "b" : "a";
const box = { left: number("l", 60), top: number("t", 60), width: number("w", 960), height: number("h", 700) };
const ownId = popoverId(itemId, slot);

export const minimized = ref(params.get("m") === "1");

// box.height always holds the expanded height, so restoring is exact
export async function toggleMinimize() {
  minimized.value = !minimized.value;
  await OBR.popover.setHeight(ownId, minimized.value ? HEADER_HEIGHT : box.height);
}

export const closeFrame = () => OBR.popover.close(ownId);

// Pointer capture keeps events flowing while the cursor leaves the iframe.
function track(event, onMove, onEnd) {
  const target = event.currentTarget;
  const start = { x: event.clientX, y: event.clientY };
  target.setPointerCapture(event.pointerId);
  const move = (e) => onMove?.(e.clientX - start.x, e.clientY - start.y);
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", (e) => {
    target.removeEventListener("pointermove", move);
    onEnd?.(e.clientX - start.x, e.clientY - start.y);
  }, { once: true });
}

export function startResize(event) {
  const origin = { width: box.width, height: box.height };
  let pending = false;
  track(event, async (dx, dy) => {
    box.width = Math.max(MIN_WIDTH, origin.width + dx);
    box.height = Math.max(MIN_HEIGHT, origin.height + dy);
    if (pending) return;
    pending = true;
    await Promise.all([OBR.popover.setWidth(ownId, box.width), OBR.popover.setHeight(ownId, box.height)]);
    pending = false;
  });
}

export function startMove(event) {
  track(event, null, async (dx, dy) => {
    if (!dx && !dy) return;
    const next = { ...box, left: Math.max(0, box.left + dx), top: Math.max(0, box.top + dy) };
    await showSheet(itemId, otherSlot(slot), next, minimized.value, tokenId);
    await closeFrame();
  });
}
