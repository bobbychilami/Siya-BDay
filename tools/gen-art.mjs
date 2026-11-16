/**
 * Art generator — builds the original botanical SVG sprite used across the site.
 * Run with: node tools/gen-art.mjs
 * Output: src/js/art.generated.js  (committed, deterministic)
 *
 * All artwork here is drawn from scratch for this invitation. No third-party vectors.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/js/art.generated.js');

const n = (v) => Math.round(v * 100) / 100;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- petals & leaves ---------------- */
// Ruffled, asymmetric petal growing up from (0,0). Width 2w, height l.
function petalPath(w = 33, l = 84) {
  const W = w, L = l;
  return `M0 0
  C ${n(W * 0.62)} ${n(-L * 0.05)} ${n(W)} ${n(-L * 0.28)} ${n(W)} ${n(-L * 0.55)}
  C ${n(W)} ${n(-L * 0.73)} ${n(W * 0.86)} ${n(-L * 0.9)} ${n(W * 0.5)} ${n(-L * 0.86)}
  C ${n(W * 0.32)} ${n(-L * 0.84)} ${n(W * 0.2)} ${n(-L * 0.97)} 0 ${n(-L * 0.92)}
  C ${n(-W * 0.2)} ${n(-L * 0.97)} ${n(-W * 0.32)} ${n(-L * 0.84)} ${n(-W * 0.5)} ${n(-L * 0.86)}
  C ${n(-W * 0.86)} ${n(-L * 0.9)} ${n(-W)} ${n(-L * 0.73)} ${n(-W)} ${n(-L * 0.55)}
  C ${n(-W)} ${n(-L * 0.28)} ${n(-W * 0.62)} ${n(-L * 0.05)} 0 0 Z`;
}

function leafPath(len = 34, wid = 13) {
  const L = len, W = wid;
  return `M0 0 C ${n(W)} ${n(-L * 0.26)} ${n(W * 0.88)} ${n(-L * 0.66)} 0 ${n(-L)} C ${n(-W * 0.88)} ${n(-L * 0.66)} ${n(-W)} ${n(-L * 0.26)} 0 0 Z`;
}

/* ---------------- palettes ---------------- */
const PALETTES = {
  blush: { name: 'blush', deep: '#D9A9A6', mid: '#E8C3BF', light: '#F6DED8', edge: '#B67D82', core: '#C98F96' },
  rose:  { name: 'rose',  deep: '#BC8088', mid: '#D49CA0', light: '#EBC5C4', edge: '#8E4E5B', core: '#A96E77' },
  wine:  { name: 'wine',  deep: '#45101D', mid: '#6C2232', light: '#8A3546', edge: '#2A0710', core: '#3A0D18' },
  ivory: { name: 'ivory', deep: '#E2C7A8', mid: '#F0DAC2', light: '#FCF0E2', edge: '#B08A63', core: '#C9A886' },
};

function gradientDefs() {
  return Object.values(PALETTES).map((p) => `
  <linearGradient id="pg-${p.name}" x1="0" y1="1" x2="0.18" y2="0">
    <stop offset="0%" stop-color="${p.deep}"/>
    <stop offset="52%" stop-color="${p.mid}"/>
    <stop offset="100%" stop-color="${p.light}"/>
  </linearGradient>
  <linearGradient id="pg-${p.name}-deep" x1="0" y1="1" x2="0.1" y2="0">
    <stop offset="0%" stop-color="${p.edge}"/>
    <stop offset="60%" stop-color="${p.deep}"/>
    <stop offset="100%" stop-color="${p.mid}"/>
  </linearGradient>
  <radialGradient id="pc-${p.name}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${p.edge}" stop-opacity=".85"/>
    <stop offset="100%" stop-color="${p.edge}" stop-opacity="0"/>
  </radialGradient>`).join('');
}

