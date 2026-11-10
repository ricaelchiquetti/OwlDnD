import OBR from "@owlbear-rodeo/sdk";
import { findLimit, metadataSize, withoutKey } from "./probe.js";

const TEST_KEY = "owldnd/storage-test";
const BASELINE_KEY = "owldnd/storage-baseline";
// Left behind by an earlier, flawed version of this test (it wrote up to 128 KB here and never removed it).
const LEFTOVER_KEY = "owldnd/test";
const BASELINE_BYTES = 4096;
const SEARCH = { low: 256, high: 262144, tolerance: 256 };
const SETTLE_MS = 120;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const without = (metadata) => withoutKey(withoutKey(metadata, TEST_KEY), BASELINE_KEY);

// A refused write does not fail the call (Owlbear reports it in its own console), so the only reliable check is to write a
// value and read it back: if it is not there, it was not stored.
async function measure({ read, write }) {
  const stored = async (key, value) => {
    await write(key, value);
    await sleep(SETTLE_MS);
    return (await read())?.[key] === value;
  };
  const fits = (size) => stored(TEST_KEY, "x".repeat(size));
  try {
    await write(LEFTOVER_KEY, undefined);
    const usage = metadataSize(without(await read()));
    const first = await findLimit(fits, SEARCH);
    // Store a baseline and measure again: if the free space shrinks by about that much, the limit is shared by everything
    // stored; if it does not change, the limit is on each value.
    if (first.capped || first.max < BASELINE_BYTES * 2) return { usage, ...first };
    await write(TEST_KEY, undefined);
    if (!(await stored(BASELINE_KEY, "b".repeat(BASELINE_BYTES)))) return { usage, ...first };
    const second = await findLimit(fits, SEARCH);
    return { usage, ...first, baselineBytes: BASELINE_BYTES, withBaseline: second.max };
  } finally {
    await write(TEST_KEY, undefined);
    await write(BASELINE_KEY, undefined);
  }
}

const room = { read: () => OBR.room.getMetadata(), write: (key, value) => OBR.room.setMetadata({ [key]: value }) };
const scene = { read: () => OBR.scene.getMetadata(), write: (key, value) => OBR.scene.setMetadata({ [key]: value }) };
const player = { read: () => OBR.player.getMetadata(), write: (key, value) => OBR.player.setMetadata({ [key]: value }) };

const itemBucket = (id) => ({
  read: async () => (await OBR.scene.items.getItems([id]))[0]?.metadata,
  write: (key, value) =>
    OBR.scene.items.updateItems([id], ([token]) => {
      if (value === undefined) delete token.metadata[key];
      else token.metadata[key] = value;
    }),
});

async function run(name, bucket) {
  try {
    return { name, ...(await measure(bucket)) };
  } catch (error) {
    return { name, error: error.message };
  }
}

// Room, scene, one token and the player. Each step is reported as it finishes.
export async function measureAll(onStep) {
  const results = [];
  const step = async (name, bucket, skipped) => {
    results.push(skipped ? { name, skipped } : await run(name, bucket));
    onStep?.([...results]);
  };
  await step("room", room);
  const sceneReady = await OBR.scene.isReady();
  await step("scene", scene, sceneReady ? null : "noScene");
  const token = sceneReady ? (await OBR.scene.items.getItems())[0] : null;
  await step("item", token && itemBucket(token.id), sceneReady ? (token ? null : "noToken") : "noScene");
  await step("player", player);
  return results;
}

const ACCESS_KEY = "owldnd/write-check";
const ACCESS_VALUE = "ok";

// Can THIS player write here? A refused write does not fail the call, so write a small value and read it back.
async function canWrite({ read, write }) {
  try {
    await write(ACCESS_KEY, ACCESS_VALUE);
    await sleep(SETTLE_MS);
    return (await read())?.[ACCESS_KEY] === ACCESS_VALUE;
  } finally {
    await write(ACCESS_KEY, undefined);
  }
}

// Room, scene and the first token, with whatever permission the current role has (works for players, unlike measureAll).
export async function checkWriteAccess(onStep) {
  const results = [];
  const step = async (name, bucket, skipped) => {
    let result = { name, skipped };
    if (!skipped) {
      try {
        result = { name, allowed: await canWrite(bucket) };
      } catch (error) {
        result = { name, error: error.message };
      }
    }
    results.push(result);
    onStep?.([...results]);
  };
  await step("room", room);
  const sceneReady = await OBR.scene.isReady();
  await step("scene", scene, sceneReady ? null : "noScene");
  const token = sceneReady ? (await OBR.scene.items.getItems())[0] : null;
  await step("item", token && itemBucket(token.id), sceneReady ? (token ? null : "noToken") : "noScene");
  return results;
}
