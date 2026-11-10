<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { t } from "../i18n.js";
import { messages, user, sendChat, sceneReady } from "../store.js";
import { describeCheck, RollMode } from "../chat.js";
import { signed } from "../sheet.js";
import SheetPanel from "./SheetPanel.vue";
import "../sheet-art.css";

const draft = ref("");
const error = ref("");
const log = ref(null);

const scrollToEnd = () => nextTick(() => log.value && (log.value.scrollTop = log.value.scrollHeight));
watch(() => messages.value.length, scrollToEnd);
onMounted(scrollToEnd);

async function submit() {
  try {
    const result = await sendChat(draft.value);
    error.value = result.error && result.error !== "empty" ? t(`chat.${result.error}`) : "";
    if (!result.error) draft.value = "";
  } catch (failure) {
    error.value = `${t("chat.sendFailed")}: ${failure.message}`;
  }
}

const timeOf = (message) => new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// A sheet roll is a stack of framed boxes: the d20 check first, then one box per damage line.
const boxCount = (message) => (message.check ? 1 : 0) + (message.damage?.length ?? 0);
const frameFor = (message, index) => {
  if (index === 0) return "vital-top";
  return index === boxCount(message) - 1 ? "vital-bottom" : "vital-mid";
};
// Like the printed example: the discarded die on the left, the one that counts on the right.
const shownDice = (check) => {
  const dice = check.rolls.map((value, index) => ({ value: value + check.modifier, kept: index === check.kept }));
  return [...dice.filter((d) => !d.kept), ...dice.filter((d) => d.kept)];
};
const damageIndex = (message, i) => i + (message.check ? 1 : 0);
</script>

<template>
  <div class="chat">
    <ol ref="log" class="chat-log" aria-live="polite">
      <li v-if="!sceneReady" class="muted">{{ t("chat.noScene") }}</li>
      <li v-else-if="!messages.length" class="muted">{{ t("chat.empty") }}</li>
      <li v-for="message in messages" :key="message.id" class="chat-message" :class="[message.kind, { mine: message.authorId === user.id }]">
        <header>
          <strong>{{ message.author }}<template v-if="message.role === 'GM'"> (GM)</template></strong>
          <time>{{ timeOf(message) }}</time>
        </header>

        <template v-if="message.kind === 'sheet'">
          <p v-if="message.character" class="roll-character">{{ message.character }}</p>
          <div class="roll-card stack">
            <SheetPanel v-if="message.check" :frame="frameFor(message, 0)">
              <div class="check-numbers">
                <span v-for="(die, index) in shownDice(message.check)" :key="index" class="check-cell" :class="die.kept ? 'kept' : 'dropped'" :title="describeCheck(message.check)">
                  {{ die.value }}
                </span>
              </div>
              <template #caption>
                <span class="roll-title">{{ message.label }}</span>
                <small v-if="message.check.modifier" class="roll-soft"> ({{ signed(message.check.modifier) }})</small>
                <small v-if="message.check.mode !== RollMode.NORMAL" class="roll-soft"> · {{ t(`rolls.${message.check.mode}`) }}</small>
                <small v-if="message.crit" class="roll-crit"> · {{ t("rolls.critical") }}</small>
              </template>
            </SheetPanel>
            <SheetPanel v-for="(line, i) in message.damage ?? []" :key="i" :frame="frameFor(message, damageIndex(message, i))">
              <strong class="damage-total" :title="line.detail">{{ line.total }}</strong>
              <template #caption>
                <template v-if="!message.check && i === 0">
                  <span class="roll-title">{{ message.label }}</span>
                  <small v-if="line.type" class="roll-soft"> · </small>
                </template>
                <em class="roll-type">{{ line.type }}</em>
              </template>
            </SheetPanel>
          </div>
        </template>

        <template v-else-if="message.kind === 'feature'">
          <p v-if="message.character" class="roll-character">{{ message.character }}</p>
          <article class="feature-print">
            <h4 v-if="message.name" class="feature-name">{{ message.name }}</h4>
            <p v-if="message.source" class="feature-source">{{ message.source }}</p>
            <p v-if="message.description" class="feature-text">{{ message.description }}</p>
          </article>
        </template>

        <template v-else-if="message.kind === 'roll'">
          <p v-if="message.label" class="roll-label">{{ message.label }}</p>
          <p class="roll-expression">🎲 {{ message.expression }}</p>
          <p class="roll-detail">{{ message.detail }}</p>
          <p class="roll-total">{{ message.total }}</p>
        </template>
        <p v-else class="chat-text">{{ message.text }}</p>
      </li>
    </ol>
    <p v-if="error" class="chat-error" role="alert">{{ error }}</p>
    <form @submit.prevent="submit">
      <input v-model="draft" maxlength="500" :placeholder="t('chat.placeholder')" :aria-label="t('chat.placeholder')" autocomplete="off" />
      <button type="submit">{{ t("chat.send") }}</button>
    </form>
  </div>
</template>
