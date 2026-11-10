// Pure helpers for the storage test (no Owlbear imports, so they can be tested in Node).

const KNOWN_LIMIT_BYTES = 16384;
const SHARED_LIMIT_TOLERANCE = 1024;
const BYTES_PER_KB = 1024;
const RESOLUTION_BYTES = 256;

// Largest size that fits, by binary search (assumes that if a size fits, every smaller one does).
// `capped` means everything up to `high` fit, so the real limit is not known.
export async function findLimit(fits, { low, high, tolerance }) {
  if (!(await fits(low))) return { max: 0, capped: false };
  if (await fits(high)) return { max: high, capped: true };
  let accepted = low;
  let refused = high;
  while (refused - accepted > tolerance) {
    const middle = Math.floor((accepted + refused) / 2);
    if (await fits(middle)) accepted = middle;
    else refused = middle;
  }
  return { max: accepted, capped: false };
}

export const metadataSize = (metadata) => new TextEncoder().encode(JSON.stringify(metadata ?? {})).length;

export function withoutKey(metadata, key) {
  const { [key]: _removed, ...rest } = metadata ?? {};
  return rest;
}

// How much the free space shrank when a baseline value was stored first tells the kind of limit apart: about the baseline
// means one limit shared by everything stored; unchanged means a limit on each value. (Usage alone cannot tell them apart when
// the area is empty.) Without a baseline it falls back to "usage + free space is about 16 kB".
export function limitSummary({ usage, max, capped, baselineBytes, withBaseline }) {
  if (capped) return { kind: "none", totalBytes: usage + max };
  if (max === 0) return { kind: "blocked", totalBytes: usage };
  const totalBytes = usage + max;
  if (withBaseline !== undefined) {
    const shrink = max - withBaseline;
    const tolerance = RESOLUTION_BYTES * 2;
    if (Math.abs(shrink - baselineBytes) <= tolerance) return { kind: "total", totalBytes };
    if (Math.abs(shrink) <= tolerance) return { kind: "perValue", totalBytes };
    return { kind: "other", totalBytes };
  }
  return { kind: Math.abs(totalBytes - KNOWN_LIMIT_BYTES) <= SHARED_LIMIT_TOLERANCE ? "total" : "other", totalBytes };
}

export const formatKb = (bytes) => `${Number((bytes / BYTES_PER_KB).toFixed(1))} KB`;
