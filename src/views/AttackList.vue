<script setup>
import { t } from "../i18n.js";
import { Ability, SPELL_ABILITY, newAttack, attackBonus, attackBonusText, attackDamageText, damageExpression, saveDc } from "../sheet.js";
import { rollModeFromKeys } from "../chat.js";
import CompactList from "./CompactList.vue";

const props = defineProps({ sheet: Object, editable: Boolean });
const emit = defineEmits(["update", "roll"]);

const NO_ABILITY = "";
const abilityRefs = [...Object.values(Ability), SPELL_ABILITY];
const refLabel = (ref) => (ref === SPELL_ABILITY ? t("attack.spell") : t(`ability.${ref}`).slice(0, 3));
const damageLines = [["damage", "attack.damage"], ["damage2", "attack.damage2"]];

// Damage lines with something to roll: [line, magic bonus]. The magic bonus applies to the first line only, like the displayed text.
const damageLinesOf = (attack) => [[attack.damage, attack.magicBonus], [attack.damage2, 0]].filter(([line, magic]) => damageExpression(props.sheet, line, magic));
const damageOf = (attack) => damageLinesOf(attack).map(([line, magic]) => ({ expression: damageExpression(props.sheet, line, magic), type: line.type }));
const attackName = (attack) => attack.name || t("sheet.attacks");
const hasAttackRoll = (attack) => attackBonus(props.sheet, attack) !== null;

// Bonus: the attack alone. Damage: the damage alone. Name: both in one card.
const rollAttack = (attack, event) => emit("roll", { label: attackName(attack), modifier: attackBonus(props.sheet, attack), mode: rollModeFromKeys(event) });
const rollDamage = (attack) => emit("roll", { label: attackName(attack), damage: damageOf(attack) });
const rollBoth = (attack, event) =>
  emit("roll", {
    label: attackName(attack),
    mode: rollModeFromKeys(event),
    critRange: attack.critRange,
    ...(hasAttackRoll(attack) ? { modifier: attackBonus(props.sheet, attack) } : {}),
    damage: damageOf(attack),
  });

const toNumber = (e) => e.target.valueAsNumber || 0;
const set = (path, value) => emit("update", path, value);

const add = () => emit("update", "attacks", [...props.sheet.attacks, newAttack()]);
const remove = (index) => emit("update", "attacks", props.sheet.attacks.filter((_, i) => i !== index));
</script>

<template>
  <CompactList :items="sheet.attacks" :editable="editable" :headers="[t('sheet.attackName'), t('attack.atk'), t('sheet.attackDamage')]" cols="1fr 44px 1.2fr" center-second @add="add" @remove="remove">
    <template #row="{ item }">
      <button v-if="hasAttackRoll(item) || damageLinesOf(item).length" type="button" class="roll-bonus roll-name" :title="t('rolls.attackTitle')" @click="rollBoth(item, $event)">{{ item.name || "…" }}</button>
      <strong v-else>{{ item.name || "…" }}</strong>
      <button v-if="hasAttackRoll(item)" type="button" class="roll-bonus" :title="t('rolls.rollTitle')" @click="rollAttack(item, $event)">{{ attackBonusText(sheet, item) }}</button>
      <span v-else>{{ attackBonusText(sheet, item) }}</span>
      <button v-if="damageLinesOf(item).length" type="button" class="roll-bonus roll-damage" :title="t('rolls.rollTitle')" @click="rollDamage(item)">{{ attackDamageText(sheet, item) }}</button>
      <span v-else>{{ attackDamageText(sheet, item) }}</span>
    </template>
    <template #editor="{ item, index }">
          <label>{{ t("sheet.attackName") }}<input :value="item.name" @change="set(`attacks.${index}.name`, $event.target.value)" /></label>

          <div class="line">
            <label class="check"><input type="checkbox" :checked="item.attack.enabled" @change="set(`attacks.${index}.attack.enabled`, $event.target.checked)" />{{ t("attack.attackRoll") }}</label>
            <select :aria-label="t('attack.attackRoll')" :value="item.attack.ability" @change="set(`attacks.${index}.attack.ability`, $event.target.value)">
              <option v-for="ref in abilityRefs" :key="ref" :value="ref">{{ refLabel(ref) }}</option>
            </select>
            <input type="number" :aria-label="t('attack.extra')" :value="item.attack.bonus" @change="set(`attacks.${index}.attack.bonus`, toNumber($event))" />
            <label class="check"><input type="checkbox" :checked="item.attack.proficient" @change="set(`attacks.${index}.attack.proficient`, $event.target.checked)" />{{ t("sheet.proficient") }}</label>
          </div>

          <label>{{ t("attack.range") }}<input :value="item.range" @change="set(`attacks.${index}.range`, $event.target.value)" /></label>
          <div class="line">
            <label>{{ t("attack.magicBonus") }}<input type="number" :value="item.magicBonus" @change="set(`attacks.${index}.magicBonus`, toNumber($event))" /></label>
            <label>{{ t("attack.critRange") }}<input type="number" min="1" max="20" :value="item.critRange" @change="set(`attacks.${index}.critRange`, toNumber($event))" /></label>
          </div>

          <div v-for="[key, label] in damageLines" :key="key" class="damage">
            <div class="line">
              <label class="check"><input type="checkbox" :checked="item[key].enabled" @change="set(`attacks.${index}.${key}.enabled`, $event.target.checked)" />{{ t(label) }}</label>
              <input :placeholder="t('attack.dice')" :value="item[key].dice" @change="set(`attacks.${index}.${key}.dice`, $event.target.value)" />
              <select :aria-label="t(label)" :value="item[key].ability" @change="set(`attacks.${index}.${key}.ability`, $event.target.value)">
                <option :value="NO_ABILITY">—</option>
                <option v-for="ref in abilityRefs" :key="ref" :value="ref">{{ refLabel(ref) }}</option>
              </select>
              <input type="number" :aria-label="t('attack.extra')" :value="item[key].bonus" @change="set(`attacks.${index}.${key}.bonus`, toNumber($event))" />
            </div>
            <div class="line">
              <label>{{ t("attack.type") }}<input :value="item[key].type" @change="set(`attacks.${index}.${key}.type`, $event.target.value)" /></label>
              <label>{{ t("attack.crit") }}<input :value="item[key].crit" @change="set(`attacks.${index}.${key}.crit`, $event.target.value)" /></label>
            </div>
          </div>

          <div class="line">
            <label class="check"><input type="checkbox" :checked="item.save.enabled" @change="set(`attacks.${index}.save.enabled`, $event.target.checked)" />{{ t("attack.save") }}</label>
            <select :aria-label="t('attack.save')" :value="item.save.ability" @change="set(`attacks.${index}.save.ability`, $event.target.value)">
              <option v-for="a in Object.values(Ability)" :key="a" :value="a">{{ refLabel(a) }}</option>
            </select>
            <label>{{ t("attack.againstDc") }}
              <select :value="item.save.dc" @change="set(`attacks.${index}.save.dc`, $event.target.value)">
                <option v-for="ref in abilityRefs" :key="ref" :value="ref">{{ refLabel(ref) }}</option>
              </select>
            </label>
            <small>{{ t("attack.dc") }} {{ saveDc(sheet, item.save.dc) }}</small>
          </div>
          <label>{{ t("attack.saveEffect") }}<input :value="item.saveEffect" @change="set(`attacks.${index}.saveEffect`, $event.target.value)" /></label>
          <label>{{ t("attack.description") }}<textarea rows="3" :value="item.description" @change="set(`attacks.${index}.description`, $event.target.value)" /></label>
    </template>
  </CompactList>
</template>
