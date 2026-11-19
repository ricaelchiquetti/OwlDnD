<script setup>
import { t } from "../i18n.js";
import { assetUrl } from "../assetUrl.js";
import SheetPanel from "./SheetPanel.vue";
import "../sheet-art.css";

defineProps({ sheet: Object, name: String, editable: Boolean });
const emit = defineEmits(["update"]);

const BIO_FIELDS = ["age", "size", "height", "weight", "eyes", "skin", "hair"];
// grid area -> sheet.text key, in the order of the printed page
const PANELS = [["appearance", "appearance"], ["allies", "allies"], ["backstory", "backstory"], ["features", "additionalFeatures"], ["treasure", "treasure"]];
const set = (path, value) => emit("update", path, value);
</script>

<template>
  <fieldset :disabled="!editable" class="sheet paper">
    <header class="sheet-header">
      <div class="banner">
        <img :src="assetUrl('img/BioScroll.svg')" alt="" />
        <h2 :title="name">{{ name }}</h2>
      </div>
      <div class="info-box">
        <div class="bio-fields">
          <label v-for="field in BIO_FIELDS" :key="field">{{ t(`bio.${field}`) }}<input :value="sheet.bio[field]" @change="set(`bio.${field}`, $event.target.value)" /></label>
        </div>
      </div>
    </header>

    <div class="bio-grid">
      <SheetPanel v-for="[area, key] in PANELS" :key="area" :class="`bio-${area}`" :title="t(`bio.${key}`)">
        <textarea :aria-label="t(`bio.${key}`)" :value="sheet.text[key]" @change="set(`text.${key}`, $event.target.value)" />
      </SheetPanel>
    </div>
  </fieldset>
</template>
