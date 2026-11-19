<script setup>
import { t } from "../i18n.js";
import { assetUrl } from "../assetUrl.js";
import { Ability, hasAutoSlots, spellSaveDc, spellAttackBonus, spellSlotTotal, signed } from "../sheet.js";
import SpellList from "./SpellList.vue";
import "../sheet-art.css";

defineProps({ sheet: Object, name: String, editable: Boolean });
const emit = defineEmits(["update", "roll", "printFeature"]);

const abilities = Object.values(Ability);
// The printed page: cantrips, 1 and 2 on the left; 3 to 5 in the middle; 6 to 9 on the right.
const COLUMNS = [[1, 2], [3, 4, 5], [6, 7, 8, 9]];
const set = (path, value) => emit("update", path, value);
const toNumber = (e) => Math.max(e.target.valueAsNumber || 0, 0);
const dash = (value, format = String) => (value === null ? "—" : format(value));
</script>

<template>
  <fieldset :disabled="!editable" class="sheet paper">
    <header class="sheet-header">
      <div class="banner">
        <img :src="assetUrl('img/CharScroll.svg')" alt="" />
        <h2 :title="name">{{ name }}</h2>
      </div>
      <div class="spell-plate">
        <div class="spell-stat">
          <div class="spell-box">
            <select :aria-label="t('spells.ability')" :value="sheet.spellcasting.ability" @change="set('spellcasting.ability', $event.target.value)">
              <option value="">—</option>
              <option v-for="a in abilities" :key="a" :value="a">{{ t(`ability.${a}`) }}</option>
            </select>
          </div>
          <span>{{ t("spells.ability") }}</span>
        </div>
        <div class="spell-stat">
          <div class="spell-box"><strong>{{ dash(spellSaveDc(sheet)) }}</strong></div>
          <span>{{ t("spells.dc") }}</span>
        </div>
        <div class="spell-stat">
          <div class="spell-box"><strong>{{ dash(spellAttackBonus(sheet), signed) }}</strong></div>
          <span>{{ t("spells.attack") }}</span>
        </div>
      </div>
    </header>

    <div class="spell-columns">
      <div v-for="(levels, column) in COLUMNS" :key="column" class="spell-column">
        <section v-if="column === 0" class="spell-level">
          <div class="spell-level-head cantrip"><b>0</b><span>{{ t("spells.cantrips") }}</span></div>
          <SpellList :sheet="sheet" :level="0" :items="sheet.spells.cantrips" path="spells.cantrips" :editable="editable" @update="set" @roll="emit('roll', $event)" @print-feature="emit('printFeature', $event)" />
        </section>
        <section v-for="level in levels" :key="level" class="spell-level">
          <div class="spell-level-head">
            <b>{{ level }}</b>
            <label><small>{{ t("spells.totalSlots") }}</small><input type="number" min="0" :value="spellSlotTotal(sheet, level)" :readonly="hasAutoSlots(sheet)" :title="hasAutoSlots(sheet) ? t('spells.autoSlots') : ''" @change="set(`spells.levels.${level}.total`, toNumber($event))" /></label>
            <label><small>{{ t("spells.remainingSlots") }}</small><input type="number" min="0" :value="sheet.spells.levels[level].remaining" @change="set(`spells.levels.${level}.remaining`, toNumber($event))" /></label>
          </div>
          <SpellList :sheet="sheet" :level="level" :items="sheet.spells.levels[level].list" :path="`spells.levels.${level}.list`" show-prepared :editable="editable" @update="set" @roll="emit('roll', $event)" @print-feature="emit('printFeature', $event)" />
        </section>
      </div>
    </div>
  </fieldset>
</template>
