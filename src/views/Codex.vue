<script setup>
import { ref, computed, watch } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { t } from "../i18n.js";
import { items, sheets, user, connected, saveSheet } from "../store.js";
import { Kind, canChangeVisibility } from "../journal.js";
import { DEFAULT_BASE_URL, addSpellToSheet, fetchSources, fetchSpells, mergeSource, loadSpells, saveSpells, filterSpells } from "../codex.js";

const MAX_RESULTS = 100;
const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const baseUrl = ref(DEFAULT_BASE_URL);
const sources = ref([]);
const selected = ref([]);
const spells = ref(loadSpells());
const busy = ref(false);
const query = ref("");
const level = ref(null);
const open = ref(null);
const toggle = (entry) => {
  open.value = open.value === entry ? null : entry;
};

const results = computed(() => filterSpells(spells.value, query.value, level.value));
const shown = computed(() => results.value.slice(0, MAX_RESULTS));
const levelLabel = (value) => (value === 0 ? t("spells.cantrip") : String(value));
const components = ({ v, s, m, materials }) => [v && "V", s && "S", m && (materials ? `M (${materials})` : "M")].filter(Boolean).join(", ");

const characters = computed(() => items.value.filter((item) => item.kind === Kind.CHARACTER && canChangeVisibility(item, user.value)));
const targetId = ref("");
watch(characters, (list) => {
  if (!list.some((character) => character.id === targetId.value)) targetId.value = list[0]?.id ?? "";
}, { immediate: true });

async function addToSheet(entry) {
  const id = targetId.value;
  if (!id) return;
  const { sheet, added } = addSpellToSheet(sheets.value[id], entry.level, entry.spell);
  if (added) await saveSheet(id, sheet);
  OBR.notification.show(added ? t("codex.added") : t("codex.alreadyThere"), added ? "SUCCESS" : "WARNING");
}

async function run(task) {
  busy.value = true;
  try {
    await task();
  } catch (e) {
    OBR.notification.show(`${t("codex.error")}: ${e.message}`, "ERROR");
  } finally {
    busy.value = false;
  }
}

const loadSourceList = () => run(async () => {
  sources.value = await fetchSources(baseUrl.value);
  selected.value = [];
});

const importSelected = () => run(async () => {
  const downloaded = await fetchSpells(baseUrl.value, selected.value);
  const merged = selected.value.reduce((list, source) => mergeSource(list, source, downloaded.filter((entry) => entry.source === source)), spells.value);
  saveSpells(merged);
  spells.value = merged;
  OBR.notification.show(`${downloaded.length} ${t("codex.imported")}`, "SUCCESS");
});
</script>

<template>
  <div class="sheet">
    <template v-if="spells.length">
      <div class="grid-2">
        <label>
          {{ t("codex.search") }}
          <input v-model="query" type="search" />
        </label>
        <label>
          {{ t("sheet.level") }}
          <select v-model="level">
            <option :value="null">{{ t("codex.allLevels") }}</option>
            <option v-for="value in LEVELS" :key="value" :value="value">{{ levelLabel(value) }}</option>
          </select>
        </label>
      </div>
      <ul class="items">
        <li v-for="entry in shown" :key="`${entry.source}-${entry.spell.name}`" class="spell-card">
          <button @click="toggle(entry)">
            <strong>{{ entry.spell.name }}</strong>
            <span class="muted">{{ levelLabel(entry.level) }} · {{ entry.source }}</span>
          </button>
          <div v-if="open === entry" class="spell-detail">
            <p class="muted">{{ [entry.spell.school, entry.spell.ritual && t("spells.ritual")].filter(Boolean).join(" · ") }}</p>
            <p><b>{{ t("spells.castingTime") }}:</b> {{ entry.spell.castingTime }}</p>
            <p><b>{{ t("spells.range") }}:</b> {{ entry.spell.range }}</p>
            <p><b>{{ t("spells.components") }}:</b> {{ components(entry.spell) }}</p>
            <p><b>{{ t("spells.duration") }}:</b> {{ entry.spell.concentration ? `${t("spells.concentration")}, ` : "" }}{{ entry.spell.duration }}</p>
            <p class="spell-text">{{ entry.spell.description }}</p>
            <p v-if="entry.spell.higherLevels" class="spell-text">{{ entry.spell.higherLevels }}</p>
            <p v-if="!characters.length" class="muted">{{ t("codex.noCharacters") }}</p>
            <div v-else class="grid-2">
              <select v-model="targetId" :aria-label="t('codex.addTo')">
                <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.title }}</option>
              </select>
              <button type="button" :disabled="!connected" @click="addToSheet(entry)">{{ t("codex.add") }}</button>
            </div>
          </div>
        </li>
      </ul>
      <p v-if="results.length > MAX_RESULTS" class="muted">{{ t("codex.limit") }}</p>
    </template>
    <p v-else class="muted">{{ t("codex.empty") }}</p>
  </div>

  <details class="diagnostics" :open="!spells.length">
    <summary>{{ t("codex.import") }}</summary>
    <div class="sheet">
      <label>
        {{ t("codex.url") }}
        <input v-model="baseUrl" type="url" spellcheck="false" :placeholder="DEFAULT_BASE_URL" />
      </label>
      <p class="muted hint">{{ t("codex.urlHint") }}</p>
      <button type="button" :disabled="busy" @click="loadSourceList">{{ t("codex.loadSources") }}</button>
      <template v-if="sources.length">
        <h3>{{ t("codex.sources") }}</h3>
        <div class="grid-3">
          <label v-for="source in sources" :key="source" class="check"><input v-model="selected" type="checkbox" :value="source" /> {{ source }}</label>
        </div>
        <button type="button" :disabled="busy || !selected.length" @click="importSelected">{{ t("codex.import") }}</button>
      </template>
      <p v-if="busy" class="muted">{{ t("codex.loading") }}</p>
    </div>
  </details>
</template>
