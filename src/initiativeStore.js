import { ref } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { INITIATIVE_KEY, TURN_KEY, readEntries, sortEntries, nextTurn, previousTurn, tokensLinkedTo, withoutInitiative } from "./initiative.js";

const NO_TURN = Object.freeze({ current: null, round: 0 });

export const entries = ref([]);
export const turn = ref({ ...NO_TURN });
export const sceneReady = ref(false);

const readTurn = (metadata) => ({ ...NO_TURN, ...(metadata?.[TURN_KEY] ?? {}) });

async function refresh() {
  entries.value = sortEntries(readEntries(await OBR.scene.items.getItems()));
  turn.value = readTurn(await OBR.scene.getMetadata());
}

export function initInitiative() {
  if (!OBR.isAvailable) return;
  OBR.onReady(async () => {
    OBR.scene.items.onChange((items) => (entries.value = sortEntries(readEntries(items))));
    OBR.scene.onMetadataChange((metadata) => (turn.value = readTurn(metadata)));
    OBR.scene.onReadyChange(async (ready) => {
      sceneReady.value = ready;
      if (ready) await refresh();
    });
    sceneReady.value = await OBR.scene.isReady();
    if (sceneReady.value) await refresh();
  });
}

export const setInitiative = (tokenIds, value, bonus) =>
  OBR.scene.items.updateItems(tokenIds, (tokens) => tokens.forEach((token) => (token.metadata[INITIATIVE_KEY] = { value, bonus })));

export const removeInitiative = (tokenIds) =>
  OBR.scene.items.updateItems(tokenIds, (tokens) => tokens.forEach((token) => (token.metadata = withoutInitiative(token.metadata))));

export async function clearInitiative() {
  await removeInitiative(entries.value.map((entry) => entry.id));
  await OBR.scene.setMetadata({ [TURN_KEY]: { ...NO_TURN } });
}

export const advanceTurn = () =>
  OBR.scene.setMetadata({ [TURN_KEY]: nextTurn(entries.value, turn.value.current, turn.value.round) });

export const retreatTurn = () =>
  OBR.scene.setMetadata({ [TURN_KEY]: previousTurn(entries.value, turn.value.current, turn.value.round) });

// The clicked token, or every token on the scene linked to that sheet.
export async function initiativeTokens(sheetId, tokenId) {
  return tokenId ? [tokenId] : tokensLinkedTo(await OBR.scene.items.getItems(), sheetId);
}
