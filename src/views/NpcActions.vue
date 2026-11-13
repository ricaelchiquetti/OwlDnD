<script setup>
import { ref } from "vue";
import { t } from "../i18n.js";
import { newAction, ActionKind, damageLabel, actionRolls } from "../npc.js";
import { rollModeFromKeys } from "../chat.js";
import { signed } from "../sheet.js";
import EditableList from "./EditableList.vue";

const props = defineProps({ list: String, items: Array, title: String, editable: Boolean });
const emit = defineEmits(["update", "roll", "printFeature"]);

const set = (path, value) => emit("update", `${props.list}.${path}`, value);
const toNumber = (e) => e.target.valueAsNumber || 0;
const openIndex = ref(null);
// A new action opens its editor right away; removing one closes it (indexes shift).
const append = () => {
  openIndex.value = props.items.length;
  emit("update", props.list, [...props.items, newAction()]);
};
const removeAt = (index) => {
  openIndex.value = null;
  emit("update", props.list, props.items.filter((_, i) => i !== index));
};

const showDescription = ref({});
const toggleEditor = (index) => (openIndex.value = openIndex.value === index ? null : index);

const attackLabel = (action) => t(action.kind === ActionKind.RANGED ? "npc.rangedAttack" : "npc.meleeAttack");
const reachLabel = (action) => t(action.kind === ActionKind.RANGED ? "npc.range" : "npc.reach");
const damageLines = (action) => [action.damage1, action.damage2].map(damageLabel).filter(Boolean);

const CRIT_RANGE = 20;

// Name and bonus: the d20 plus the damage in one card (an attack without damage rolls only the d20). Damage text: only the damage.
const send = (action, parts, event) => {
  const { modifier, damage } = actionRolls(action);
  const label = action.name || props.title;
  const withAttack = parts.includes("attack") && modifier !== undefined;
  emit("roll", {
    label,
    ...(withAttack ? { modifier, mode: rollModeFromKeys(event), critRange: CRIT_RANGE } : {}),
    ...(parts.includes("damage") ? { damage } : {}),
  });
};
const canRoll = (action) => action.attack || actionRolls(action).damage.length > 0;
const printDescription = (action) => action.description && emit("printFeature", { name: action.name, source: "", description: action.description });

// The name sends the whole action to the chat: the roll (when it has one) and the description.
const rollAction = (action, event) => {
  if (canRoll(action)) send(action, ["attack", "damage"], event);
  printDescription(action);
};
</script>

<template>
  <section class="npc-section">
    <h3>{{ title }}</h3>
    <EditableList :items="items" :editable="editable" @add="append" @remove="removeAt">
      <template #default="{ item, index }">
        <div class="npc-action">
          <button v-if="editable" type="button" class="gear" :aria-expanded="openIndex === index" :aria-label="t('sheet.editItem')" :title="t('sheet.editItem')" @click="toggleEditor(index)">⚙</button>

          <div v-if="editable && openIndex === index" class="npc-editor">
            <label class="field">{{ t("npc.name") }}<input :value="item.name" @change="set(`${index}.name`, $event.target.value)" /></label>
            <label class="check"><input type="checkbox" :checked="item.attack" @change="set(`${index}.attack`, $event.target.checked)" />{{ t("npc.attack") }}</label>
            <template v-if="item.attack">
              <div class="line">
                <label class="field">{{ t("attack.type") }}
                  <select :value="item.kind" @change="set(`${index}.kind`, $event.target.value)">
                    <option :value="ActionKind.MELEE">{{ t("npc.melee") }}</option>
                    <option :value="ActionKind.RANGED">{{ t("npc.ranged") }}</option>
                  </select>
                </label>
                <label class="field">{{ reachLabel(item) }}<input :value="item.reach" @change="set(`${index}.reach`, $event.target.value)" /></label>
              </div>
              <div class="line">
                <label class="field">{{ t("npc.toHit") }}<input type="number" :value="item.toHit" @change="set(`${index}.toHit`, toNumber($event))" /></label>
                <label class="field">{{ t("npc.target") }}<input :placeholder="t('npc.targetHint')" :value="item.target" @change="set(`${index}.target`, $event.target.value)" /></label>
              </div>
            </template>
            <div v-for="(key, n) in ['damage1', 'damage2']" :key="key" class="line">
              <label class="field">{{ item.attack ? t(n ? 'npc.onHit2' : 'npc.onHit') : t('npc.damage') }}
                <input :placeholder="n ? '2d6+5' : '1d6'" :value="item[key].dice" @change="set(`${index}.${key}.dice`, $event.target.value)" />
              </label>
              <label class="field">{{ t("attack.type") }}<input :value="item[key].type" @change="set(`${index}.${key}.type`, $event.target.value)" /></label>
            </div>
            <label v-if="item.attack" class="check"><input v-model="showDescription[index]" type="checkbox" />{{ t("attack.description") }}</label>
            <textarea v-if="showDescription[index] || !item.attack" rows="4" :aria-label="t('attack.description')" :value="item.description" @change="set(`${index}.description`, $event.target.value)" />
          </div>

          <div class="npc-preview">
            <button type="button" class="roll-link name" :title="t('rolls.attackTitle')" @click="rollAction(item, $event)">{{ item.name || "…" }}.</button>
            <p v-if="item.attack" class="line-text">
              <em>{{ attackLabel(item) }}:</em>
              <button type="button" class="roll-link" :title="t('rolls.attackTitle')" @click="send(item, ['attack', 'damage'], $event)">{{ signed(item.toHit) }}</button><template v-if="item.reach">, {{ reachLabel(item) }} {{ item.reach }}</template><template v-if="item.target">, {{ item.target }}</template>
            </p>
            <p v-if="damageLines(item).length" class="line-text">
              <em>{{ t("npc.damage") }}:</em>
              <button type="button" class="roll-link" :title="t('rolls.rollTitle')" @click="send(item, ['damage'], $event)">{{ damageLines(item).join(" + ") }}</button>
            </p>
            <p v-if="item.description" class="description">{{ item.description }}</p>
          </div>
        </div>
      </template>
    </EditableList>
  </section>
</template>
