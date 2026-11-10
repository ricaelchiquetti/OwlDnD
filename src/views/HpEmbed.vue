<script setup>
import { computed, onMounted, ref } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { t } from "../i18n.js";
import { items, sheets, user, saveSheet } from "../store.js";
import { SHEET_TOKEN_KEY, isVisible } from "../journal.js";
import { normalizeSheet, setPath } from "../sheet.js";
import { applyHpInput, applyTempInput } from "../hp.js";

const isTemp = new URLSearchParams(location.search).get("kind") === "temp";
const sheetId = ref(null);
const draft = ref("");

// The embed lives inside Owlbear's token menu; it follows whatever is selected.
async function readSelection() {
  const selection = (await OBR.player.getSelection()) ?? [];
  const [token] = selection.length === 1 ? await OBR.scene.items.getItems(selection) : [];
  sheetId.value = token?.metadata?.[SHEET_TOKEN_KEY] ?? null;
}
onMounted(() => OBR.onReady(() => {
  readSelection();
  OBR.player.onChange(readSelection);
}));

const entry = computed(() => items.value.find((i) => i.id === sheetId.value));
const sheet = computed(() => sheets.value[sheetId.value] && normalizeSheet(sheets.value[sheetId.value]));
const combat = computed(() => sheet.value?.combat);
const usable = computed(() => (isTemp ? combat.value?.hpTemp > 0 : combat.value?.hpMax > 0) && entry.value && isVisible(entry.value, user.value));
const placeholder = computed(() => (isTemp ? String(combat.value.hpTemp) : `${combat.value.hpCurrent}/${combat.value.hpMax}${combat.value.hpTemp ? ` (+${combat.value.hpTemp})` : ''}`));

// "-5" damage, "+5" healing, "12" sets the value; damage eats temporary hit points first. The temp row edits only the temporary ones.
function apply(text) {
  const { hpCurrent, hpMax, hpTemp } = combat.value;
  if (isTemp) {
    const temp = applyTempInput(hpTemp, text);
    if (temp === null) return;
    draft.value = "";
    saveSheet(sheetId.value, setPath(sheet.value, "combat.hpTemp", temp));
    return;
  }
  const result = applyHpInput({ current: hpCurrent, max: hpMax, temp: hpTemp }, text);
  if (!result) return;
  draft.value = "";
  saveSheet(sheetId.value, setPath(setPath(sheet.value, "combat.hpCurrent", result.current), "combat.hpTemp", result.temp));
}
</script>

<template>
  <div v-if="usable" class="hp-embed">
    <input v-model="draft" :placeholder="placeholder" :aria-label="isTemp ? t('sheet.hpTemp') : t('sheet.hpCurrent')" @keydown.enter="apply(draft)" />
  </div>
</template>
