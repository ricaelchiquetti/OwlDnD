<script setup>
import { computed, ref, watch } from "vue";
import { t } from "../i18n.js";
import { items, sheets, user, saveSheet, saveItems } from "../store.js";
import { Kind, isVisible, canChangeVisibility } from "../journal.js";
import { normalizeSheet, setPath } from "../sheet.js";
import { normalizeNpc, setNpcPath, npcModifier } from "../npc.js";
import OBR from "@owlbear-rodeo/sdk";
import { initiativeTokens, setInitiative } from "../initiativeStore.js";
import { sendSheetRoll, sendFeature } from "../store.js";
import { summarizeSheetMessage } from "../chat.js";
import { openTrackerForEveryone } from "../itemModal.js";
import { initiative } from "../sheet.js";
import { itemId, tokenId, closeFrame, startMove, startResize, minimized, toggleMinimize } from "../popoverFrame.js";
import SheetTab from "./SheetTab.vue";
import NpcSheet from "./NpcSheet.vue";
import BioTab from "./BioTab.vue";
import SpellsTab from "./SpellsTab.vue";
import ItemSettings from "./ItemSettings.vue";
import CharacterOptions from "./CharacterOptions.vue";

const TABS = { SHEET: "sheet", BIO: "bio", SPELLS: "spells", SETTINGS: "settings" };
const TAB_KEY = `owldnd.tab.${itemId}`;

const item = computed(() => items.value.find((i) => i.id === itemId));
const isCharacter = computed(() => item.value?.kind === Kind.CHARACTER);
const isNpc = computed(() => item.value?.kind === Kind.NPC);
const hasSheet = computed(() => isCharacter.value || isNpc.value);
const sheet = computed(() => {
  const saved = sheets.value[itemId];
  if (!saved) return null;
  return isNpc.value ? normalizeNpc(saved) : normalizeSheet(saved);
});
const editable = computed(() => canChangeVisibility(item.value, user.value));
const tabs = computed(() => {
  if (isCharacter.value) return Object.values(TABS);
  return isNpc.value ? [TABS.SHEET, TABS.SETTINGS] : [TABS.SETTINGS];
});

// sessionStorage survives the page reload that happens when the popover is moved
const stored = sessionStorage.getItem(TAB_KEY);
const activeTab = ref(Object.values(TABS).includes(stored) ? stored : TABS.SHEET);
watch(activeTab, (tab) => sessionStorage.setItem(TAB_KEY, tab));
const shownTab = computed(() => (tabs.value.includes(activeTab.value) ? activeTab.value : tabs.value[0]));
const TAB_LABELS = { [TABS.SHEET]: "sheetTab.sheet", [TABS.BIO]: "sheetTab.bio", [TABS.SPELLS]: "sheetTab.spells", [TABS.SETTINGS]: "tab.settings" };
const tabLabel = (tab) => t(TAB_LABELS[tab]);

// closes if the item is deleted or stops being visible to this user
// items are set before user in store.init, so "missing" is only trusted once the user is known
watch([item, user], ([i, u]) => u.id && (!i || !isVisible(i, u)) && closeFrame());

// Rolls into the chat and gives the roller a toast too, so the result is visible even when the chat is closed.
async function announce(spec) {
  const result = await sendSheetRoll({ ...spec, character: item.value.title });
  if (result.error) {
    OBR.notification.show(t(`chat.${result.error}`), "ERROR");
    return null;
  }
  OBR.notification.show(summarizeSheetMessage(result.message));
  return result.message;
}

const failed = (error) => OBR.notification.show(`${t("initiative.failed")}: ${error.message}`, "ERROR");

async function rollFromSheet(spec) {
  try {
    await announce(spec);
  } catch (error) {
    failed(error);
  }
}

async function printFeature(feature) {
  try {
    const result = await sendFeature({ ...feature, character: item.value.title });
    OBR.notification.show(result.error ? t(`chat.${result.error}`) : t("chat.featureSent"), result.error ? "WARNING" : "DEFAULT");
  } catch (error) {
    failed(error);
  }
}

// One d20 serves both: it is the chat card and the value that goes into the initiative order.
async function rollInitiative(mode) {
  try {
    const tokens = await initiativeTokens(itemId, tokenId);
    if (!tokens.length) return OBR.notification.show(t("initiative.noToken"), "WARNING");
    const bonus = isNpc.value ? npcModifier(sheet.value.abilities.dex) : initiative(sheet.value);
    const message = await announce({ label: t("sheet.initiative"), modifier: bonus, mode });
    if (!message) return;
    await setInitiative(tokens, message.check.total, bonus);
    await openTrackerForEveryone();
  } catch (error) {
    failed(error);
  }
}
const updateSheet = (path, value) => saveSheet(itemId, (isNpc.value ? setNpcPath : setPath)(sheet.value, path, value));
const rename = (title) => title.trim() && saveItems(items.value.map((i) => (i.id === itemId ? { ...i, title: title.trim() } : i)));
</script>

<template>
  <div v-if="item" class="frame" :class="{ minimized }">
    <header @pointerdown="startMove">
      <strong>{{ item.title }}</strong>
      <span>
        <button type="button" :aria-label="minimized ? 'Restore' : 'Minimize'" @pointerdown.stop @click="toggleMinimize">{{ minimized ? "▢" : "–" }}</button>
        <button type="button" aria-label="Close" @pointerdown.stop @click="closeFrame">×</button>
      </span>
    </header>
    <nav v-show="!minimized && tabs.length > 1" class="sheet-tabs">
      <button v-for="tab in tabs" :key="tab" type="button" :class="{ active: shownTab === tab }" @click="activeTab = tab">{{ tabLabel(tab) }}</button>
    </nav>
    <main v-show="!minimized">
      <SheetTab v-if="isCharacter && sheet && shownTab === TABS.SHEET" :sheet="sheet" :name="item.title" :editable="editable" @update="updateSheet" @roll-initiative="rollInitiative" @roll="rollFromSheet" @print-feature="printFeature" />
      <BioTab v-else-if="isCharacter && sheet && shownTab === TABS.BIO" :sheet="sheet" :name="item.title" :editable="editable" @update="updateSheet" />
      <SpellsTab v-else-if="isCharacter && sheet && shownTab === TABS.SPELLS" :sheet="sheet" :name="item.title" :editable="editable" @update="updateSheet" @roll="rollFromSheet" @print-feature="printFeature" />
      <NpcSheet v-else-if="isNpc && sheet && shownTab === TABS.SHEET" :npc="sheet" :name="item.title" :editable="editable" @update="updateSheet" @rename="rename" @roll-initiative="rollInitiative" @roll="rollFromSheet" @print-feature="printFeature" />
      <div v-else>
        <CharacterOptions v-if="isCharacter && sheet && editable" :sheet="sheet" @update="updateSheet" />
        <ItemSettings :item="item" @deleted="closeFrame" />
      </div>
    </main>
    <div v-show="!minimized" class="grip" @pointerdown.stop="startResize" />
  </div>
</template>
