<script setup>
import { computed } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { t } from "../i18n.js";
import { items, user, saveItems } from "../store.js";
import { visibleCharacters, SHEET_TOKEN_KEY } from "../journal.js";
import { LINK_MODAL_ID } from "../itemModal.js";

const tokenId = new URLSearchParams(location.search).get("token");
const characters = computed(() => visibleCharacters(items.value, user.value));
const close = () => OBR.modal.close(LINK_MODAL_ID);

async function link(sheetId) {
  try {
    const [token] = await OBR.scene.items.getItems([tokenId]);
    await OBR.scene.items.updateItems([tokenId], ([linked]) => { linked.metadata[SHEET_TOKEN_KEY] = sheetId; });
    // Characters made before icons existed get theirs from the first linked token.
    const url = token?.image?.url;
    if (url) await saveItems(items.value.map((i) => (i.id === sheetId && !i.image ? { ...i, image: url } : i)));
    close();
  } catch (error) {
    OBR.notification.show(`${t("link.failed")}: ${error.message}`, "ERROR");
  }
}
</script>

<template>
  <main>
    <h2>{{ t("link.title") }}</h2>
    <p v-if="!characters.length" class="muted">{{ t("link.empty") }}</p>
    <ul class="items">
      <li v-for="c in characters" :key="c.id">
        <button @click="link(c.id)"><strong>{{ c.title }}</strong></button>
      </li>
    </ul>
    <button @click="close">{{ t("journal.close") }}</button>
  </main>
</template>
