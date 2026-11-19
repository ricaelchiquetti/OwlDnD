<script setup>
import { ref } from "vue";
import { t } from "../i18n.js";
import { newSpell, SpellOutput, spellRolls, spellDc, spellPrint } from "../sheet.js";
import { rollModeFromKeys } from "../chat.js";
import EditableList from "./EditableList.vue";
import SpellEditor from "./SpellEditor.vue";
import FeatureCard from "./FeatureCard.vue";

const props = defineProps({ items: Array, path: String, sheet: Object, editable: Boolean, showPrepared: Boolean, level: { type: Number, default: 0 } });
const emit = defineEmits(["update", "roll", "printFeature"]);

const CRIT_RANGE = 20;
const openIndex = ref(null);
const readIndex = ref(null);
const set = (index, key, value) => emit("update", `${props.path}.${index}.${key}`, value);
const toggleEditor = (index) => (openIndex.value = openIndex.value === index ? null : index);
const toggleRead = (index) => (readIndex.value = readIndex.value === index ? null : index);
// A new spell opens its editor right away; removing one closes it (indexes shift).
const append = () => {
  openIndex.value = props.items.length;
  readIndex.value = null;
  emit("update", props.path, [...props.items, newSpell()]);
};
const removeAt = (index) => {
  openIndex.value = null;
  readIndex.value = null;
  emit("update", props.path, props.items.filter((_, i) => i !== index));
};
const tags = (spell) => [...["v", "s", "m"].filter((key) => spell[key]).map((key) => key.toUpperCase()), ...(spell.concentration ? ["C"] : []), ...(spell.ritual ? ["R"] : [])].join(" ");
const printLabels = () => ({
  castingTime: t("spells.castingTime"), range: t("spells.range"), target: t("spells.target"), components: t("spells.components"),
  duration: t("spells.duration"), concentration: t("spells.concentration"), dc: t("spells.dc"), cantrip: t("spells.cantrip"), ritual: t("spells.ritual"),
});
const spellCard = (spell) => spellPrint(props.sheet, spell, props.level, printLabels());
const print = (spell) => emit("printFeature", spellCard(spell));

// An attack spell rolls its d20 and damage (the save DC goes in the card title); anything else prints its description.
function send(spell, event) {
  const { modifier, damage } = spellRolls(props.sheet, spell, t("rolls.healing"));
  const rollable = modifier !== undefined || damage.length > 0;
  if (!rollable) return print(spell);
  const dc = spell.hasSave && spell.save.ability ? ` (${t("attack.dc")} ${spellDc(props.sheet, spell)} ${t(`ability.${spell.save.ability}`).slice(0, 3)})` : "";
  emit("roll", {
    label: `${spell.name || t("sheetTab.spells")}${dc}`,
    damage,
    ...(modifier !== undefined ? { modifier, mode: rollModeFromKeys(event), critRange: CRIT_RANGE } : {}),
    ...(spell.includeDescription ? { card: spellCard(spell) } : {}),
  });
}
</script>

<template>
  <EditableList :items="items" :editable="editable" @add="append" @remove="removeAt">
    <template #default="{ item, index }">
      <div class="spell">
        <div class="spell-row">
          <input v-if="showPrepared" type="checkbox" class="spell-prepared" :aria-label="t('spells.prepared')" :title="t('spells.prepared')" :checked="item.prepared" @change="set(index, 'prepared', $event.target.checked)" />
          <button type="button" class="spell-name" :title="item.output === SpellOutput.ATTACK ? t('rolls.attackTitle') : t('feature.print')" @click="send(item, $event)">{{ item.name || "…" }}</button>
          <small class="spell-tags">{{ tags(item) }}</small>
          <button type="button" class="spell-read" :aria-expanded="readIndex === index" :aria-label="t('spells.read')" :title="t('spells.read')" @click="toggleRead(index)">{{ readIndex === index ? "▾" : "▸" }}</button>
          <button v-if="editable" type="button" class="gear" :aria-expanded="openIndex === index" :aria-label="t('sheet.editItem')" :title="t('sheet.editItem')" @click="toggleEditor(index)">⚙</button>
        </div>
        <FeatureCard v-if="readIndex === index && openIndex !== index" :card="spellCard(item)" />
        <SpellEditor v-if="editable && openIndex === index" :spell="item" :sheet="sheet" @set="(key, value) => set(index, key, value)" @done="openIndex = null" />
      </div>
    </template>
  </EditableList>
</template>
