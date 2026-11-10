<script setup>
import { computed, ref } from "vue";
import { t } from "../i18n.js";
import { assetUrl } from "../assetUrl.js";
import {
  Ability, ASK_ABILITY, AcMode, EquipmentKind, ArmorType, EffectMode, EffectTarget, ALL_SAVES, DEATH_SAVE, deathSaveBonus, abilityScore, abilityScoreModified, newItemEffect, armorClass, characterLevel, hitDiceTotal, hitDiceTypes, ToolProficiency, SKILLS, ProficiencyType, Encumbrance, abilityModifier, proficiencyBonus, savingThrow, skillBonus, passivePerception, initiative,
  toolBonus, toolBonusText, modifierFor, hitDiceExpression, totalWeight, encumbrance, featureIndexes, signed, newEquipment, newTool, newProficiency, newResource, newFeature,
} from "../sheet.js";
import EditableList from "./EditableList.vue";
import LockGear from "./LockGear.vue";
import AttackList from "./AttackList.vue";
import { RollMode, rollModeFromKeys } from "../chat.js";
import CompactList from "./CompactList.vue";
import SheetPanel from "./SheetPanel.vue";
import "../sheet-art.css";

const props = defineProps({ sheet: Object, name: String, editable: Boolean });
const emit = defineEmits(["update", "rollInitiative", "roll", "printFeature"]);

const abilities = Object.values(Ability);
const skills = Object.keys(SKILLS);
const COIN_ICONS = { cp: "copper", sp: "silver", ep: "electrum", gp: "gold", pp: "platnum" };
const currencies = Object.keys(COIN_ICONS);
const personality = ["traits", "ideals", "bonds", "flaws"];
const PERSONALITY_FRAMES = { traits: "vital-top", ideals: "vital-mid", bonds: "vital-mid", flaws: "vital-bottom" };
const DEATH_SAVE_STEPS = [1, 2, 3];

const toNumber = (e) => e.target.valueAsNumber || 0;
const set = (path, value) => emit("update", path, value);
const append = (key, entry) => set(key, [...props.sheet[key], entry]);
const removeAt = (key, index) => set(key, props.sheet[key].filter((_, i) => i !== index));
const toggleLock = (path, locked) => set(path, !locked);
const openEquipment = ref(null);
const toggleEquipment = (index) => (openEquipment.value = openEquipment.value === index ? null : index);
const removeEquipment = (index) => {
  openEquipment.value = null;
  removeAt("equipment", index);
};
// Every roll button sends { label, modifier, mode } up: Shift + click is advantage, Ctrl + click is disadvantage.
// The selector above Features is the default mode; Shift/Ctrl on a click still override it.
const rollMode = ref(RollMode.NORMAL);
const modeFor = (event) => {
  const fromKeys = rollModeFromKeys(event);
  return fromKeys === RollMode.NORMAL ? rollMode.value : fromKeys;
};
const rollCheck = (what, modifier, event) => emit("roll", { label: what, modifier, mode: modeFor(event) });
// Attack cards carry their own key-based mode; fill in the selector when no key was held. Damage-only rolls have no d20.
const forwardRoll = (roll) => emit("roll", "modifier" in roll && roll.mode === RollMode.NORMAL ? { ...roll, mode: rollMode.value } : roll);
const rollHitDie = (die) => emit("roll", { label: t("sheet.hitDice"), damage: [{ expression: hitDiceExpression(props.sheet, die), type: t("rolls.healing") }] });
const printFeature = ({ feature }) => emit("printFeature", { name: feature.name, source: feature.source, description: feature.description });
const toggleCount = (current, step) => (current === step ? step - 1 : step);

const weight = computed(() => totalWeight(props.sheet.equipment));
const load = computed(() => encumbrance(weight.value, abilityScore(props.sheet, Ability.STR)));
// While an ability field has focus it shows the base score (what you type); otherwise the effective one with item effects.
const editingAbility = ref(null);
const query = ref("");
const visibleFeatures = computed(() => featureIndexes(props.sheet.features, query.value).map((index) => ({ index, feature: props.sheet.features[index] })));
</script>

