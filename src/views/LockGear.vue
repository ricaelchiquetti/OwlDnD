<script setup>
import { t } from "../i18n.js";

defineProps({ locked: Boolean });
const emit = defineEmits(["toggle"]);

// Also expands the enclosing <details> so the result of the toggle is visible right away.
function toggle(event) {
  const details = event.currentTarget.closest("details");
  if (details) details.open = true;
  emit("toggle");
}
</script>

<template>
  <button type="button" class="gear" :aria-pressed="!locked" :title="locked ? t('sheet.editItem') : t('sheet.lockItem')"
    :aria-label="locked ? t('sheet.editItem') : t('sheet.lockItem')" @click.stop.prevent="toggle">⚙</button>
</template>
