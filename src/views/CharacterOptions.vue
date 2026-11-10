<script setup>
import { computed } from "vue";
import { t } from "../i18n.js";
import { Ability, SKILLS, HIT_DICE, AcMode, newClass, characterLevel } from "../sheet.js";

const props = defineProps({ sheet: Object });
const emit = defineEmits(["update"]);

const NO_ABILITY = "";
const abilities = Object.values(Ability);
const skills = Object.keys(SKILLS);
const totalLevel = computed(() => characterLevel(props.sheet));

const toNumber = (e) => e.target.valueAsNumber || 0;
const set = (path, value) => emit("update", path, value);
const addClass = () => set("extraClasses", [...props.sheet.extraClasses, newClass()]);
const removeClass = (index) => set("extraClasses", props.sheet.extraClasses.filter((_, i) => i !== index));
</script>

<template>
  <div class="char-options">
    <section>
      <h3>{{ t("settings.multiclass") }} <small>{{ t("settings.totalLevel") }}: {{ totalLevel }}</small></h3>
      <div v-for="(extra, index) in sheet.extraClasses" :key="index" class="class-row">
        <input :aria-label="t('sheet.class')" :placeholder="t('sheet.class')" :value="extra.name" @change="set(`extraClasses.${index}.name`, $event.target.value)" />
        <input type="number" min="1" max="20" :aria-label="t('sheet.level')" :value="extra.level" @change="set(`extraClasses.${index}.level`, toNumber($event))" />
        <select :aria-label="t('sheet.dieType')" :value="extra.die" @change="set(`extraClasses.${index}.die`, $event.target.value)">
          <option v-for="die in HIT_DICE" :key="die" :value="die">{{ die }}</option>
        </select>
        <button type="button" class="danger" :aria-label="t('settings.removeClass')" @click="removeClass(index)">×</button>
      </div>
      <button type="button" @click="addClass">{{ t("settings.addClass") }}</button>
    </section>

    <section>
      <h3>{{ t("settings.expertise") }}</h3>
      <div class="skill-grid">
        <label v-for="s in skills" :key="s" class="check">
          <input type="checkbox" :checked="sheet.expertise[s]" @change="set(`expertise.${s}`, $event.target.checked)" />{{ t(`skill.${s}`) }}
        </label>
      </div>
    </section>

    <section>
      <label class="check">
        <input type="checkbox" :checked="sheet.jackOfAllTrades" @change="set('jackOfAllTrades', $event.target.checked)" />{{ t("settings.jackOfAllTrades") }}
      </label>
    </section>

    <section>
      <label>{{ t("settings.mainClassDie") }}
        <select :value="sheet.hitDice.die" @change="set('hitDice.die', $event.target.value)">
          <option v-for="die in HIT_DICE" :key="die" :value="die">{{ die }}</option>
        </select>
      </label>
    </section>

    <section>
      <label>{{ t("settings.acTracking") }}
        <select :value="sheet.combat.acMode" @change="set('combat.acMode', $event.target.value)">
          <option v-for="mode in Object.values(AcMode)" :key="mode" :value="mode">{{ t(`ac.${mode}`) }}</option>
        </select>
      </label>
      <div v-if="sheet.combat.acMode === AcMode.CUSTOM" class="custom-ac">
        <span>{{ t("settings.customAc") }}:</span>
        <input type="number" class="ac-base" :aria-label="t('settings.customAc')" :value="sheet.combat.acCustom.base" @change="set('combat.acCustom.base', toNumber($event))" />
        <span>+</span>
        <select :aria-label="t('settings.customAc')" :value="sheet.combat.acCustom.first" @change="set('combat.acCustom.first', $event.target.value)">
          <option :value="NO_ABILITY">{{ t("ac.none") }}</option>
          <option v-for="a in abilities" :key="a" :value="a">{{ t(`ability.${a}`) }}</option>
        </select>
        <span>+</span>
        <select :aria-label="t('settings.customAc')" :value="sheet.combat.acCustom.second" @change="set('combat.acCustom.second', $event.target.value)">
          <option :value="NO_ABILITY">{{ t("ac.none") }}</option>
          <option v-for="a in abilities" :key="a" :value="a">{{ t(`ability.${a}`) }}</option>
        </select>
      </div>
    </section>
  </div>
</template>