/* ---------------- flowers ---------------- */
function flowerSymbol(id, pal, opts = {}) {
  const rnd = mulberry32(id.length * 97 + 11);
  const rings = opts.rings || [
    { count: 7, scale: 1.0, grad: 'deep', op: 0.9, off: 0, w: 36 },
    { count: 6, scale: 0.84, grad: 'base', op: 0.95, off: 26, w: 34 },
    { count: 5, scale: 0.63, grad: 'base', op: 0.97, off: 10, w: 31 },
    { count: 4, scale: 0.45, grad: 'deep', op: 0.98, off: 42, w: 29 },
    { count: 4, scale: 0.28, grad: 'base', op: 1, off: 74, w: 26 },
  ];
  let petals = '';
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (360 / ring.count) * i + ring.off + (rnd() - 0.5) * 6;
      const sc = ring.scale * (0.93 + rnd() * 0.14);
      const tilt = (rnd() - 0.5) * 8;
      const fill = ring.grad === 'deep' ? `url(#pg-${pal.name}-deep)` : `url(#pg-${pal.name})`;
      petals += `<g transform="rotate(${n(a)} 100 100) translate(100 100) rotate(${n(tilt)}) scale(${n(sc)})"><path d="${petalPath(ring.w, 84)}" fill="${fill}" fill-opacity="${ring.op}" stroke="${pal.edge}" stroke-opacity=".2" stroke-width=".6"/></g>`;
    }
  });
  return `<symbol id="${id}" viewBox="0 0 200 200">
  <g>
    ${petals}
    <circle cx="100" cy="100" r="44" fill="url(#pc-${pal.name})" opacity=".46"/>
    <circle cx="86" cy="80" r="40" fill="url(#lightSoft)" opacity=".22"/>
    <g fill="${pal.core}" opacity=".7">
      <circle cx="100" cy="94" r="2.2"/><circle cx="108" cy="100" r="1.9"/>
      <circle cx="103" cy="108" r="1.7"/><circle cx="93" cy="106" r="1.8"/>
      <circle cx="90" cy="97" r="1.9"/>
    </g>
  </g>
</symbol>`;
}

/* ---------------- foliage ---------------- */
function branch({ x = 0, y = 0, angle = -70, len = 150, curve = 34, count = 7, seed = 1, tone = 'gold', flip = 1, leafScale = 1 }) {
  const rnd = mulberry32(seed);
  const rad = (angle * Math.PI) / 180;
  const ex = x + Math.cos(rad) * len;
  const ey = y + Math.sin(rad) * len;
  const mx = (x + ex) / 2 + Math.cos(rad + Math.PI / 2) * curve * flip;
  const my = (y + ey) / 2 + Math.sin(rad + Math.PI / 2) * curve * flip;
  const stem = tone === 'gold' ? '#BC9457' : '#9C8464';
  const leafFill = tone === 'gold' ? '#E8CEA2' : '#CBB69C';
  const vein = tone === 'gold' ? '#A9823F' : '#8C7358';
  let out = `<path d="M${n(x)} ${n(y)} Q ${n(mx)} ${n(my)} ${n(ex)} ${n(ey)}" fill="none" stroke="${stem}" stroke-width="1.35" stroke-linecap="round" opacity=".9"/>`;
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * ey;
    const tang = Math.atan2(2 * (1 - t) * (my - y) + 2 * t * (ey - my), 2 * (1 - t) * (mx - x) + 2 * t * (ex - mx));
    const deg = (tang * 180) / Math.PI;
    const side = i % 2 === 0 ? 1 : -1;
    const l = 30 * (1 - t * 0.5) * (0.9 + rnd() * 0.28) * leafScale;
    const w = l * 0.38;
    const rot = deg + side * (44 + rnd() * 16);
    out += `<g transform="translate(${n(px)} ${n(py)}) rotate(${n(rot)})">
      <path d="${leafPath(l, w)}" fill="${leafFill}" fill-opacity=".72" stroke="${vein}" stroke-width=".6"/>
      <path d="M0 0 L0 ${n(-l * 0.86)}" stroke="${vein}" stroke-width=".45" opacity=".55"/>
    </g>`;
    if (i === count - 1) {
      out += `<g transform="translate(${n(px)} ${n(py)}) rotate(${n(deg - 18)})">
        <ellipse cx="0" cy="-7" rx="4.8" ry="6.6" fill="#C98F96" opacity=".9"/>
        <ellipse cx="0" cy="-9" rx="2.4" ry="3.6" fill="#EAC5C0" opacity=".95"/>
        <path d="M0 0 L0 -5" stroke="#9C8464" stroke-width=".6"/>
      </g>`;
    }
  }
  return out;
}

