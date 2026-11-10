<script setup>
import { t } from "../i18n.js";
import { items, user, players, saveItems, deleteItem } from "../store.js";
import { Visibility, canChangeVisibility, setVisibility } from "../journal.js";

const props = defineProps({ item: Object });
const emit = defineEmits(["deleted"]);

const editable = () => canChangeVisibility(props.item, user.value);
const visibilityOptions = Object.values(Visibility);

const update = (next) => saveItems(items.value.map((i) => (i.id === props.item.id ? next : i)));
const changeVisibility = (value) => update(setVisibility(props.item, Number(value), props.item.players));
const togglePlayer = (id) => {
  const chosen = props.item.players;
  update(setVisibility(props.item, Visibility.PLAYERS, chosen.includes(id) ? chosen.filter((p) => p !== id) : [...chosen, id]));
};
const remove = async () => {
  if (!confirm(t("journal.confirmDelete"))) return;
  await deleteItem(props.item.id);
  emit("deleted");
};
</script>

<template>
  <div v-if="editable()" class="item-settings">
    <label>
      {{ t("journal.visibility") }}
      <select :value="item.visibility" @change="changeVisibility($event.target.value)">
        <option v-for="v in visibilityOptions" :key="v" :value="v">{{ t(`visibility.${v}`) }}</option>
      </select>
    </label>
    <div v-if="item.visibility === Visibility.PLAYERS" class="players">
      <label v-for="p in players.filter((p) => p.id !== item.owner)" :key="p.id">
        <input type="checkbox" :checked="item.players.includes(p.id)" @change="togglePlayer(p.id)" />
        {{ p.name }}
      </label>
    </div>
    <button class="danger" @click="remove">{{ t("journal.delete") }}</button>
  </div>
</template>
