<script setup>
// Framed block with the caption below, like the printed sheet. Frame art lives in public/img (see sheet-art.css).
defineProps({ title: String, frame: { type: String, default: "box" } });
</script>

<template>
  <section class="panel" :class="`frame-${frame}`">
    <div class="panel-body"><slot /></div>
    <h3 v-if="title || $slots.caption" class="caption"><slot name="caption">{{ title }}</slot></h3>
  </section>
</template>