/* ---------------- bouquet ---------------- */
function bouquet(id, { w = 320, h = 320, seed = 3, tints = ['rose', 'blush', 'wine'], big = 1 } = {}) {
  const rnd = mulberry32(seed);
  const cx = w / 2, cy = h * 0.55;
  let out = '';
  // back sprays
  out += branch({ x: cx + 6, y: cy + 52, angle: -152, len: 134 * big, curve: 30, count: 7, seed: seed + 1 });
  out += branch({ x: cx + 4, y: cy + 52, angle: -28, len: 138 * big, curve: -32, count: 7, seed: seed + 2 });
  out += branch({ x: cx, y: cy + 58, angle: -178, len: 100, curve: 22, count: 5, seed: seed + 3 });
  out += branch({ x: cx, y: cy + 58, angle: -2, len: 104, curve: -24, count: 5, seed: seed + 4 });

  const blooms = [
    { id: tints[0], x: cx - 10, y: cy - 14, s: 1.06 * big, r: -6 },
    { id: tints[1], x: cx + 58, y: cy + 20, s: 0.76 * big, r: 12 },
    { id: tints[2], x: cx - 68, y: cy + 24, s: 0.66 * big, r: -16 },
    { id: tints[1], x: cx + 34, y: cy - 66, s: 0.5 * big, r: 8 },
    { id: tints[2], x: cx - 48, y: cy - 56, s: 0.42 * big, r: -12 },
  ];
  blooms.forEach((b) => {
    out += `<g transform="translate(${n(b.x - 100 * b.s)} ${n(b.y - 100 * b.s)}) scale(${n(b.s)}) rotate(${n(b.r)} 100 100)"><use href="#peony-${b.id}"/></g>`;
  });
  // front foliage + buds
  out += branch({ x: cx - 26, y: cy + 62, angle: -118, len: 80, curve: 20, count: 4, seed: seed + 7 });
  out += branch({ x: cx + 30, y: cy + 66, angle: -60, len: 86, curve: -20, count: 4, seed: seed + 8 });
  out += `<g transform="translate(${cx - 92} ${cy + 54}) rotate(-38)"><ellipse rx="6.4" ry="9.4" fill="#C98F96"/><ellipse cx="-1.6" cy="-2" rx="3.2" ry="4.8" fill="#EFD2CC"/></g>`;
  out += `<g transform="translate(${cx + 88} ${cy + 58}) rotate(32)"><ellipse rx="5.6" ry="8.4" fill="#B0707C"/><ellipse cx="2" cy="-2" rx="2.8" ry="4.2" fill="#EAC5C0"/></g>`;
  void rnd;
  return `<symbol id="${id}" viewBox="0 0 ${w} ${h}">
  <g>${out}</g>
</symbol>`;
}

/* ---------------- single sprig ---------------- */
function sprigSymbol(id, seed = 5, flip = 1) {
  return `<symbol id="${id}" viewBox="0 0 160 220">
  <g>${branch({ x: 80, y: 210, angle: -96, len: 186, curve: 26 * flip, count: 8, seed, flip })}</g>
</symbol>`;
}

/* ---------------- flourish divider ---------------- */
function flourish(id, color = '#B08A4F') {
  return `<symbol id="${id}" viewBox="0 0 240 34">
  <g fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round">
    <path d="M6 17 C40 17 64 17 96 17"/>
    <path d="M234 17 C200 17 176 17 144 17"/>
    <path d="M96 17 C102 7 114 5 119 11 C124 17 117 24 111 21 C105 18 108 10 118 10 C130 10 136 20 126 26"/>
    <path d="M144 17 C138 7 126 5 121 11 C116 17 123 24 129 21 C135 18 132 10 122 10 C110 10 104 20 114 26"/>
    <circle cx="120" cy="17" r="2.2" fill="${color}" stroke="none"/>
    <path d="M22 17 C28 11 35 11 38 15 C41 19 36 23 32 20"/>
    <path d="M218 17 C212 11 205 11 202 15 C199 19 204 23 208 20"/>
    <circle cx="120" cy="8" r="1" fill="${color}" stroke="none" opacity=".8"/>
  </g>
</symbol>`;
}

