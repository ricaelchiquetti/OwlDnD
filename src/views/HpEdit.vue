<script setup>
import { computed, onMounted, ref } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { t } from "../i18n.js";
import { sheets, saveSheet } from "../store.js";
import { normalizeSheet, setPath } from "../sheet.js";
import { applyHpInput, applyTempInput } from "../hp.js";
import { HP_EDIT_ID } from "../itemModal.js";

const params = new URLSearchParams(location.search);
const sheetId = params.get("sheet");
const isTemp = params.get("kind") === "temp";
const sheet = computed(() => sheets.value[sheetId] && normalizeSheet(sheets.value[sheetId]));
const combat = computed(() => sheet.value?.combat);
const draft = ref("");
const field = ref(null);

// `autofocus` is ignored inside Owlbear's popover frame, so focus the frame and the field by hand once the popover is on screen.
const FOCUS_DELAY_MS = 50;
onMounted(() =>
  setTimeout(() => {
    window.focus();
    field.value?.focus();
  }, FOCUS_DELAY_MS),
);

const placeholder = computed(() => (isTemp ? `${t("sheet.hpTemp")}: ${combat.value.hpTemp}` : `${combat.value.hpCurrent}/${combat.value.hpMax}`));

// "-5" damage, "+5" healing, "12" sets the value; damage eats temporary hit points first.
function commit() {
  const { hpCurrent, hpMax, hpTemp } = combat.value;
  let next;
  if (isTemp) {
    const temp = applyTempInput(hpTemp, draft.value);
    if (temp === null) return;
    next = setPath(sheet.value, "combat.hpTemp", temp);
  } else {
    const result = applyHpInput({ current: hpCurrent, max: hpMax, temp: hpTemp }, draft.value);
    if (!result) return;
    next = setPath(setPath(sheet.value, "combat.hpCurrent", result.current), "combat.hpTemp", result.temp);
  }
  saveSheet(sheetId, next);
  OBR.popover.close(HP_EDIT_ID);
}
</script>

<template>
  <div v-if="combat" class="hp-edit">
    <input ref="field" v-model="draft" :placeholder="placeholder" :aria-label="placeholder" @keydown.enter="commit" @keydown.esc="OBR.popover.close(HP_EDIT_ID)" />
  </div>
</template>
