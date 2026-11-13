<script setup>
import { computed, ref } from "vue";
import { t } from "../i18n.js";
import { Ability, signed } from "../sheet.js";
import { NPC_SKILLS, npcModifier, npcSections, skillEntries, hpFormulaRoll, saveEntries } from "../npc.js";
import { rollModeFromKeys } from "../chat.js";
import NpcActions from "./NpcActions.vue";
import "../npc.css";

const props = defineProps({ npc: Object, name: String, editable: Boolean });
const emit = defineEmits(["update", "rename", "rollInitiative", "roll", "printFeature"]);

const abilities = Object.values(Ability);
const editing = ref(false);
const sections = computed(() => npcSections(props.npc));
const skills = computed(() => skillEntries(props.npc));
const saves = computed(() => saveEntries(props.npc));
const textFields = ["vulnerabilities", "resistances", "damageImmunities", "conditionImmunities", "senses", "languages"];
const flags = [["isCaster", "npc.caster"], ["hasBonusAction", "npc.hasBonusAction"], ["hasReactions", "npc.hasReactions"]];

const set = (path, value) => emit("update", path, value);
const text = (path) => (e) => set(path, e.target.value);
const num = (path) => (e) => set(path, e.target.valueAsNumber || 0);
const check = (path) => (e) => set(path, e.target.checked);
const rollCheck = (label, modifier, event) => emit("roll", { label, modifier, mode: rollModeFromKeys(event) });
const rollHp = () => {
  const spec = hpFormulaRoll(props.npc.combat.hpFormula, t("npc.hitPoints"));
  if (spec) emit("roll", spec);
};
const readRows = computed(() => textFields.map((key) => [key, props.npc[key]]).filter(([, value]) => value));
</script>

