<script setup>
import OBR from "@owlbear-rodeo/sdk";
import { t } from "../i18n.js";
import { TRACKER_ID } from "../itemModal.js";
import Initiative from "./Initiative.vue";

// Closing only hides it for this player; opening it again from the toolbar shows it for everyone.
const close = () => OBR.popover.close(TRACKER_ID);
</script>

<template>
  <div class="tracker">
    <header>
      <strong>{{ t("initiative.title") }}</strong>
      <button type="button" aria-label="Close" @click="close">×</button>
    </header>
    <main><Initiative /></main>
  </div>
</template>
