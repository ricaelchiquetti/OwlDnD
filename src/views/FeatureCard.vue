<script setup>
import { t } from "../i18n.js";

defineProps({ card: Object });
</script>

<template>
  <article class="feature-print">
    <h4 v-if="card.name" class="feature-name">{{ card.name }}</h4>
    <p v-if="card.source" class="feature-source">{{ card.source }}</p>
    <p v-for="detail in card.details" :key="detail.label" class="feature-detail"><b>{{ detail.label }}:</b> {{ detail.value }}</p>
    <p v-if="card.description" class="feature-text">{{ card.description }}</p>
    <p v-if="card.higher" class="feature-text"><em><b>{{ t("spells.higherLevels") }}.</b></em> {{ card.higher }}</p>
    <p v-if="card.footer" class="feature-footer">{{ card.footer }}</p>
  </article>
</template>