/* ---------------- wax seal blob ---------------- */
function sealBlob(points = 44, baseR = 52, seed = 9) {
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (Math.PI * 2 * i) / points;
    const r = baseR + Math.sin(a * 3.1) * 1.6 + Math.sin(a * 7.3 + 1.2) * 1.1 + (rnd() - 0.5) * 1.6;
    pts.push([60 + Math.cos(a) * r, 60 + Math.sin(a) * r]);
  }
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + ' Z';
}

/* ---------------- torn edge ---------------- */
function tornEdge(seed = 5, w = 1200, h = 20) {
  const rnd = mulberry32(seed);
  const steps = 240;
  let d = `M0 ${h} L0 ${n(h * 0.84)}`;
  for (let i = 1; i <= steps; i++) {
    const x = (w / steps) * i;
    const base = h * 0.84 + Math.sin(i * 0.34 + seed) * h * 0.05;
    const fibre = (rnd() - 0.5) * h * 0.2;
    const notch = rnd() > 0.955 ? -h * 0.22 : 0;
    d += ` L${n(x)} ${n(base + fibre + notch)}`;
  }
  d += ` L${w} ${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${d}" fill="currentColor"/></svg>`;
}

/* ---------------- damask pattern ---------------- */
// Fine damascene tile: a palmette with acanthus curls, repeated on a lattice.
function damaskMotif(cx, cy, s = 1, op = 0.3) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <g fill="#190309" fill-opacity="${op}">
      <path d="M0 21 C-5 14 -7 5 -5 -4 C-3 0 -1 5 0 9 C-1 4 -1 -3 0 -10 C1 -3 1 4 0 9 C1 5 3 0 5 -4 C7 5 5 14 0 21 Z"/>
      <path d="M-5 -4 C-12 -9 -18 -6 -19 1 C-13 0 -8 -1 -5 -2 Z"/>
      <path d="M5 -4 C12 -9 18 -6 19 1 C13 0 8 -1 5 -2 Z"/>
      <path d="M0 -10 C-4 -15 -3 -20 0 -24 C3 -20 4 -15 0 -10 Z"/>
    </g>
    <g fill="none" stroke="#190309" stroke-opacity="${op * 0.85}" stroke-width=".65" stroke-linecap="round">
      <path d="M0 21 C-1 26 -1 31 0 36"/>
      <path d="M-19 1 C-24 4 -25 9 -22 12"/>
      <path d="M19 1 C24 4 25 9 22 12"/>
    </g>
    <g fill="none" stroke="#E9C491" stroke-opacity="${op * 0.3}" stroke-width=".5">
      <path d="M0 21 C-5 14 -7 5 -5 -4 M0 -10 C-4 -15 -3 -20 0 -24"/>
    </g>
  </g>`;
}

function damask(id = 'damask') {
  const W = 56;
  const H = 76;
  return `<pattern id="${id}" width="${W}" height="${H}" patternUnits="userSpaceOnUse">
    <g>
      ${damaskMotif(W / 2, H / 2, 0.92, 0.3)}
      ${damaskMotif(0, 0, 0.62, 0.26)}
      ${damaskMotif(W, 0, 0.62, 0.26)}
      ${damaskMotif(0, H, 0.62, 0.26)}
      ${damaskMotif(W, H, 0.62, 0.26)}
    </g>
  </pattern>`;
}

/* ---------------- butterfly ---------------- */
export function butterflyMarkup({ tint = 'rose', cls = '' } = {}) {
  const tones = {
    rose: ['#EAC3C6', '#C98F96', '#8E4E5B'],
    gold: ['#F5E5C6', '#D8B77B', '#A9823F'],
    wine: ['#8B3547', '#5A1728', '#3A0D18'],
  }[tint];
  return `<svg class="butterfly ${cls}" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
  <g class="butterfly__wings">
    <g class="butterfly__wing butterfly__wing--l">
      <path d="M58 52 C40 24 10 16 6 37 C2 56 26 66 56 60 Z" fill="${tones[0]}" fill-opacity=".9" stroke="${tones[2]}" stroke-width=".9"/>
      <path d="M57 60 C40 62 18 72 22 84 C26 95 48 84 58 68 Z" fill="${tones[1]}" fill-opacity=".9" stroke="${tones[2]}" stroke-width=".8"/>
      <path d="M52 48 C40 36 22 32 18 40 M54 62 C40 66 30 74 30 80" fill="none" stroke="${tones[2]}" stroke-width=".7" opacity=".5"/>
      <circle cx="26" cy="40" r="2.4" fill="${tones[2]}" opacity=".3"/>
    </g>
    <g class="butterfly__wing butterfly__wing--r">
      <path d="M62 52 C80 24 110 16 114 37 C118 56 94 66 64 60 Z" fill="${tones[0]}" fill-opacity=".9" stroke="${tones[2]}" stroke-width=".9"/>
      <path d="M63 60 C80 62 102 72 98 84 C94 95 72 84 62 68 Z" fill="${tones[1]}" fill-opacity=".9" stroke="${tones[2]}" stroke-width=".8"/>
      <path d="M68 48 C80 36 98 32 102 40 M66 62 C80 66 90 74 90 80" fill="none" stroke="${tones[2]}" stroke-width=".7" opacity=".5"/>
      <circle cx="94" cy="40" r="2.4" fill="${tones[2]}" opacity=".3"/>
    </g>
    <ellipse cx="60" cy="58" rx="3.1" ry="12" fill="${tones[2]}" opacity=".9"/>
    <path d="M58 46 C54 38 48 34 44 33 M62 46 C66 38 72 34 76 33" fill="none" stroke="${tones[2]}" stroke-width="1" stroke-linecap="round" opacity=".8"/>
    <circle cx="44" cy="33" r="1.4" fill="${tones[2]}"/><circle cx="76" cy="33" r="1.4" fill="${tones[2]}"/>
  </g>
