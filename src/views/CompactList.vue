<script setup>
import { ref } from "vue";
import { t } from "../i18n.js";
import EditableList from "./EditableList.vue";

defineProps({ items: Array, editable: Boolean, headers: Array, cols: String, centerSecond: Boolean });
const emit = defineEmits(["add", "remove"]);

// Compact read-only rows; the gear opens one editor at a time (removing a row closes it, indexes shift).
const openIndex = ref(null);
const toggle = (index) => (openIndex.value = openIndex.value === index ? null : index);
const remove = (index) => {
  openIndex.value = null;
  emit("remove", index);
};
</script>

<template>
  <div class="compact" :class="{ 'center-2': centerSecond }" :style="{ '--row-cols': cols }">
    <div class="compact-row compact-head">
      <span v-for="header in headers" :key="header">{{ header }}</span><span />
    </div>
    <EditableList :items="items" :editable="editable" @add="emit('add')" @remove="remove">
      <template #default="{ item, index }">
        <div>
          <div class="compact-row">
            <slot name="row" :item="item" :index="index" />
            <button v-if="editable" type="button" class="gear" :aria-expanded="openIndex === index" :aria-label="t('sheet.editItem')" :title="t('sheet.editItem')" @click="toggle(index)">⚙</button>
            <span v-else />
          </div>
          <div v-if="openIndex === index" class="compact-editor"><slot name="editor" :item="item" :index="index" /></div>
        </div>
      </template>
    </EditableList>
  </div>
</template>
