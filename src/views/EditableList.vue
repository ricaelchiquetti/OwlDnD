<script setup>
import { ref } from "vue";
import { t } from "../i18n.js";

defineProps({ items: Array, editable: Boolean, cardRemove: Boolean, removable: { type: Function, default: () => true } });
const emit = defineEmits(["add", "remove"]);
// Deleting is opt-in: the lock keeps stray clicks from removing entries.
const unlocked = ref(false);
</script>

<template>
  <div class="list">
    <div v-for="(item, index) in items" :key="index" class="list-row" :class="{ card: cardRemove }">
      <slot :item="item" :index="index" />
      <button v-if="editable && unlocked && removable(item)" type="button" class="danger" :aria-label="t('sheet.remove')" @click="emit('remove', index)">×</button>
    </div>
    <div v-if="editable" class="list-actions">
      <button type="button" :aria-label="t('sheet.add')" @click="emit('add')">+</button>
      <button type="button" :aria-pressed="unlocked" :aria-label="unlocked ? t('sheet.lock') : t('sheet.unlock')" @click="unlocked = !unlocked">
        {{ unlocked ? "🔓" : "🔒" }}
      </button>
    </div>
  </div>
</template>