<template>
  <fieldset :disabled="!editable" class="sheet paper">
    <header class="sheet-header">
      <div class="banner">
        <img :src="assetUrl('img/CharScroll.svg')" alt="" />
        <h2 :title="name">{{ name }}</h2>
      </div>
      <div class="info-box">
        <LockGear v-if="editable" class="info-gear" :locked="sheet.locks.header" @toggle="toggleLock('locks.header', sheet.locks.header)" />
        <fieldset class="plain" :disabled="sheet.locks.header">
          <div class="info-grid">
            <label>{{ t("sheet.class") }}
              <span class="inline"><input :value="sheet.info.class" @change="set('info.class', $event.target.value)" />
                <input type="number" min="1" max="20" :aria-label="t('sheet.level')" :value="sheet.level" @change="set('level', toNumber($event))" /></span>
              <span v-for="(extra, index) in sheet.extraClasses" :key="index" class="inline">
                <input :aria-label="t('sheet.class')" :value="extra.name" @change="set(`extraClasses.${index}.name`, $event.target.value)" />
                <input type="number" min="1" max="20" :aria-label="t('sheet.level')" :value="extra.level" @change="set(`extraClasses.${index}.level`, toNumber($event))" />
              </span>
            </label>
            <label>{{ t("sheet.background") }}<input :value="sheet.info.background" @change="set('info.background', $event.target.value)" /></label>
            <label>{{ t("sheet.race") }}<input :value="sheet.info.race" @change="set('info.race', $event.target.value)" /></label>
            <label>{{ t("sheet.alignment") }}<input :value="sheet.info.alignment" @change="set('info.alignment', $event.target.value)" /></label>
            <label>{{ t("sheet.xp") }}<input type="number" min="0" :value="sheet.info.xp" @change="set('info.xp', toNumber($event))" /></label>
          </div>
        </fieldset>
      </div>
    </header>

    <div class="sheet-columns">
      <div class="col abilities">
        <div v-for="a in abilities" :key="a" class="ability" :class="{ modified: abilityScoreModified(sheet, a) }">
          <span>{{ t(`ability.${a}`) }}</span>
          <button type="button" class="ability-roll" :title="t('rolls.rollTitle')" @click="rollCheck(`${t(`ability.${a}`)} (${t('rolls.check')})`, modifierFor(sheet, a), $event)">{{ signed(modifierFor(sheet, a)) }}</button>
          <i v-if="abilityScoreModified(sheet, a)" class="ability-mark" :title="`${t('effects.base')} ${sheet.abilities[a]}`">★</i>
          <input type="number" min="1" max="30" :aria-label="t(`ability.${a}`)" :value="editingAbility === a ? sheet.abilities[a] : abilityScore(sheet, a)"
            @focus="editingAbility = a" @blur="editingAbility = null" @change="set(`abilities.${a}`, toNumber($event))" />
        </div>
      </div>

      <div class="col skills">
        <div class="bar bar-inspiration">
          <button type="button" class="bar-check" :aria-label="t('sheet.inspiration')" :aria-pressed="sheet.inspiration" @click="set('inspiration', !sheet.inspiration)">
            <img v-if="sheet.inspiration" :src="assetUrl('img/insperation.gif')" alt="" />
          </button>
          <span class="bar-label">{{ t("sheet.inspiration") }}</span>
        </div>
        <div class="bar bar-proficiency">
          <strong class="bar-value">{{ signed(proficiencyBonus(characterLevel(sheet))) }}</strong>
          <span class="bar-label">{{ t("sheet.proficiencyBonus") }}</span>
        </div>

        <SheetPanel frame="saves" :title="t('sheet.savingThrows')">
          <div v-for="a in abilities" :key="a" class="check-row">
            <input type="checkbox" :aria-label="t('sheet.proficient')" :checked="sheet.saveProf[a]" @change="set(`saveProf.${a}`, $event.target.checked)" />
            <button type="button" class="roll-row" :title="t('rolls.rollTitle')" @click="rollCheck(`${t(`ability.${a}`)} (${t('rolls.save')})`, savingThrow(sheet, a), $event)"><strong>{{ signed(savingThrow(sheet, a)) }}</strong> {{ t(`ability.${a}`) }}</button>
          </div>
        </SheetPanel>

        <SheetPanel frame="block" :title="t('sheet.skills')">
          <div v-for="s in skills" :key="s" class="check-row">
            <input type="checkbox" :aria-label="t('sheet.proficient')" :checked="sheet.skillProf[s] || sheet.expertise[s]" :disabled="sheet.expertise[s]" @change="set(`skillProf.${s}`, $event.target.checked)" />
            <button type="button" class="roll-row" :title="t('rolls.rollTitle')" @click="rollCheck(t(`skill.${s}`), skillBonus(sheet, s), $event)"><strong>{{ signed(skillBonus(sheet, s)) }}</strong> {{ t(`skill.${s}`) }} <small>({{ t(`ability.${SKILLS[s]}`).slice(0, 3) }})</small></button>
            <span v-if="sheet.expertise[s]" class="expertise-mark" :title="t('settings.expertise')">★</span>
          </div>
        </SheetPanel>
      </div>

      <div class="col other">
        <div class="bar bar-perception">
          <strong class="bar-value">{{ passivePerception(sheet) }}</strong>
          <span class="bar-label">{{ t("sheet.passivePerception") }}</span>
        </div>

        <SheetPanel :title="t('sheet.tools')">
          <CompactList :items="sheet.tools" :editable="editable" :headers="[t('sheet.tool'), t('sheet.pro'), t('sheet.attribute')]" cols="1fr 40px 80px" center-second
            @add="append('tools', newTool())" @remove="removeAt('tools', $event)">
            <template #row="{ item }">
              <template v-if="toolBonus(sheet, item) !== null">
                <button type="button" class="roll-bonus roll-name" :title="t('rolls.rollTitle')" @click="rollCheck(`${item.name || t('sheet.tool')} (${t('rolls.check')})`, toolBonus(sheet, item), $event)">{{ item.name || "…" }}</button>
                <button type="button" class="roll-bonus" :title="t('rolls.rollTitle')" @click="rollCheck(`${item.name || t('sheet.tool')} (${t('rolls.check')})`, toolBonus(sheet, item), $event)">{{ toolBonusText(sheet, item) }}</button>
              </template>
              <template v-else>
                <strong>{{ item.name || "…" }}</strong>
                <span>{{ toolBonusText(sheet, item) }}</span>
              </template>
              <span>{{ item.ability === ASK_ABILITY ? t("tool.ask") : t(`ability.${item.ability}`).slice(0, 3) }}</span>
            </template>
            <template #editor="{ item, index }">
              <label>{{ t("sheet.tool") }}<input :value="item.name" @change="set(`tools.${index}.name`, $event.target.value)" /></label>
              <label>{{ t("tool.proficiencyBonus") }}
                <select :value="item.proficiency" @change="set(`tools.${index}.proficiency`, $event.target.value)">
                  <option v-for="level in Object.values(ToolProficiency)" :key="level" :value="level">{{ t(`tool.${level}`) }}</option>
                </select>
              </label>
              <label>{{ t("sheet.attribute") }}
                <select :value="item.ability" @change="set(`tools.${index}.ability`, $event.target.value)">
                  <option :value="ASK_ABILITY">{{ t("tool.askAttribute") }}</option>
                  <option v-for="a in abilities" :key="a" :value="a">{{ t(`ability.${a}`) }}</option>
                </select>
              </label>
              <label>{{ t("tool.mods") }}<input type="number" :value="item.mods" @change="set(`tools.${index}.mods`, toNumber($event))" /></label>
            </template>
          </CompactList>
        </SheetPanel>

        <SheetPanel :title="t('sheet.profLang')">
          <CompactList :items="sheet.proficiencies" :editable="editable" :headers="[t('sheet.type'), t('sheet.proficiency')]" cols="90px 1fr"
            @add="append('proficiencies', newProficiency())" @remove="removeAt('proficiencies', $event)">
            <template #row="{ item }">
              <span>{{ t(`proficiency.${item.type}`) }}</span>
              <strong>{{ item.name || "…" }}</strong>
            </template>
            <template #editor="{ item, index }">
              <label>{{ t("sheet.type") }}
                <select :value="item.type" @change="set(`proficiencies.${index}.type`, $event.target.value)">
                  <option v-for="type in Object.values(ProficiencyType)" :key="type" :value="type">{{ t(`proficiency.${type}`) }}</option>
                </select>
              </label>
              <label>{{ t("sheet.proficiency") }}<input :value="item.name" @change="set(`proficiencies.${index}.name`, $event.target.value)" /></label>
            </template>
          </CompactList>
        </SheetPanel>
      </div>

      <div class="col combat">
        <section class="plate">
          <div class="vitals">
            <div class="shield">
              <input type="number" :aria-label="t('sheet.ac')" :value="armorClass(sheet)" :readonly="sheet.combat.acMode !== AcMode.MANUAL" @change="set('combat.ac', toNumber($event))" />
              <span class="shield-label">{{ t("sheet.acShort") }}</span>
            </div>
            <SheetPanel frame="vital" :title="t('sheet.initiative')">
              <button type="button" class="big-number initiative-roll" :title="t('initiative.rollTitle')" @click="emit('rollInitiative', modeFor($event))">{{ signed(initiative(sheet)) }}</button>
            </SheetPanel>
            <SheetPanel frame="vital" :title="t('sheet.speedShort')"><input class="big-number" type="number" :aria-label="t('sheet.speed')" :value="sheet.combat.speed" @change="set('combat.speed', toNumber($event))" /></SheetPanel>
          </div>

          <SheetPanel frame="vital-top" :title="t('sheet.hpCurrent')">
            <label class="mini-total">{{ t("sheet.hpMax") }}<input type="number" :value="sheet.combat.hpMax" @change="set('combat.hpMax', toNumber($event))" /></label>
            <input class="big-number hp-current" type="number" :aria-label="t('sheet.hpCurrent')" :value="sheet.combat.hpCurrent" @change="set('combat.hpCurrent', toNumber($event))" />
          </SheetPanel>
          <SheetPanel frame="vital-bottom" :title="t('sheet.hpTemp')">
            <input class="big-number" type="number" :aria-label="t('sheet.hpTemp')" :value="sheet.combat.hpTemp" @change="set('combat.hpTemp', toNumber($event))" />
          </SheetPanel>

          <div class="grid-2">
            <SheetPanel frame="vital">
              <p class="mini-total">{{ t("sheet.total") }}<span class="mini-value">{{ hitDiceTotal(sheet) }}</span></p>
              <input class="big-number" type="number" min="0" :aria-label="t('sheet.hitDice')" :value="sheet.hitDice.current" @change="set('hitDice.current', toNumber($event))" />
              <template #caption>
                {{ t("sheet.hitDice") }} (
                <template v-for="(die, index) in hitDiceTypes(sheet)" :key="die">
                  <span v-if="index"> / </span>
                  <button type="button" class="die-roll" :title="t('rolls.hitDieTitle')" @click="rollHitDie(die)">{{ die }}</button>
                </template>
                )
              </template>
            </SheetPanel>
            <SheetPanel frame="vital">
              <div v-for="kind in ['successes', 'failures']" :key="kind" class="death-row">
                <span>{{ t(`sheet.${kind}`) }}</span>
                <button v-for="step in DEATH_SAVE_STEPS" :key="step" type="button" class="dot" :class="{ on: sheet.deathSaves[kind] >= step }"
                  :aria-pressed="sheet.deathSaves[kind] >= step" :aria-label="`${t(`sheet.${kind}`)} ${step}`" @click="set(`deathSaves.${kind}`, toggleCount(sheet.deathSaves[kind], step))" />
              </div>
              <p v-if="deathSaveBonus(sheet)" class="death-bonus">{{ t("sheet.deathSaveBonus") }} <strong>{{ signed(deathSaveBonus(sheet)) }}</strong></p>
              <template #caption>
                <button type="button" class="caption-roll" :title="t('rolls.rollTitle')" @click="rollCheck(t('sheet.deathSaves'), deathSaveBonus(sheet), $event)">{{ t("sheet.deathSaves") }}</button>
              </template>
            </SheetPanel>
          </div>
        </section>

        <SheetPanel :title="t('sheet.attacks')">
          <AttackList :sheet="sheet" :editable="editable" @update="set" @roll="forwardRoll" />
        </SheetPanel>

        <SheetPanel :title="t('sheet.currency')">
          <div class="coins">
            <label v-for="c in currencies" :key="c" class="coin">
              <span class="coin-label"><img :src="assetUrl(`img/${COIN_ICONS[c]}.png`)" alt="" />{{ t(c) }}</span>
              <input type="number" min="0" :value="sheet.currency[c]" @change="set(`currency.${c}`, toNumber($event))" />
            </label>
          </div>
        </SheetPanel>

        <SheetPanel :title="t('sheet.equipment')">
          <div class="equipment" style="--cols: auto 40px 1fr 54px 22px">
            <div class="equip-head">
              <span /><span :title="t('sheet.qty')">✖</span><span>{{ t("sheet.equipmentName") }}</span>
              <img :src="assetUrl('img/weight_lbs.png')" :alt="t('sheet.weight')" :title="t('sheet.weight')" /><span />
            </div>
            <EditableList :items="sheet.equipment" :editable="editable" @add="append('equipment', newEquipment())" @remove="removeEquipment">
              <template #default="{ item, index }">
                <div class="equip-item">
                  <div class="equip-row">
                    <input type="checkbox" :aria-label="t('sheet.equipped')" :checked="item.equipped" @change="set(`equipment.${index}.equipped`, $event.target.checked)" />
                    <input type="number" min="0" :aria-label="t('sheet.qty')" :value="item.qty" @change="set(`equipment.${index}.qty`, toNumber($event))" />
                    <input :placeholder="t('sheet.itemName')" :value="item.name" @change="set(`equipment.${index}.name`, $event.target.value)" />
                    <input type="number" min="0" step="any" :aria-label="t('sheet.weight')" :value="item.weight" @change="set(`equipment.${index}.weight`, toNumber($event))" />
                    <button v-if="editable" type="button" class="gear" :aria-expanded="openEquipment === index" :aria-label="t('sheet.editItem')" :title="t('sheet.editItem')" @click="toggleEquipment(index)">⚙</button>
                    <span v-else />
                  </div>
                  <div v-if="openEquipment === index" class="equip-editor">
                    <label>{{ t("sheet.type") }}
                      <select :value="item.kind" @change="set(`equipment.${index}.kind`, $event.target.value)">
                        <option v-for="kind in Object.values(EquipmentKind)" :key="kind" :value="kind">{{ t(`equipKind.${kind}`) }}</option>
                      </select>
                    </label>
                    <div v-if="item.kind === EquipmentKind.MAGIC" class="effects">
                      <span class="effects-title">{{ t("effects.title") }}</span>
                      <div v-for="(effect, e) in item.effects" :key="e" class="effect-row">
                        <select :aria-label="t('effects.target')" :value="effect.target" @change="set(`equipment.${index}.effects.${e}`, newItemEffect($event.target.value))">
                          <option v-for="target in Object.values(EffectTarget)" :key="target" :value="target">{{ t(`effectTarget.${target}`) }}</option>
                        </select>
                        <select v-if="effect.target !== EffectTarget.AC" :aria-label="t('sheet.attribute')" :value="effect.ability" @change="set(`equipment.${index}.effects.${e}.ability`, $event.target.value)">
                          <template v-if="effect.target === EffectTarget.SAVE">
                            <option :value="ALL_SAVES">{{ t("effects.allSaves") }}</option>
                            <option :value="DEATH_SAVE">{{ t("effects.deathSave") }}</option>
                          </template>
                          <option v-for="a in abilities" :key="a" :value="a">{{ t(`ability.${a}`).slice(0, 3) }}</option>
                        </select>
                        <select v-if="effect.target === EffectTarget.ABILITY" :aria-label="t('effects.mode')" :value="effect.mode" @change="set(`equipment.${index}.effects.${e}.mode`, $event.target.value)">
                          <option v-for="mode in Object.values(EffectMode)" :key="mode" :value="mode">{{ t(`effectMode.${mode}`) }}</option>
                        </select>
                        <input type="number" :aria-label="t('effects.value')" :value="effect.value" @change="set(`equipment.${index}.effects.${e}.value`, toNumber($event))" />
                        <button type="button" class="danger" :aria-label="t('effects.remove')" @click="set(`equipment.${index}.effects`, item.effects.filter((_, i) => i !== e))">×</button>
                      </div>
                      <button type="button" @click="set(`equipment.${index}.effects`, [...item.effects, newItemEffect()])">{{ t("effects.add") }}</button>
                      <p class="equip-note">{{ t("effects.hint") }}</p>
                      <p v-if="sheet.combat.acMode === AcMode.MANUAL && item.effects.some((x) => x.target === EffectTarget.AC)" class="equip-note">{{ t("effects.acManualNote") }}</p>
                    </div>
                    <template v-if="item.kind === EquipmentKind.ARMOR">
                      <label>{{ t("equip.armorType") }}
                        <span class="hint-row">
                          <select :value="item.armorType" @change="set(`equipment.${index}.armorType`, $event.target.value)">
                            <option v-for="type in Object.values(ArmorType)" :key="type" :value="type">{{ t(`armorType.${type}`) }}</option>
                          </select>
                          <small class="hint">{{ t(`armorHint.${item.armorType}`) }}</small>
                        </span>
                      </label>
                      <label>{{ t("equip.baseAc") }}<input type="number" :value="item.ac" @change="set(`equipment.${index}.ac`, toNumber($event))" /></label>
                    </template>
                    <label v-if="item.kind === EquipmentKind.SHIELD">{{ t("equip.shieldBonus") }}<input type="number" :value="item.ac" @change="set(`equipment.${index}.ac`, toNumber($event))" /></label>
                    <label v-if="item.kind === EquipmentKind.ARMOR || item.kind === EquipmentKind.SHIELD">{{ t("attack.magicBonus") }}<input type="number" :value="item.acBonus" @change="set(`equipment.${index}.acBonus`, toNumber($event))" /></label>
                    <p v-if="(item.kind === EquipmentKind.ARMOR || item.kind === EquipmentKind.SHIELD) && sheet.combat.acMode !== AcMode.AUTO" class="equip-note">{{ t("equip.acNote") }}</p>
                    <label>{{ t("sheet.featureDescription") }}<textarea rows="3" :value="item.description" @change="set(`equipment.${index}.description`, $event.target.value)" /></label>
                  </div>
                </div>
              </template>
            </EditableList>
          </div>
          <p class="stat weight"><strong>{{ weight }}</strong> {{ t("sheet.totalWeight") }}</p>
          <p v-if="load !== Encumbrance.NONE" class="warning">{{ t(`encumbrance.${load}`) }}</p>
        </SheetPanel>
      </div>

      <div class="col notes">
        <SheetPanel :title="t('sheet.rollMode')">
          <select v-model="rollMode" :aria-label="t('sheet.rollMode')">
            <option :value="RollMode.ADVANTAGE">{{ t("rolls.advantage") }}</option>
            <option :value="RollMode.NORMAL">{{ t("rolls.normal") }}</option>
            <option :value="RollMode.DISADVANTAGE">{{ t("rolls.disadvantage") }}</option>
          </select>
        </SheetPanel>

        <section class="plate characteristics">
          <h3 class="characteristics-title">{{ t("sheet.characteristics") }}</h3>
          <SheetPanel v-for="field in personality" :key="field" :frame="PERSONALITY_FRAMES[field]" :title="t(`sheet.${field}`)">
            <LockGear v-if="editable" class="vital-gear" :locked="sheet.locks[field]" @toggle="toggleLock(`locks.${field}`, sheet.locks[field])" />
            <p v-if="sheet.locks[field]" class="trait-text">{{ sheet.text[field] }}</p>
            <textarea v-else rows="3" :value="sheet.text[field]" @change="set(`text.${field}`, $event.target.value)" />
          </SheetPanel>
        </section>

        <h3>{{ t("sheet.resources") }}</h3>
        <EditableList :items="sheet.resources" :editable="editable" card-remove style="--list-cols: 1fr 1fr" :removable="(r) => !r.locked"
          @add="append('resources', newResource())" @remove="removeAt('resources', $event)">
          <template #default="{ item, index }">
            <div class="resource-card vital-frame">
              <div class="resource-top">
                <label>{{ t("sheet.total") }}<input :disabled="item.locked" type="number" min="0" :value="item.total" @change="set(`resources.${index}.total`, toNumber($event))" /></label>
                <LockGear v-if="editable" :locked="item.locked" @toggle="toggleLock(`resources.${index}.locked`, item.locked)" />
              </div>
              <input class="big" type="number" min="0" :aria-label="t('sheet.resourceName')" :value="item.current" @change="set(`resources.${index}.current`, toNumber($event))" />
              <input class="resource-name" :disabled="item.locked" :placeholder="t('sheet.resourceName')" :value="item.name" @change="set(`resources.${index}.name`, $event.target.value)" />
            </div>
          </template>
        </EditableList>

        <SheetPanel :title="t('sheet.features')">
          <input v-model="query" type="search" :placeholder="t('sheet.filter')" />
          <EditableList :items="visibleFeatures" :editable="editable" :removable="(row) => !row.feature.locked" @add="append('features', newFeature())" @remove="removeAt('features', visibleFeatures[$event].index)">
            <template #default="{ item }">
              <details class="feature-card" open>
                <summary>
                  <h4 class="feature-name">{{ item.feature.name || "…" }}</h4>
                  <button v-if="editable" type="button" class="feature-chat" :title="t('feature.print')" :aria-label="t('feature.print')" @click.stop.prevent="printFeature(item)">💬</button>
                  <LockGear v-if="editable" :locked="item.feature.locked" @toggle="toggleLock(`features.${item.index}.locked`, item.feature.locked)" />
                </summary>
                <div class="feature-body">
                  <template v-if="item.feature.locked">
                    <p v-if="item.feature.source" class="feature-source">{{ item.feature.source }}</p>
                    <p class="feature-text">{{ item.feature.description }}</p>
                  </template>
                  <template v-else>
                    <input :placeholder="t('sheet.featureName')" :value="item.feature.name" @change="set(`features.${item.index}.name`, $event.target.value)" />
                    <input :placeholder="t('sheet.featureSource')" :value="item.feature.source" @change="set(`features.${item.index}.source`, $event.target.value)" />
                    <textarea rows="3" :placeholder="t('sheet.featureDescription')" :value="item.feature.description" @change="set(`features.${item.index}.description`, $event.target.value)" />
                  </template>
                </div>
              </details>
            </template>
          </EditableList>
        </SheetPanel>
      </div>
    </div>
  </fieldset>
</template>