</svg>`;
}

/* ---------------- assemble ---------------- */
const defs = `<defs>
  <radialGradient id="shadeSoft" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#5A1728" stop-opacity=".5"/>
    <stop offset="62%" stop-color="#5A1728" stop-opacity=".16"/>
    <stop offset="100%" stop-color="#5A1728" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lightSoft" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#FFF8F1" stop-opacity=".9"/>
    <stop offset="70%" stop-color="#FFF8F1" stop-opacity=".2"/>
    <stop offset="100%" stop-color="#FFF8F1" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#F3DFB6"/>
    <stop offset="42%" stop-color="#D8B77B"/>
    <stop offset="100%" stop-color="#A9823F"/>
  </linearGradient>
  ${gradientDefs()}
  ${damask('damask')}
</defs>`;

const symbols = [
  flowerSymbol('peony-blush', PALETTES.blush),
  flowerSymbol('peony-rose', PALETTES.rose),
  flowerSymbol('peony-wine', PALETTES.wine),
  flowerSymbol('peony-ivory', PALETTES.ivory),
  bouquet('bouquet-a', { seed: 11, tints: ['rose', 'blush', 'wine'] }),
  bouquet('bouquet-b', { seed: 23, tints: ['blush', 'rose', 'rose'] }),
  bouquet('bouquet-c', { seed: 37, tints: ['wine', 'rose', 'blush'] }),
  bouquet('bouquet-small', { seed: 47, tints: ['blush', 'ivory', 'rose'], big: 0.9 }),
  sprigSymbol('sprig-a', 5, 1),
  sprigSymbol('sprig-b', 13, -1),
  flourish('flourish'),
].join('\n');

const sprite = `<svg id="art-sprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">${defs}${symbols}</svg>`;

const extras = {
  sealBlob: sealBlob(),
  torn: tornEdge(5),
  tornAlt: tornEdge(19),
  butterflyRose: butterflyMarkup({ tint: 'rose' }),
  butterflyGold: butterflyMarkup({ tint: 'gold' }),
  butterflyWine: butterflyMarkup({ tint: 'wine' }),
};

const file = `/* AUTO-GENERATED by tools/gen-art.mjs — original artwork for Siya's invitation. */
export const SPRITE = ${JSON.stringify(sprite)};
export const EXTRA = ${JSON.stringify(extras)};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, file, 'utf8');
console.log('wrote', OUT, (file.length / 1024).toFixed(1) + 'kb');