<template>
  <div class="npc paper-dark">
    <header class="npc-head">
      <h2>{{ name }}</h2>
      <button v-if="editable" type="button" class="gear" :aria-pressed="editing" :aria-label="editing ? t('sheet.lockItem') : t('sheet.editItem')" :title="editing ? t('sheet.lockItem') : t('sheet.editItem')" @click="editing = !editing">⚙</button>
    </header>

    <form v-if="editing" class="npc-form" @submit.prevent>
      <h3 class="center">{{ t("npc.options") }}</h3>
      <label class="field">{{ t("npc.name") }}<input :value="name" @change="emit('rename', $event.target.value)" /></label>
      <label class="field">{{ t("npc.type") }}<input :value="npc.type" @change="text('type')($event)" /></label>
      <div class="line">
        <label class="field">{{ t("sheet.acShort") }}<input type="number" :value="npc.combat.ac" @change="num('combat.ac')($event)" /></label>
        <label class="field">{{ t("attack.type") }}<input :value="npc.combat.acType" @change="text('combat.acType')($event)" /></label>
      </div>
      <div class="line">
        <label class="field">{{ t("npc.hitPoints") }}<input type="number" min="0" :value="npc.combat.hpMax" @change="num('combat.hpMax')($event)" /></label>
        <label class="field">{{ t("npc.formula") }}<input placeholder="3d6" :value="npc.combat.hpFormula" @change="text('combat.hpFormula')($event)" /></label>
      </div>
      <label class="field">{{ t("sheet.speed") }}<input :value="npc.combat.speed" @change="text('combat.speed')($event)" /></label>

      <h4>{{ t("npc.abilities") }}</h4>
      <div class="line"><label v-for="a in abilities" :key="a" class="field">{{ t(`ability.${a}`).slice(0, 3) }}<input type="number" :value="npc.abilities[a]" @change="num(`abilities.${a}`)($event)" /></label></div>
      <h4>{{ t("npc.saves") }} ({{ t("npc.saveBonus") }})</h4>
      <div class="line"><label v-for="a in abilities" :key="a" class="field">{{ t(`ability.${a}`).slice(0, 3) }}<input type="number" :value="npc.saves[a]" @change="num(`saves.${a}`)($event)" /></label></div>
      <h4>{{ t("sheet.skills") }}</h4>
      <div class="skill-grid"><label v-for="s in NPC_SKILLS" :key="s" class="field">{{ t(`skill.${s}`) }}<input type="number" :value="npc.skills[s]" @change="num(`skills.${s}`)($event)" /></label></div>

      <label v-for="key in textFields" :key="key" class="field">{{ t(`npc.${key}`) }}<input :value="npc[key]" @change="text(key)($event)" /></label>
      <div class="line">
        <label class="field">{{ t("npc.challenge") }}<input :value="npc.challenge" @change="text('challenge')($event)" /></label>
        <label class="field">{{ t("sheet.xp") }}<input type="number" min="0" :value="npc.xp" @change="num('xp')($event)" /></label>
      </div>
      <div class="line">
        <label class="field">{{ t("sheet.proficiencyBonus") }}<input type="number" :value="npc.proficiencyBonus" @change="num('proficiencyBonus')($event)" /></label>
        <label class="field">{{ t("npc.tokenSize") }}<input type="number" min="1" :value="npc.tokenSize" @change="num('tokenSize')($event)" /></label>
      </div>
      <label v-for="[key, label] in flags" :key="key" class="check"><input type="checkbox" :checked="npc[key]" @change="check(key)($event)" />{{ t(label) }}</label>
      <label class="field">{{ t("npc.legendaryActions") }}<input type="number" min="0" :value="npc.legendaryActions" @change="num('legendaryActions')($event)" /></label>
      <label class="check"><input type="checkbox" :checked="npc.hasMythic" @change="check('hasMythic')($event)" />{{ t("npc.mythicActions") }}</label>
      <textarea v-if="npc.hasMythic" rows="5" :placeholder="t('npc.mythicHint')" :value="npc.mythicText" @change="text('mythicText')($event)" />
    </form>

    <section v-else class="npc-block">
      <p class="subtitle">{{ npc.type }}</p>
      <hr />
      <button type="button" class="init" :title="t('initiative.rollTitle')" @click="emit('rollInitiative', rollModeFromKeys($event))">⚄<small>INIT</small></button>
      <p><b>{{ t("sheet.ac") }}</b> {{ npc.combat.ac }}<template v-if="npc.combat.acType"> ({{ npc.combat.acType }})</template></p>
      <p><b>{{ t("npc.hitPoints") }}</b> {{ npc.combat.hpMax }}<button v-if="npc.combat.hpFormula" type="button" class="roll-link" :title="t('rolls.rollTitle')" @click="rollHp">({{ npc.combat.hpFormula }})</button></p>
      <p><b>{{ t("sheet.speed") }}</b> {{ npc.combat.speed }}</p>
      <hr />
      <div class="abilities">
        <div v-for="a in abilities" :key="a" class="ability-pill">
          <b>{{ t(`ability.${a}`).slice(0, 3) }}</b>
          <button type="button" class="roll-link" :title="t('rolls.rollTitle')" @click="rollCheck(`${t(`ability.${a}`)} (${t('rolls.check')})`, npcModifier(npc.abilities[a]), $event)">{{ npc.abilities[a] }}</button>
          <button type="button" class="roll-link" :title="t('rolls.rollTitle')" @click="rollCheck(`${t(`ability.${a}`)} (${t('rolls.check')})`, npcModifier(npc.abilities[a]), $event)">({{ signed(npcModifier(npc.abilities[a])) }})</button>
        </div>
      </div>
      <hr />
      <p><b>{{ t("npc.saves") }}</b>
        <template v-for="[a, total] in saves" :key="a"> <button type="button" class="roll-link" :title="t('rolls.rollTitle')" @click="rollCheck(`${t(`ability.${a}`)} (${t('rolls.save')})`, total, $event)">{{ t(`ability.${a}`).slice(0, 3) }} {{ signed(total) }}</button></template>
      </p>
      <p v-if="skills.length"><b>{{ t("sheet.skills") }}</b>
        <template v-for="[s, value] in skills" :key="s"> <button type="button" class="roll-link" :title="t('rolls.rollTitle')" @click="rollCheck(t(`skill.${s}`), value, $event)">{{ t(`skill.${s}`) }} {{ signed(value) }}</button></template>
      </p>
      <p v-for="[key, value] in readRows" :key="key"><b>{{ t(`npc.${key}`) }}</b> {{ value }}</p>
      <p v-if="npc.challenge"><b>{{ t("npc.challenge") }}</b> {{ npc.challenge }}<template v-if="npc.xp"> ({{ npc.xp }} XP)</template></p>
      <hr />
    </section>

    <template v-for="key in sections" :key="key">
      <section v-if="key === 'mythic'" class="npc-section">
        <h3>{{ t("npc.mythic") }}</h3>
        <p class="description">{{ npc.mythicText }}</p>
      </section>
      <NpcActions v-else :list="key" :items="npc[key]" :title="t(`npc.${key}`)" :editable="editable" @update="set" @roll="emit('roll', $event)" @print-feature="emit('printFeature', $event)" />
    </template>
  </div>
</template>
