<script setup>
import { computed, ref, watch } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { t, locale, setLocale, LOCALES } from "../i18n.js";
import { Theme, theme, setTheme } from "../theme.js";
import { connected, user } from "../store.js";
import { measureAll, checkWriteAccess } from "../storageProbe.js";
import { limitSummary, formatKb } from "../probe.js";

const MARKER_KEY = "owldnd/persistence-marker";
const marker = ref({ player: null, browser: null });
const readMarker = async () => (marker.value = { player: (await OBR.player.getMetadata())[MARKER_KEY] ?? null, browser: localStorage.getItem(MARKER_KEY) });
const writeMarker = async (value) => {
  await OBR.player.setMetadata({ [MARKER_KEY]: value });
  if (value === undefined) localStorage.removeItem(MARKER_KEY);
  else localStorage.setItem(MARKER_KEY, value);
  await readMarker();
};
watch(connected, (ready) => ready && readMarker(), { immediate: true });

const running = ref(false);
const results = ref([]);
const access = ref([]);
const checking = ref(false);
const canCheck = computed(() => connected.value && !checking.value);
const canRun = computed(() => connected.value && user.value.role === "GM" && !running.value);

async function runProbe() {
  running.value = true;
  results.value = [];
  try {
    await measureAll((steps) => (results.value = steps));
  } finally {
    running.value = false;
  }
}

async function runAccess() {
  checking.value = true;
  access.value = [];
  try {
    await checkWriteAccess((steps) => (access.value = steps));
  } finally {
    checking.value = false;
  }
}

const accessText = (result) => {
  if (result.skipped) return t(`probe.${result.skipped}`);
  if (result.error) return `${t("probe.error")}: ${result.error}`;
  return result.allowed ? t("probe.allowed") : t("probe.denied");
};

function verdict(result) {
  if (result.skipped) return t(`probe.${result.skipped}`);
  if (result.error) return `${t("probe.error")}: ${result.error}`;
  const summary = limitSummary(result);
  if (summary.kind === "none" || summary.kind === "blocked") return t(`probe.${summary.kind}`);
  return `${t(`probe.${summary.kind}`)} (${formatKb(summary.totalBytes)})`;
}
</script>

<template>
  <label>
    {{ t("settings.language") }}
    <select :value="locale" @change="setLocale($event.target.value)">
      <option v-for="(name, code) in LOCALES" :key="code" :value="code">{{ name }}</option>
    </select>
  </label>
  <label>
    {{ t("settings.theme") }}
    <select :value="theme" @change="setTheme($event.target.value)">
      <option v-for="mode in Object.values(Theme)" :key="mode" :value="mode">{{ t(`theme.${mode}`) }}</option>
    </select>
  </label>

  <details class="diagnostics">
    <summary>{{ t("probe.title") }}</summary>
    <p class="muted">{{ t("probe.hint") }}</p>
    <button type="button" :disabled="!canRun" @click="runProbe">{{ running ? t("probe.running") : t("probe.run") }}</button>
    <p v-if="connected && user.role !== 'GM'" class="muted">{{ t("probe.gmOnly") }}</p>

    <h4>{{ t("probe.persistTitle") }}</h4>
    <p class="muted">{{ t("probe.persistHint") }}</p>
    <button type="button" :disabled="!connected" @click="writeMarker(new Date().toLocaleString())">{{ t("probe.persistWrite") }}</button>
    <button type="button" :disabled="!connected" @click="writeMarker(undefined)">{{ t("probe.persistClear") }}</button>
    <table class="access">
      <tbody>
        <tr><th scope="row">{{ t("probe.persistPlayer") }}</th><td>{{ marker.player ?? "—" }}</td></tr>
        <tr><th scope="row">{{ t("probe.persistBrowser") }}</th><td>{{ marker.browser ?? "—" }}</td></tr>
      </tbody>
    </table>

    <h4>{{ t("probe.accessTitle") }}</h4>
    <p class="muted">{{ t("probe.accessHint") }}</p>
    <button type="button" :disabled="!canCheck" @click="runAccess">{{ checking ? t("probe.running") : t("probe.accessRun") }}</button>
    <table v-if="access.length" class="access">
      <tbody>
        <tr v-for="result in access" :key="result.name" :class="{ denied: result.allowed === false }">
          <th scope="row">{{ t(`probe.${result.name}`) }}</th>
          <td>{{ accessText(result) }}</td>
        </tr>
      </tbody>
    </table>

    <h4 v-if="results.length">{{ t("probe.limitsTitle") }}</h4>
    <table v-if="results.length">
      <thead>
        <tr><th>{{ t("probe.area") }}</th><th>{{ t("probe.inUse") }}</th><th>{{ t("probe.accepts") }}</th><th>{{ t("probe.verdict") }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="result in results" :key="result.name">
          <th scope="row">{{ t(`probe.${result.name}`) }}</th>
          <template v-if="result.skipped || result.error"><td colspan="3">{{ verdict(result) }}</td></template>
          <template v-else>
            <td>{{ formatKb(result.usage) }}</td>
            <td>{{ result.capped ? "≥ " : "" }}{{ formatKb(result.max) }}</td>
            <td>{{ verdict(result) }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </details>
</template>
