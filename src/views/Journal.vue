<script setup>
import { computed } from "vue";
import { t } from "../i18n.js";
import { items, user, connected } from "../store.js";
import { isVisible } from "../journal.js";
import { openItem } from "../itemModal.js";
import { createCharacters, createNpcs } from "../characters.js";

const visibleItems = computed(() => items.value.filter((i) => isVisible(i, user.value)));

</script>

<template>
  <div class="actions">
    <button :disabled="!connected" @click="createCharacters(t('journal.newCharacter'))">{{ t("journal.createCharacter") }}</button>
    <button :disabled="!connected" @click="createNpcs(t('journal.newNpc'))">{{ t("journal.createNpc") }}</button>
  </div>
  <p v-if="!connected" class="muted">{{ t("journal.offline") }}</p>
  <p v-else-if="!visibleItems.length" class="muted">{{ t("journal.empty") }}</p>
  <ul class="items">
    <li v-for="item in visibleItems" :key="item.id">
      <button @click="openItem(item.id)">
        <span class="item-title">
          <img v-if="item.image" class="avatar" :src="item.image" alt="" />
          <strong>{{ item.title }}</strong>
        </span>
        <span class="muted">{{ t(`kind.${item.kind}`) }}</span>
      </button>
    </li>
  </ul>
</template>
