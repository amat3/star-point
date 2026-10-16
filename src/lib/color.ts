// Small color helpers (hex in, hex out) for the places where a color has to be computed, not just written.

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

function rgbToHex([r, g, b]: Rgb) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** `rgba(r, g, b, alpha)` from a hex color. */
export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Like CSS `color-mix(in srgb, a, b pct%)`: `pct` is how much of `b` goes in. */
export function mix(a: string, b: string, pct: number) {
  const [ra, rb] = [hexToRgb(a), hexToRgb(b)]
  return rgbToHex(ra.map((v, i) => v * (1 - pct / 100) + rb[i] * (pct / 100)) as Rgb)
}
