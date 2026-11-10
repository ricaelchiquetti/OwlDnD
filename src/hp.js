const INPUT = /^([+-]?)(\d+)$/;
const clamp = (value, max) => Math.min(Math.max(value, 0), max);

// "+5" / "-5" are deltas, "12" is an absolute value; null when the text is not a number.
function parse(text) {
  const match = INPUT.exec(String(text).trim());
  return match && { sign: match[1], amount: Number(match[2]) };
}

// Damage eats temporary hit points first, the rest comes off the current ones.
export function applyHpInput({ current, max, temp }, text) {
  const input = parse(text);
  if (!input) return null;
  const { sign, amount } = input;
  if (sign === "+") return { current: clamp(current + amount, max), max, temp };
  if (sign === "-") {
    const absorbed = Math.min(temp, amount);
    return { current: clamp(current - (amount - absorbed), max), max, temp: temp - absorbed };
  }
  return { current: clamp(amount, max), max, temp };
}

export function applyTempInput(temp, text) {
  const input = parse(text);
  if (!input) return null;
  const { sign, amount } = input;
  if (sign === "+") return temp + amount;
  return sign === "-" ? Math.max(temp - amount, 0) : amount;
}

// null when there is no maximum: nothing to draw (and nothing to edit).
export function hpBarModel({ hpCurrent, hpMax, hpTemp }) {
  if (!(hpMax > 0)) return null;
  return { label: `${hpCurrent}/${hpMax}`, fraction: clamp(hpCurrent / hpMax, 1), temp: hpTemp };
}

const PILL_SEGMENTS = 10;

// Outline of a stadium (rounded ends), clockwise from the top-left; Owlbear shapes have no rounded corners.
export function pillPoints({ x, y, width, height }, segments = PILL_SEGMENTS) {
  const r = height / 2;
  const arc = (cx, from) =>
    Array.from({ length: segments + 1 }, (_, i) => {
      const angle = from + (Math.PI * i) / segments;
      return { x: cx + r * Math.cos(angle), y: y + r + r * Math.sin(angle) };
    });
  return [...arc(x + width - r, -Math.PI / 2), ...arc(x + r, Math.PI / 2)];
}

// The AC shield outline of the sheet (public/img/AC.svg, 48 x 55.08), clockwise from the top peak.
const SHIELD_OUTLINE = [
  [24, 0.78], [40.69, 5.88], [41.5, 12], [47.27, 15.76], [47.27, 27.6], [42, 40], [34, 49], [24, 54.3],
  [14, 49], [6, 40], [0.73, 27.6], [0.73, 15.76], [6.5, 12], [7.31, 5.88],
];
const SHIELD_VIEWBOX = { width: 48, height: 54.3 };

export const shieldPoints = ({ x, y, width, height }) =>
  SHIELD_OUTLINE.map(([px, py]) => ({ x: x + (px / SHIELD_VIEWBOX.width) * width, y: y + (py / SHIELD_VIEWBOX.height) * height }));
