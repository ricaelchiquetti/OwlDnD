<script setup>
import { t } from "../i18n.js";
import { Ability, SPELL_ABILITY, SpellOutput, SpellAttack, spellDc } from "../sheet.js";

const props = defineProps({ spell: Object, sheet: Object });
const emit = defineEmits(["set", "done"]);

const abilities = Object.values(Ability);
const COMPONENTS = [["v", "V"], ["s", "S"], ["m", "M"]];
const SIMPLE_FIELDS = [["castingTime", "spells.castingTime"], ["range", "spells.range"], ["target", "spells.target"]];
const toNumber = (e) => e.target.valueAsNumber || 0;
const isAttack = () => props.spell.output === SpellOutput.ATTACK;
const abilityName = (a) => t(`ability.${a}`);
const set = (key, value) => emit("set", key, value);
const text = (key) => (e) => set(key, e.target.value);
const check = (key) => (e) => set(key, e.target.checked);
</script>

<template>
  <div class="spell-editor">
    <label>{{ t("spells.name") }}<input :value="spell.name" @change="text('name')($event)" /></label>
    <div class="line">
      <label>{{ t("spells.school") }}<input :value="spell.school" @change="text('school')($event)" /></label>
      <label class="check"><input type="checkbox" :checked="spell.ritual" @change="check('ritual')($event)" />{{ t("spells.ritual") }}</label>
    </div>
    <label v-for="[key, label] in SIMPLE_FIELDS" :key="key">{{ t(label) }}<input :value="spell[key]" @change="text(key)($event)" /></label>
    <div class="components">
      <label v-for="[key, letter] in COMPONENTS" :key="key" class="check"><input type="checkbox" :checked="spell[key]" @change="check(key)($event)" />{{ letter }}</label>
    </div>
    <input v-if="spell.m" :aria-label="t('spells.materials')" :placeholder="t('spells.materials')" :value="spell.materials" @change="text('materials')($event)" />
    <label class="check"><input type="checkbox" :checked="spell.concentration" @change="check('concentration')($event)" />{{ t("spells.concentration") }}</label>
    <label>{{ t("spells.duration") }}<input :value="spell.duration" @change="text('duration')($event)" /></label>
    <label>{{ t("spells.ability") }}
      <select :value="spell.ability" @change="text('ability')($event)">
        <option :value="SPELL_ABILITY">{{ t("attack.spell") }}</option>
        <option v-for="a in abilities" :key="a" :value="a">{{ abilityName(a) }}</option>
      </select>
    </label>
    <label>{{ t("spells.innate") }}<input placeholder="1/day" :value="spell.innate" @change="text('innate')($event)" /></label>
    <label>{{ t("spells.output") }}
      <select :value="spell.output" @change="text('output')($event)">
        <option :value="SpellOutput.SHEET">{{ t("spells.outputSheet") }}</option>
        <option :value="SpellOutput.ATTACK">{{ t("spells.outputAttack") }}</option>
      </select>
    </label>

    <template v-if="isAttack()">
      <div class="line">
        <label>{{ t("spells.attackType") }}
          <select :value="spell.attackType" @change="text('attackType')($event)">
            <option :value="SpellAttack.NONE">{{ t("spells.noAttack") }}</option>
            <option :value="SpellAttack.MELEE">{{ t("npc.melee") }}</option>
            <option :value="SpellAttack.RANGED">{{ t("npc.ranged") }}</option>
          </select>
        </label>
      </div>
      <div v-for="(key, n) in ['damage1', 'damage2']" :key="key" class="line">
        <label>{{ t("npc.damage") }}{{ n + 1 }}<input :placeholder="n ? '' : '4d6'" :value="spell[key].dice" @change="text(`${key}.dice`)($event)" /></label>
        <label>{{ t("attack.type") }}<input :value="spell[key].type" @change="text(`${key}.type`)($event)" /></label>
      </div>
      <label>{{ t("spells.healing") }}<input placeholder="1d8" :value="spell.healing" @change="text('healing')($event)" /></label>
      <label class="check"><input type="checkbox" :checked="spell.addModifier" @change="check('addModifier')($event)" />{{ t("spells.addModifier") }}</label>
      <label>{{ t("spells.damagePerLevel") }}<input placeholder="1d6" :value="spell.damagePerLevel" @change="text('damagePerLevel')($event)" /></label>
      <label class="check"><input type="checkbox" :checked="spell.includeDescription" @change="check('includeDescription')($event)" />{{ t("spells.includeDescription") }}</label>
    </template>

    <label class="check"><input type="checkbox" :checked="spell.hasSave" @change="check('hasSave')($event)" />{{ t("spells.hasSave") }}</label>
    <div v-if="spell.hasSave" class="line">
      <label>{{ t("attack.save") }}
        <select :value="spell.save.ability" @change="text('save.ability')($event)">
          <option value="">{{ t("spells.noSave") }}</option>
          <option v-for="a in abilities" :key="a" :value="a">{{ abilityName(a) }}</option>
        </select>
      </label>
      <label>{{ t("spells.saveEffect") }}<input :placeholder="t('spells.saveEffectHint')" :value="spell.save.effect" @change="text('save.effect')($event)" /></label>
      <small>{{ t("attack.dc") }} {{ spellDc(sheet, spell) }}</small>
    </div>
    <label>{{ t("attack.description") }}<textarea rows="5" :value="spell.description" @change="text('description')($event)" /></label>
    <label>{{ t("spells.higherLevels") }}<textarea rows="3" :value="spell.higherLevels" @change="text('higherLevels')($event)" /></label>
    <button type="button" class="done" @click="emit('done')">{{ t("spells.done") }}</button>
  </div>
</template>
