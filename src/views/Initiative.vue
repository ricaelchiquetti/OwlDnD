<script setup>
import { computed } from "vue";
import { t } from "../i18n.js";
import { user } from "../store.js";
import { entries, turn, sceneReady, setInitiative, removeInitiative, clearInitiative, advanceTurn, retreatTurn } from "../initiativeStore.js";

const isGm = computed(() => user.value.role === "GM");
const initialOf = (name) => name.trim().charAt(0).toUpperCase() || "?";
const changeValue = (entry, event) => {
  const value = event.target.valueAsNumber;
  if (Number.isFinite(value)) setInitiative([entry.id], value, entry.bonus);
};
</script>

<template>
  <p v-if="!sceneReady" class="muted">{{ t("initiative.noScene") }}</p>
  <div v-else class="initiative">
    <div class="initiative-head">
      <span>{{ t("initiative.count") }}: <strong>{{ entries.length }}</strong></span>
      <span v-if="turn.round">{{ t("initiative.round") }} <strong>{{ turn.round }}</strong></span>
    </div>

    <p v-if="!entries.length" class="muted">{{ t("initiative.empty") }}</p>
    <ol class="initiative-list">
      <li v-for="entry in entries" :key="entry.id" :class="{ current: entry.id === turn.current }">
        <img v-if="entry.image" class="avatar" :src="entry.image" alt="" />
        <span v-else class="avatar avatar-fallback" aria-hidden="true">{{ initialOf(entry.name) }}</span>
        <span class="initiative-name">{{ entry.name }}</span>
        <input v-if="isGm" class="initiative-score" type="number" step="any" :aria-label="t('initiative.value')" :value="entry.value" @change="changeValue(entry, $event)" />
        <strong v-else class="initiative-score">{{ entry.value }}</strong>
        <button v-if="isGm" type="button" class="row-remove" :aria-label="t('initiative.remove')" @click="removeInitiative([entry.id])">×</button>
      </li>
    </ol>

    <div v-if="isGm" class="initiative-controls">
      <button type="button" class="turn-back" :disabled="!entries.length" :aria-label="t('initiative.previous')" :title="t('initiative.previous')" @click="retreatTurn">←</button>
      <button type="button" class="turn-clear" :disabled="!entries.length" :aria-label="t('initiative.clear')" :title="t('initiative.clear')" @click="clearInitiative">🗑</button>
      <button type="button" class="turn-next" :disabled="!entries.length" :aria-label="t('initiative.next')" :title="t('initiative.next')" @click="advanceTurn">→</button>
    </div>
  </div>
</template>
