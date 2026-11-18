/*
 * SIYA · Little Mediterranean Garden
 * Deterministic original artwork generator.
 *
 *   node tools/gen-coast.mjs
 *
 * Produces src/js/coast.generated.js:
 *   SPRITE  — defs, filters and symbols (coast scene, garden, venue, flora)
 *   EXTRA   — butterflies, deckled edges, seal blob
 *
 * Everything is drawn from primitives so the file is reproducible and the
 * artwork shares one continuous visual language: soft washes, translucent
 * pigment, olive ink lines and cream paper.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const C = {
  ivory: "#FFF9F0",
  paper: "#F7EFE9",
  paperLav: "#F0E8F0",
  lavender: "#D9D0E7",
  lavenderDeep: "#B4A3C6",
  sea: "#B8D9E5",
  seaMid: "#8FBDD1",
  seaDeep: "#6D9DAF",
  seaInk: "#4E7B8C",
  blush: "#F2D8D8",
  rose: "#E39AA6",
  roseDeep: "#C46A7C",
  sage: "#A8B59B",
  olive: "#8C9A5B",
  oliveDeep: "#6E7C45",
  lemon: "#F2D47B",
  lemonDeep: "#D9B34A",
  terra: "#C98C78",
  terraDeep: "#A96B58",
  ink: "#4C4654",
  gold: "#B99A6B",
};

const n = (v) => Math.round(v * 100) / 100;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* small drawing primitives                                            */
/* ------------------------------------------------------------------ */

const leaf = (x, y, len, wid, rot, fill, op = 1) =>
  `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})" d="M0 0 C${n(-wid)} ${n(-len * 0.28)} ${n(-wid * 0.9)} ${n(-len * 0.78)} 0 ${n(-len)} C${n(wid * 0.9)} ${n(-len * 0.78)} ${n(wid)} ${n(-len * 0.28)} 0 0 Z" fill="${fill}" opacity="${op}"/>`;

const stem = (x1, y1, cx, cy, x2, y2, w = 1.4, fill = C.oliveDeep, op = 0.8) =>
  `<path d="M${n(x1)} ${n(y1)} Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;

/* narrow silver-green olive leaves along a curved stem */
function oliveSpray(x, y, len, angle, seed = 3, scale = 1, op = 1) {
  const rnd = mulberry32(seed);
  const a = (angle * Math.PI) / 180;
  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len;
  const mx = (x + ex) / 2 + Math.sin(a) * len * 0.22 * (rnd() > 0.5 ? 1 : -1);
  const my = (y + ey) / 2 - Math.cos(a) * len * 0.22;
  let out = stem(x, y, mx, my, ex, ey, 1.3 * scale, C.oliveDeep, 0.65 * op);
  const count = 9;
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * ey;
    const dir = i % 2 ? 1 : -1;
    const ang = angle + 90 + dir * (58 + rnd() * 16);
    out += leaf(
      px,
      py,
      15 * scale + rnd() * 5,
      3.1 * scale,
      ang,
      i % 3 === 0 ? C.sage : C.olive,
      (0.62 + rnd() * 0.28) * op
    );
  }
  return out;
}

/* a lemon with a leaf or two */
function lemon(x, y, s = 1, rot = 0, op = 1) {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})" opacity="${op}">
    <path d="M0 0 C10 -7 22 -2 22 9 C22 20 11 26 1 21 C-9 16 -10 6 0 0 Z" fill="${C.lemon}" opacity=".92"/>
    <path d="M3 3 C11 -2 19 2 19 10 C19 17 11 21 4 18" fill="none" stroke="${C.lemonDeep}" stroke-width="1" opacity=".4"/>
    <path d="M0 0 C2 -7 8 -10 13 -9" fill="none" stroke="${C.oliveDeep}" stroke-width="1.2" opacity=".5"/>
    <path d="M-1 -1 C-8 -8 -6 -16 0 -18 C5 -15 6 -7 -1 -1 Z" fill="${C.olive}" opacity=".8"/>
  </g>`;
}

/* one papery bougainvillea bract, with a visible vein */
function bract(x, y, s, rot, fill, op = 0.9, deep = C.roseDeep) {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})" opacity="${op}">
    <path d="M0 0 C-8 -4 -14 -12 -12 -20 C-10 -28 -2 -28 3 -22 C8 -16 7 -7 0 0 Z" fill="${fill}" stroke="${deep}" stroke-opacity=".22" stroke-width="1"/>
    <path d="M0 0 C-4 -6 -6 -12 -5 -19" fill="none" stroke="${C.ivory}" stroke-opacity=".35" stroke-width=".8"/>
  </g>`;
}

function bougainvilleaCluster(x, y, s, seed = 1, fill = C.rose, op = 1) {
  const rnd = mulberry32(seed);
  let out = `<g opacity="${op}" filter="url(#wc)">`;
  out += stem(x - 18 * s, y + 14 * s, x - 6 * s, y - 12 * s, x + 16 * s, y - 2 * s, 1.2 * s, C.roseDeep, 0.45);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd() * 0.5;
    const d = (5 + rnd() * 13) * s;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.8;
    out += bract(px, py, (0.55 + rnd() * 0.5) * s, rnd() * 360, i % 3 === 0 ? C.roseDeep : fill, 0.7 + rnd() * 0.28);
    if (i % 2 === 0) {
      out += `<circle cx="${n(px + 2 * s)}" cy="${n(py + 1.6 * s)}" r="${n(1.3 * s)}" fill="${C.ivory}" opacity=".85"/>`;
      out += `<circle cx="${n(px - 1.6 * s)}" cy="${n(py + 2.4 * s)}" r="${n(1.1 * s)}" fill="${C.lemon}" opacity=".8"/>`;
    }
  }
  out += `</g>`;
  return out;
}

/* trailing bougainvillea stem with clusters */
function bougainvilleaTrail(x, y, len, angle, seed = 2, scale = 1, flip = 1) {
  const rnd = mulberry32(seed);
  const a = (angle * Math.PI) / 180;
  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len;
  const mx = (x + ex) / 2 + Math.sin(a) * len * 0.18 * flip;
  const my = (y + ey) / 2 - Math.cos(a) * len * 0.18 * flip;
  let out = stem(x, y, mx, my, ex, ey, 1.8 * scale, C.oliveDeep, 0.55);
  for (let i = 0; i < 5; i++) {
    const t = 0.16 + i * 0.18;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * ey;
    out += leaf(px, py, 14 * scale, 3.2 * scale, angle + 60 + (i % 2 ? 50 : -50) + rnd() * 12, C.sage, 0.5);
    out += bougainvilleaCluster(px + (rnd() - 0.5) * 8, py + (rnd() - 0.5) * 6, (0.55 + rnd() * 0.4) * scale, seed + i * 7, C.rose);
  }
  return out;
}

/* layered watercolour rose */
function rose(x, y, r, seed = 1, hue = "rose", op = 0.95) {
  const rnd = mulberry32(seed);
  const fill = hue === "ivory" ? "#F8E9E1" : hue === "blush" ? "#F0C9CC" : "#E08A99";
  const mid = hue === "ivory" ? "#E9D2C6" : hue === "blush" ? "#E2A9B0" : C.roseDeep;
  const deep = hue === "ivory" ? "#C9A794" : hue === "blush" ? "#B4566A" : "#A94A5E";
  let petals = "";
  const ring = (count, rr, offset, opa) => {
    let o = "";
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 360 + offset + rnd() * 5;
      o += `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(a)})" d="M0 ${n(rr * 0.05)} C${n(-rr * 0.66)} ${n(-rr * 0.3)} ${n(-rr * 0.58)} ${n(-rr * 0.99)} 0 ${n(-rr)} C${n(rr * 0.58)} ${n(-rr * 0.99)} ${n(rr * 0.66)} ${n(-rr * 0.3)} 0 ${n(rr * 0.05)} Z" fill="${i % 2 ? fill : mid}" opacity="${opa}" stroke="${deep}" stroke-opacity=".3" stroke-width="${n(r * 0.045)}"/>`;
    }
    return o;
  };
  petals += ring(5, r, 0, 0.55);
  petals += ring(5, r * 0.68, 36, 0.6);
  petals += ring(4, r * 0.4, 14, 0.6);
  const spiral = `<path d="M${n(x - r * 0.24)} ${n(y + r * 0.08)} C${n(x - r * 0.3)} ${n(y - r * 0.24)} ${n(x + r * 0.16)} ${n(y - r * 0.32)} ${n(x + r * 0.22)} ${n(y - r * 0.02)} C${n(x + r * 0.26)} ${n(y + r * 0.2)} ${n(x - r * 0.04)} ${n(y + r * 0.26)} ${n(x - r * 0.14)} ${n(y + r * 0.12)}" fill="none" stroke="${deep}" stroke-width="${n(r * 0.07)}" stroke-linecap="round" opacity=".5"/>`;
  return `<g opacity="${op}">
    <circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.02)}" fill="${mid}" opacity=".16"/>
    ${petals}
    ${spiral}
    <path d="M${n(x - r * 0.52)} ${n(y - r * 0.42)} C${n(x - r * 0.36)} ${n(y - r * 0.62)} ${n(x - r * 0.18)} ${n(y - r * 0.68)} ${n(x - r * 0.06)} ${n(y - r * 0.66)}" fill="none" stroke="${C.ivory}" stroke-width="${n(r * 0.07)}" stroke-linecap="round" opacity=".5"/>
  </g>`;
}

function roseSpray(x, y, s = 1, seed = 4, flip = 1) {
  const rnd = mulberry32(seed);
  let out = `<g>`;
  out += oliveSpray(x - 6 * s, y + 18 * s, 58 * s, -108, seed + 1, 0.9, 0.9);
  out += stem(x, y + 16 * s, x + 10 * s * flip, y - 6 * s, x + 26 * s * flip, y - 4 * s, 1.5 * s, C.oliveDeep, 0.55);
  out += rose(x, y, 19 * s, seed + 2, "rose", 0.92);
  out += rose(x + 26 * s * flip, y - 5 * s, 13 * s, seed + 3, "blush", 0.9);
  if (rnd() > 0.2) out += rose(x + 12 * s * flip, y - 24 * s, 10 * s, seed + 5, "ivory", 0.9);
  out += leaf(x + 8 * s * flip, y + 12 * s, 17 * s, 4 * s, flip > 0 ? 40 : 140, C.sage, 0.7);
  out += leaf(x - 10 * s, y + 10 * s, 15 * s, 3.6 * s, -150, C.olive, 0.65);
  out += `</g>`;
  return out;
}

function whiteBlooms(x, y, s = 1, seed = 8) {
  const rnd = mulberry32(seed);
  let out = `<g>`;
  for (let i = 0; i < 6; i++) {
    const px = x + (rnd() - 0.5) * 26 * s;
    const py = y + (rnd() - 0.5) * 20 * s;
    const rr = (2.4 + rnd() * 2) * s;
    out += `<g transform="translate(${n(px)} ${n(py)})">`;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * 360;
      out += `<ellipse cx="0" cy="${n(-rr * 0.8)}" rx="${n(rr * 0.5)}" ry="${n(rr * 0.8)}" transform="rotate(${n(a)})" fill="${C.ivory}" opacity=".92"/>`;
    }
    out += `<circle r="${n(rr * 0.34)}" fill="${C.lemon}" opacity=".85"/></g>`;
  }
  out += `</g>`;
  return out;
}

/* a few stems of lavender for Mediterranean colour */
function lavenderSpray(x, y, s = 1, seed = 12) {
  const rnd = mulberry32(seed);
  let out = `<g opacity=".9">`;
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 7 * s;
    const by = y + (rnd() - 0.5) * 4;
    const hx = bx + (rnd() - 0.5) * 12 * s;
    const hy = by - (34 + rnd() * 22) * s;
    out += `<path d="M${n(bx)} ${n(by)} Q${n((bx + hx) / 2 + 4)} ${n((by + hy) / 2)} ${n(hx)} ${n(hy)}" fill="none" stroke="${C.oliveDeep}" stroke-width="1.1" opacity=".55"/>`;
    for (let k = 0; k < 5; k++) {
      const t = k / 5;
      const px = bx + (hx - bx) * t;
      const py = by + (hy - by) * t;
      out += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(2.2 * s)}" ry="${n(4.6 * s)}" fill="#A08FBE" opacity="${n(0.5 + k * 0.08)}" transform="rotate(${n(-12 + rnd() * 12)} ${n(px)} ${n(py)})"/>`;
    }
  }
  out += oliveSpray(x + 6, y, 26 * s, -100, seed + 3, 0.8, 0.7);
  out += `</g>`;
  return out;
}

function cypress(x, y, h, w = 10, op = 1) {
  return `<g opacity="${op}">
    <path d="M${n(x)} ${n(y)} C${n(x - w)} ${n(y - h * 0.25)} ${n(x - w * 0.9)} ${n(y - h * 0.62)} ${n(x)} ${n(y - h)} C${n(x + w * 0.9)} ${n(y - h * 0.62)} ${n(x + w)} ${n(y - h * 0.25)} ${n(x)} ${n(y)} Z" fill="${C.oliveDeep}" opacity=".82"/>
    <path d="M${n(x)} ${n(y - h * 0.06)} C${n(x - w * 0.4)} ${n(y - h * 0.4)} ${n(x - w * 0.25)} ${n(y - h * 0.7)} ${n(x)} ${n(y - h * 0.94)}" fill="none" stroke="${C.sage}" stroke-width="1.4" opacity=".4"/>
  </g>`;
}

function house(x, y, w, h, walls = "#F2D6C4", roof = C.terra) {
  return `<g>
    <rect x="${n(x)}" y="${n(y - h)}" width="${n(w)}" height="${n(h)}" fill="${walls}" opacity=".95"/>
    <path d="M${n(x - 5)} ${n(y - h)} L${n(x + w / 2)} ${n(y - h - 16)} L${n(x + w + 5)} ${n(y - h)} Z" fill="${roof}" opacity=".92"/>
    <path d="M${n(x - 5)} ${n(y - h)} L${n(x + w / 2)} ${n(y - h - 16)}" stroke="${C.terraDeep}" stroke-width="1" opacity=".3"/>
    <path d="M${n(x + 2)} ${n(y - h * 0.12)} L${n(x + w - 2)} ${n(y - h * 0.12)}" stroke="${C.terraDeep}" stroke-width="1" opacity=".25"/>
  </g>`;
}

function archedWindow(x, y, w = 9, h = 15, fill = "#7E8F86", shutter = C.sage) {
  const r = w / 2;
  return `<g>
    <path d="M${n(x)} ${n(y)} V${n(y - h + r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y - h + r)} V${n(y)} Z" fill="${fill}" opacity=".62"/>
    <path d="M${n(x + w / 2)} ${n(y)} V${n(y - h)}" stroke="${C.ivory}" stroke-width=".7" opacity=".4"/>
    <path d="M${n(x - 2.6)} ${n(y)} V${n(y - h + 2)}" stroke="${shutter}" stroke-width="2" opacity=".7"/>
    <path d="M${n(x + w + 2.6)} ${n(y)} V${n(y - h + 2)}" stroke="${shutter}" stroke-width="2" opacity=".7"/>
  </g>`;
}

/* ------------------------------------------------------------------ */
/* coast scene — painted on the envelope and the invite cameo          */
/* ------------------------------------------------------------------ */

function coastScene() {
  let s = "";
  const rnd = mulberry32(21);

  s += `<rect width="400" height="552" fill="${C.paper}" />`;
  s += `<g filter="url(#wc)">`;
  s += `<rect width="400" height="306" fill="url(#skyWash)" />`;

  /* sun & soft sky washes */
  s += `<ellipse cx="306" cy="82" rx="70" ry="54" fill="#FBEBC8" opacity=".5" filter="url(#soft)" />`;
  s += `<circle cx="306" cy="82" r="27" fill="#F8E2B4" opacity=".55" />`;
  s += `<ellipse cx="112" cy="150" rx="86" ry="34" fill="#F3DBDF" opacity=".3" filter="url(#soft)" />`;
  s += `<ellipse cx="330" cy="196" rx="96" ry="30" fill="#DCE8F1" opacity=".4" filter="url(#soft)" />`;
  s += `<g fill="${C.ivory}" opacity=".55" filter="url(#soft)">
    <ellipse cx="88" cy="66" rx="54" ry="13" />
    <ellipse cx="128" cy="80" rx="38" ry="9" />
    <ellipse cx="236" cy="48" rx="46" ry="10" />
    <ellipse cx="344" cy="132" rx="56" ry="11" />
  </g>`;

  /* far headland */
  s += `<path d="M0 238 C56 224 108 236 158 228 C214 219 258 232 306 226 C348 221 378 229 400 224 L400 306 L0 306 Z" fill="#C3D4DC" opacity=".5" />`;

  /* sea */
  s += `<rect y="246" width="400" height="184" fill="url(#seaWash)" />`;
  s += `<path d="M0 246 H400" stroke="${C.ivory}" stroke-width="1.5" opacity=".55" />`;
  s += `<path d="M0 248 C80 244 160 252 240 248 C310 244 360 250 400 247 L400 258 C340 262 300 256 240 259 C170 263 90 257 0 261 Z" fill="${C.seaInk}" opacity=".25" />`;
  s += `<ellipse cx="120" cy="360" rx="120" ry="34" fill="${C.seaInk}" opacity=".08" filter="url(#soft)" />`;
  for (let i = 0; i < 18; i++) {
    const y = 262 + i * 9 + rnd() * 4;
    const x = rnd() * 240 - 24;
    const w = 34 + rnd() * 120;
    s += `<path d="M${n(x)} ${n(y)} q${n(w * 0.25)} -2.4 ${n(w * 0.5)} 0 t${n(w * 0.5)} 0" fill="none" stroke="${i % 3 ? C.seaInk : C.ivory}" stroke-width="${1 + rnd() * 0.9}" opacity="${0.09 + rnd() * 0.15}" stroke-linecap="round" />`;
  }

  /* sailboat */
  s += `<g opacity=".82">
    <path d="M292 326 l0 -30 l18 30 Z" fill="${C.ivory}" opacity=".92" />
    <path d="M292 328 l0 -21 l-12 21 Z" fill="${C.ivory}" opacity=".6" />
    <path d="M280 328 h28 l-4 5 h-20 Z" fill="${C.terraDeep}" opacity=".72" />
  </g>`;

  /* cliff */
  s += `<path d="M0 172 C36 186 60 206 74 232 C90 260 86 286 102 310 C114 328 132 342 146 352 L160 430 L0 430 Z" fill="#DDC7B6" opacity=".97" />`;
  s += `<path d="M0 172 C36 186 60 206 74 232 C90 260 86 286 102 310 C114 328 132 342 146 352" fill="none" stroke="${C.terraDeep}" stroke-width="1.3" opacity=".25" />`;
  s += `<path d="M0 330 C30 338 58 350 84 370 C104 386 120 404 132 430 L0 430 Z" fill="${C.terraDeep}" opacity=".12" />`;
  s += `<path d="M12 360 C36 366 58 378 74 396" fill="none" stroke="${C.oliveDeep}" stroke-width="1.1" opacity=".25" />`;
  s += `<path d="M22 386 C46 392 66 404 80 420" fill="none" stroke="${C.oliveDeep}" stroke-width="1.1" opacity=".2" />`;

  /* umbrella pines behind the village */
  const pine = (x, y, h, r) =>
    `<g>
      <path d="M${n(x)} ${n(y)} C${n(x - 2)} ${n(y - h * 0.4)} ${n(x + 2)} ${n(y - h * 0.7)} ${n(x + 1)} ${n(y - h)}" fill="none" stroke="#8B6A4E" stroke-width="2.2" opacity=".7" />
      <ellipse cx="${n(x)}" cy="${n(y - h)}" rx="${n(r)}" ry="${n(r * 0.4)}" fill="#7F8F55" opacity=".8" />
      <ellipse cx="${n(x - r * 0.42)}" cy="${n(y - h + 4)}" rx="${n(r * 0.5)}" ry="${n(r * 0.26)}" fill="#6E7C45" opacity=".7" />
      <ellipse cx="${n(x + r * 0.4)}" cy="${n(y - h + 3)}" rx="${n(r * 0.48)}" ry="${n(r * 0.24)}" fill="#8C9A5B" opacity=".65" />
    </g>`;
  s += pine(128, 328, 86, 34);
  s += pine(172, 344, 62, 24);

  /* campanile */
  s += `<g>
    <rect x="34" y="212" width="20" height="44" fill="#F7E5D3" opacity=".97" />
    <path d="M30 212 L44 196 L58 212 Z" fill="${C.terraDeep}" opacity=".9" />
    <path d="M38 212 v-10 a6 6 0 0 1 12 0 v10 Z" fill="#7E8F86" opacity=".55" />
    <path d="M44 196 v-6" stroke="${C.oliveDeep}" stroke-width="1" />
    <circle cx="44" cy="188" r="1.8" fill="${C.oliveDeep}" />
  </g>`;

  /* village houses */
  s += house(6, 320, 66, 84, "#F4DAC8", "#C98C78");
  s += archedWindow(18, 316, 9, 15);
  s += archedWindow(38, 316, 9, 15);
  s += `<path d="M16 262 v-8 a5 5 0 0 1 10 0 v8 Z" fill="#7E8F86" opacity=".5" />
        <path d="M36 262 v-8 a5 5 0 0 1 10 0 v8 Z" fill="#7E8F86" opacity=".5" />`;
  s += house(74, 334, 52, 66, "#F6E2D2", "#BE816C");
  s += archedWindow(84, 330, 8, 13);
  s += archedWindow(100, 330, 8, 13);
  s += house(122, 346, 38, 48, "#F1D2BE", "#C98C78");
  s += archedWindow(132, 342, 7, 11);
  s += `<path d="M74 290 h52" stroke="${C.terraDeep}" stroke-width="1" opacity=".3" />`;
  s += cypress(10, 350, 92, 9, 0.9);
  s += cypress(64, 356, 64, 7, 0.8);

  /* terrace + balustrade */
  s += `<path d="M0 426 H400 V552 H0 Z" fill="url(#terraceWash)" />`;
  s += `<path d="M0 426 H400" stroke="${C.terraDeep}" stroke-width="1.6" opacity=".28" />`;
  s += `<path d="M0 434 H400" stroke="${C.ivory}" stroke-width="2.8" opacity=".9" />`;
  s += `<path d="M0 445 H400" stroke="${C.terraDeep}" stroke-width="1.2" opacity=".18" />`;
  for (let i = 0; i < 17; i++) {
    const x = 10 + i * 23;
    s += `<path d="M${n(x)} 434 C${n(x - 4)} 441 ${n(x - 4)} 449 ${n(x)} 456 C${n(x + 4)} 449 ${n(x + 4)} 441 ${n(x)} 434 Z" fill="${C.ivory}" opacity=".92" />`;
  }
  s += `<path d="M0 550 C90 536 150 548 220 540 C300 531 350 544 400 536 L400 552 L0 552 Z" fill="${C.terraDeep}" opacity=".1" />`;

  /* lemon tree on the terrace */
  s += `<g>
    <ellipse cx="330" cy="470" rx="44" ry="10" fill="${C.terraDeep}" opacity=".14" filter="url(#soft)" />
    <path d="M326 462 C328 434 330 414 332 396" fill="none" stroke="${C.oliveDeep}" stroke-width="3.2" opacity=".65" />
    <path d="M332 424 C314 412 306 394 310 378" fill="none" stroke="${C.oliveDeep}" stroke-width="2" opacity=".5" />
    <path d="M332 418 C350 404 358 388 356 370" fill="none" stroke="${C.oliveDeep}" stroke-width="2" opacity=".5" />
    <path d="M316 462 L346 462 L341 492 L321 492 Z" fill="${C.terra}" opacity=".92" />
    <path d="M313 458 L349 458 L347 467 L315 467 Z" fill="${C.terraDeep}" opacity=".75" />
    ${lemon(308, 384, 1.25, -12, 0.95)}
    ${lemon(346, 400, 1, 16, 0.95)}
    ${lemon(328, 362, 0.95, -4, 0.95)}
    ${lemon(354, 366, 0.8, 20, 0.9)}
    ${oliveSpray(332, 424, 62, -126, 31, 0.95, 0.9)}
    ${oliveSpray(332, 426, 54, -54, 33, 0.9, 0.85)}
  </g>`;

  /* romantic corner bougainvillea */
  s += bougainvilleaTrail(-6, 54, 132, 28, 11, 1.45, -1);
  s += bougainvilleaTrail(406, 42, 124, 152, 13, 1.38, 1);
  s += roseSpray(352, 96, 1.15, 15, -1);

  /* lush foreground */
  s += `<ellipse cx="66" cy="520" rx="86" ry="34" fill="${C.terraDeep}" opacity=".12" filter="url(#soft)" />`;
  s += `<ellipse cx="340" cy="526" rx="80" ry="30" fill="${C.terraDeep}" opacity=".1" filter="url(#soft)" />`;
  s += roseSpray(52, 508, 2.3, 21, 1);
  s += roseSpray(348, 514, 2.15, 23, -1);
  s += bougainvilleaCluster(112, 542, 1.7, 27);
  s += bougainvilleaCluster(292, 546, 1.55, 29);
  s += oliveSpray(156, 552, 96, -86, 35, 1.35, 0.95);
  s += oliveSpray(246, 552, 90, -96, 37, 1.25, 0.9);
  s += whiteBlooms(196, 524, 1.35, 41);
  s += whiteBlooms(136, 492, 1, 43);
  s += whiteBlooms(266, 500, 0.95, 45);
  s += lemon(192, 550, 1.05, -6, 0.85);

  /* butterfly */
  s += `<g transform="translate(250 152) rotate(-12) scale(1.15)" opacity=".9" fill="${C.roseDeep}">
    <path d="M0 0 C-14 -16 -30 -12 -28 -2 C-26 7 -11 10 0 5 Z" opacity=".8" />
    <path d="M2 0 C16 -16 32 -12 30 -2 C28 7 13 10 2 5 Z" opacity=".8" />
    <ellipse cx="1" cy="4" rx="1.4" ry="6" />
  </g>`;

  /* pigment granulation */
  const grain = mulberry32(87);
  for (let i = 0; i < 46; i++) {
    s += `<circle cx="${n(grain() * 400)}" cy="${n(60 + grain() * 380)}" r="${n(0.5 + grain() * 1.2)}" fill="${i % 4 ? C.seaInk : C.terraDeep}" opacity="${n(0.04 + grain() * 0.07)}" />`;
  }
  s += `</g>`;

  /* painted frame */
  s += `<rect x="12" y="12" width="376" height="528" fill="none" stroke="${C.gold}" stroke-width="1" opacity=".35" />`;
  s += `<rect x="18" y="18" width="364" height="516" fill="none" stroke="${C.gold}" stroke-width=".6" opacity=".2" />`;
  s += `<rect width="400" height="552" filter="url(#paperGrain)" opacity=".65" />`;

  return s;
}

/* ------------------------------------------------------------------ */
/* venue garden — an illustrated impression, no invented architecture */
/* ------------------------------------------------------------------ */

function venueScene() {
  let s = "";
  s += `<rect width="600" height="420" fill="${C.paper}" />`;
  s += `<rect y="0" width="600" height="250" fill="url(#skyWash)" />`;
  s += `<ellipse cx="470" cy="66" rx="90" ry="60" fill="#FBEBC8" opacity=".5" filter="url(#soft)" />`;
  s += `<path d="M0 214 C90 200 150 212 220 204 C300 194 380 210 460 202 C520 196 570 206 600 200 L600 280 L0 280 Z" fill="#C9D8DE" opacity=".5" />`;
  s += `<rect y="224" width="600" height="120" fill="url(#seaWash)" opacity=".85" />`;
  s += `<path d="M0 224 H600" stroke="${C.ivory}" stroke-width="1.4" opacity=".55" />`;

  /* stone garden arch */
  s += `<path d="M150 372 V214 C150 154 202 120 300 120 C398 120 450 154 450 214 V372" fill="none" stroke="${C.terra}" stroke-width="26" opacity=".32" />`;
  s += `<path d="M150 372 V214 C150 154 202 120 300 120 C398 120 450 154 450 214 V372" fill="none" stroke="${C.ivory}" stroke-width="12" opacity=".5" />`;
  s += `<path d="M150 372 V214 C150 154 202 120 300 120 C398 120 450 154 450 214 V372" fill="none" stroke="${C.terraDeep}" stroke-width="1.4" opacity=".35" />`;

  /* climbing roses and bougainvillea garland along the arch */
  s += bougainvilleaTrail(150, 250, 110, -86, 55, 0.95, 1);
  s += bougainvilleaTrail(450, 256, 116, -94, 57, 1, -1);
  s += roseSpray(196, 176, 1.35, 51, 1);
  s += roseSpray(386, 168, 1.2, 53, -1);
  s += bougainvilleaCluster(176, 236, 0.95, 101);
  s += bougainvilleaCluster(236, 150, 0.85, 103);
  s += roseSpray(300, 128, 1.1, 105, -1);
  s += bougainvilleaCluster(352, 152, 0.85, 107);
  s += roseSpray(404, 202, 0.95, 109, 1);
  s += bougainvilleaCluster(430, 262, 0.9, 111);

  /* balustrade */
  s += `<path d="M0 360 H600" stroke="${C.ivory}" stroke-width="3" opacity=".9" />`;
  s += `<path d="M0 342 H600" stroke="${C.terraDeep}" stroke-width="1.4" opacity=".22" />`;
  for (let i = 0; i < 24; i++) {
    const x = 10 + i * 25;
    s += `<path d="M${n(x)} 360 C${n(x - 5)} 368 ${n(x - 5)} 376 ${n(x)} 384 C${n(x + 5)} 376 ${n(x + 5)} 368 ${n(x)} 360 Z" fill="${C.ivory}" opacity=".92" />`;
  }

  /* ground + potted lemons and cypress */
  s += `<path d="M0 376 H600 V420 H0 Z" fill="url(#terraceWash)" />`;
  s += cypress(74, 362, 150, 16, 0.9);
  s += cypress(538, 366, 128, 14, 0.78);
  s += `<g>
    <path d="M96 392 C98 366 100 352 104 338" fill="none" stroke="${C.oliveDeep}" stroke-width="3" opacity=".6" />
    <path d="M104 360 C88 352 82 338 86 326" fill="none" stroke="${C.oliveDeep}" stroke-width="2" opacity=".5" />
    <path d="M104 356 C120 344 126 330 124 318" fill="none" stroke="${C.oliveDeep}" stroke-width="2" opacity=".5" />
    <path d="M88 392 L116 392 L111 416 L93 416 Z" fill="${C.terra}" opacity=".9" />
    ${lemon(88, 332, 1.1, -10)}
    ${lemon(117, 348, 0.9, 14)}
    ${lemon(102, 314, 0.8, -2)}
    ${oliveSpray(104, 360, 60, -120, 61, 0.9)}
  </g>`;
  s += `<g>
    <path d="M488 396 C486 370 486 352 482 336" fill="none" stroke="${C.oliveDeep}" stroke-width="3" opacity=".6" />
    <path d="M482 358 C464 352 456 338 460 324" fill="none" stroke="${C.oliveDeep}" stroke-width="2" opacity=".5" />
    <path d="M482 356 C500 346 508 332 506 318" fill="none" stroke="${C.oliveDeep}" stroke-width="2" opacity=".5" />
    <path d="M472 396 L500 396 L495 418 L477 418 Z" fill="${C.terra}" opacity=".88" />
    ${lemon(462, 330, 1, -12)}
    ${lemon(506, 338, 0.85, 16)}
    ${lemon(484, 314, 0.75, 0)}
    ${oliveSpray(482, 360, 54, -126, 63, 0.85)}
  </g>`;
  s += oliveSpray(300, 414, 120, -90, 65, 1.3, 0.85);
  s += roseSpray(150, 408, 1.35, 67, 1);
  s += roseSpray(452, 412, 1.3, 69, -1);
  s += whiteBlooms(300, 388, 0.9, 71);

  /* planted beds at the foot of the arch */
  s += `<ellipse cx="170" cy="408" rx="120" ry="22" fill="${C.oliveDeep}" opacity=".1" filter="url(#soft)" />`;
  s += `<ellipse cx="430" cy="410" rx="110" ry="20" fill="${C.oliveDeep}" opacity=".1" filter="url(#soft)" />`;
  s += roseSpray(200, 404, 1.15, 113, 1);
  s += roseSpray(400, 408, 1.1, 115, -1);
  s += bougainvilleaCluster(258, 410, 0.9, 117);
  s += bougainvilleaCluster(344, 412, 0.85, 119);
  s += oliveSpray(300, 418, 58, -84, 121, 0.9, 0.9);
  s += lavenderSpray(232, 410, 1.05, 123);
  s += lavenderSpray(368, 412, 1, 125);
  s += whiteBlooms(310, 402, 0.75, 127);

  return s;
}

/* ------------------------------------------------------------------ */
/* closing garden — full-bleed Mediterranean terrace at golden hour    */
/* ------------------------------------------------------------------ */

function gardenScene() {
  let s = "";
  s += `<rect width="400" height="640" fill="url(#duskWash)" />`;
  s += `<ellipse cx="300" cy="140" rx="120" ry="80" fill="#F7D9A8" opacity=".38" filter="url(#soft)" />`;
  s += `<rect y="300" width="400" height="180" fill="url(#seaDusk)" />`;
  s += `<path d="M0 300 H400" stroke="#F3DCC0" stroke-width="1.4" opacity=".4" />`;
  const rnd = mulberry32(77);
  for (let i = 0; i < 14; i++) {
    const y = 312 + i * 10 + rnd() * 4;
    s += `<path d="M${n(rnd() * 160 - 20)} ${n(y)} q30 -2 60 0 t60 0" fill="none" stroke="${i % 3 ? "#3E6B78" : "#F3DCC0"}" stroke-width="1" opacity=".12" />`;
  }
  s += `<path d="M0 300 C40 288 70 292 110 284 C150 276 190 288 230 280 C280 270 330 282 400 274 L400 310 L0 310 Z" fill="#5D7C7A" opacity=".28" />`;

  /* terrace + arch */
  s += `<path d="M0 470 H400 V640 H0 Z" fill="url(#terraceDusk)" />`;
  s += `<path d="M0 470 H400" stroke="#E8C9A2" stroke-width="1.6" opacity=".35" />`;
  s += `<path d="M0 478 H400" stroke="#F3DCC0" stroke-width="2.4" opacity=".25" />`;
  s += `<path d="M96 640 V420 C96 336 168 296 248 296 C328 296 400 336 400 420" fill="none" stroke="#E9C7A4" stroke-width="2" opacity=".18" />`;

  /* floral arch framing the garden */
  s += `<path d="M56 640 V438 C56 330 124 266 200 266 C276 266 344 330 344 438 V640" fill="none" stroke="#E9C7A4" stroke-width="2" opacity=".26" />`;
  s += bougainvilleaCluster(62, 430, 1.15, 131);
  s += roseSpray(74, 352, 1.15, 133, -1);
  s += bougainvilleaCluster(116, 300, 1.05, 135);
  s += roseSpray(196, 272, 1.2, 137, 1);
  s += bougainvilleaCluster(268, 292, 1.05, 139);
  s += roseSpray(322, 344, 1.1, 141, -1);
  s += bougainvilleaCluster(340, 424, 1.1, 143);

  /* lush foreground florals */
  s += roseSpray(56, 578, 2.3, 81, 1);
  s += roseSpray(344, 586, 2.2, 83, -1);
  s += roseSpray(202, 632, 1.6, 85, 1);
  s += bougainvilleaTrail(-10, 470, 164, 26, 73, 1.5, -1);
  s += bougainvilleaTrail(410, 486, 158, 154, 75, 1.45, 1);
  s += bougainvilleaCluster(196, 608, 1.6, 77);
  s += bougainvilleaCluster(118, 624, 1.3, 145);
  s += bougainvilleaCluster(284, 628, 1.25, 147);
  s += oliveSpray(96, 640, 136, -84, 79, 1.65, 0.9);
  s += oliveSpray(306, 642, 132, -96, 81, 1.6, 0.9);
  s += lavenderSpray(154, 604, 1.45, 149);
  s += lavenderSpray(252, 610, 1.35, 151);
  s += whiteBlooms(248, 568, 1.35, 83);
  s += whiteBlooms(164, 590, 1.1, 85);
  s += lemon(88, 520, 1.25, -14, 0.92);
  s += lemon(322, 528, 1.15, 16, 0.92);
  s += lemon(196, 570, 0.9, -4, 0.85);

  /* butterfly */
  s += `<g transform="translate(300 226) rotate(10) scale(1.4)" opacity=".85" fill="#F3DCC0">
    <path d="M0 0 C-14 -16 -30 -12 -28 -2 C-26 7 -11 10 0 5 Z" opacity=".8" />
    <path d="M2 0 C16 -16 32 -12 30 -2 C28 7 13 10 2 5 Z" opacity=".8" />
    <ellipse cx="1" cy="4" rx="1.4" ry="6" />
  </g>`;

  return s;
}

/* ------------------------------------------------------------------ */
/* sprites: flora, butterflies, dividers                               */
/* ------------------------------------------------------------------ */

function flutterButterfly(id, tint, deep, op = 1) {
  return `<symbol id="${id}" viewBox="0 0 120 116">
    <g fill="${tint}" opacity="${op}">
      <path d="M58 58 C40 26 8 18 6 40 C4 62 34 74 58 66 Z" />
      <path d="M62 58 C80 26 112 18 114 40 C116 62 86 74 62 66 Z" />
      <path d="M58 64 C42 82 20 92 20 76 C20 64 40 56 58 60 Z" opacity=".8" />
      <path d="M62 64 C78 82 100 92 100 76 C100 64 80 56 62 60 Z" opacity=".8" />
      <ellipse cx="60" cy="62" rx="3" ry="15" fill="${deep}" />
      <path d="M56 48 C50 38 44 34 38 34 M64 48 C70 38 76 34 82 34" fill="none" stroke="${deep}" stroke-width="1.6" stroke-linecap="round" />
    </g>
    <g fill="${deep}" opacity=".45">
      <circle cx="34" cy="46" r="3" /><circle cx="86" cy="46" r="3" />
    </g>
  </symbol>`;
}

function divider(id) {
  return `<symbol id="${id}" viewBox="0 0 260 30">
    <g fill="none" stroke="${C.olive}" stroke-width="1" stroke-linecap="round" opacity=".9">
      <path d="M6 15 H92" />
      <path d="M168 15 H254" />
      <path d="M92 15 C104 8 114 8 120 13 C126 18 136 18 142 13 C148 8 158 8 168 15" />
      <path d="M118 15 C114 9 114 5 118 2 M122 15 C126 9 126 5 122 2" opacity=".6" />
    </g>
    <g fill="${C.lemon}" opacity=".9">
      <circle cx="120" cy="15" r="2.6" />
    </g>
    <g stroke="${C.olive}" stroke-width="1" fill="${C.lemon}" opacity=".9">
      <path d="M100 15 C96 10 88 9 84 11 C88 15 95 17 100 15 Z" fill="${C.olive}" opacity=".55" stroke="none" />
      <path d="M160 15 C164 10 172 9 176 11 C172 15 165 17 160 15 Z" fill="${C.olive}" opacity=".55" stroke="none" />
    </g>
  </symbol>`;
}

function frameCorner(id, flip = 1) {
  return `<symbol id="${id}" viewBox="0 0 200 220">
    <g transform="${flip < 0 ? "translate(200 0) scale(-1 1)" : ""}">
      <path d="M16 16 C70 20 116 46 140 88" fill="none" stroke="${C.olive}" stroke-width="1.2" opacity=".5" />
      ${roseSpray(34, 44, 1.15, 91, 1)}
      ${oliveSpray(70, 26, 96, 18, 93, 1, 0.95)}
      ${bougainvilleaTrail(28, 104, 96, 64, 95, 0.9, 1)}
      ${lemon(112, 60, 0.85, 18, 0.9)}
      ${whiteBlooms(86, 96, 0.8, 97)}
    </g>
  </symbol>`;
}

function leafCorner(id, flip = 1) {
  return `<symbol id="${id}" viewBox="0 0 120 120">
    <g transform="${flip < 0 ? "translate(120 0) scale(-1 1)" : ""}">
      <path d="M8 8 C48 10 84 30 104 62" fill="none" stroke="${C.gold}" stroke-width=".9" opacity=".55" />
      <path d="M8 8 C34 8 62 22 78 44" fill="none" stroke="${C.gold}" stroke-width=".6" opacity=".35" />
      ${oliveSpray(10, 10, 74, 34, 99, 0.8, 0.9)}
    </g>
  </symbol>`;
}

/* ------------------------------------------------------------------ */
/* deckled / torn paper edges                                          */
/* ------------------------------------------------------------------ */

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

/* wax seal blob, still used by the RSVP button */
function sealBlob(points = 44, baseR = 52, seed = 13) {
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (Math.PI * 2 * i) / points;
    const r = baseR + Math.sin(a * 3.1) * 1.8 + Math.sin(a * 7.3 + 1.2) * 1.2 + (rnd() - 0.5) * 1.8;
    pts.push([60 + Math.cos(a) * r, 60 + Math.sin(a) * r]);
  }
  return (
    pts
      .map(([x, y], i) => {
        const [nx, ny] = pts[(i + 1) % pts.length];
        const cx = 60 + (x - 60) * 0.15;
        const cy = 60 + (y - 60) * 0.15;
        const mx = (x + nx) / 2;
        const my = (y + ny) / 2;
        return `${i === 0 ? "M" : "L"}${n(x)} ${n(y)} C${n(cx)} ${n(cy)} ${n(mx)} ${n(my)} ${n(nx)} ${n(ny)}`;
      })
      .join(" ") + " Z"
  );
}

/* ------------------------------------------------------------------ */
/* assemble                                                            */
/* ------------------------------------------------------------------ */

const defs = `<defs>
  <linearGradient id="skyWash" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#CDE3EF" />
    <stop offset="0.52" stop-color="#EAE2EE" />
    <stop offset="1" stop-color="#F8ECE2" />
  </linearGradient>
  <linearGradient id="seaWash" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9FC8D8" />
    <stop offset="0.5" stop-color="#74A6BA" />
    <stop offset="1" stop-color="#517F92" />
  </linearGradient>
  <linearGradient id="terraceWash" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#EFDDD0" />
    <stop offset="1" stop-color="#E2CDBC" />
  </linearGradient>
  <linearGradient id="duskWash" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E9D9D6" />
    <stop offset="0.42" stop-color="#F0D9CC" />
    <stop offset="1" stop-color="#E4C9BC" />
  </linearGradient>
  <linearGradient id="seaDusk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8FB6BD" />
    <stop offset="1" stop-color="#4E7B8C" />
  </linearGradient>
  <linearGradient id="terraceDusk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5F7C74" />
    <stop offset="1" stop-color="#3E5B57" />
  </linearGradient>
  <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#C9DCE8" />
    <stop offset="0.22" stop-color="#F7FBFC" />
    <stop offset="0.5" stop-color="#E3EEF4" />
    <stop offset="0.78" stop-color="#F9FCFD" />
    <stop offset="1" stop-color="#BFD5E2" />
  </linearGradient>
  <linearGradient id="paperWash" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFF9F0" />
    <stop offset="0.6" stop-color="#F6EBE6" />
    <stop offset="1" stop-color="#EFE2E6" />
  </linearGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="5" />
  </filter>
  <filter id="wc" x="-25%" y="-25%" width="150%" height="150%">
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="7" result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
  </filter>
  <filter id="paperGrain">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
    <feColorMatrix type="saturate" values="0" />
    <feComponentTransfer><feFuncA type="linear" slope="0.055" /></feComponentTransfer>
  </filter>
</defs>`;

const symbols = [
  `<symbol id="coast-scene" viewBox="0 0 400 552">${coastScene()}</symbol>`,
  `<symbol id="venue-scene" viewBox="0 0 600 420">${venueScene()}</symbol>`,
  `<symbol id="garden-scene" viewBox="0 0 400 640">${gardenScene()}</symbol>`,
  `<symbol id="olive-spray" viewBox="0 0 160 220">${oliveSpray(80, 210, 186, -96, 5, 1.35)}</symbol>`,
  `<symbol id="rose-spray" viewBox="0 0 200 200">${roseSpray(92, 132, 2.1, 7, 1)}</symbol>`,
  `<symbol id="bougainvillea" viewBox="0 0 220 220">${bougainvilleaTrail(12, 30, 170, 54, 9, 1.5, 1)}</symbol>`,
  `<symbol id="lemon-spray" viewBox="0 0 180 200">
      <path d="M28 186 C60 152 96 120 140 96" fill="none" stroke="${C.oliveDeep}" stroke-width="2.4" opacity=".65"/>
      ${oliveSpray(52, 162, 82, -56, 17, 1.15)}
      ${lemon(112, 112, 1.5, 18)}
      ${lemon(88, 140, 1.15, -14)}
      ${whiteBlooms(64, 84, 0.9, 19)}
    </symbol>`,
  `<symbol id="white-blooms" viewBox="0 0 120 100">${whiteBlooms(60, 52, 1.5, 23)}</symbol>`,
  divider("flourish"),
  divider("flourish-soft"),
  frameCorner("corner-flora"),
  frameCorner("corner-flora-r", -1),
  leafCorner("corner-leaf"),
  leafCorner("corner-leaf-r", -1),
  flutterButterfly("butterfly-blush", "#E9A9B4", "#B4566A"),
  flutterButterfly("butterfly-sea", "#9CC4D6", "#4E7B8C"),
  flutterButterfly("butterfly-lemon", "#F2D47B", "#B9923C"),
].join("\n");

const SPRITE = `<svg id="coast-sprite" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">${defs}
${symbols}
</svg>`;

const EXTRA = {
  torn: tornEdge(4),
  tornAlt: tornEdge(29),
  sealBlob: sealBlob(),
  butterflyBlush: `<svg class="butterfly" viewBox="0 0 120 116" aria-hidden="true" focusable="false"><use href="#butterfly-blush"/></svg>`,
  butterflySea: `<svg class="butterfly" viewBox="0 0 120 116" aria-hidden="true" focusable="false"><use href="#butterfly-sea"/></svg>`,
  butterflyLemon: `<svg class="butterfly" viewBox="0 0 120 116" aria-hidden="true" focusable="false"><use href="#butterfly-lemon"/></svg>`,
};

const out = `/* AUTO-GENERATED by tools/gen-coast.mjs — edit the generator, not this file. */
export const SPRITE = ${JSON.stringify(SPRITE)};
export const EXTRA = ${JSON.stringify(EXTRA)};
`;

const dest = resolve("src/js/coast.generated.js");
writeFileSync(dest, out);
console.log(`wrote ${dest} (${(out.length / 1024).toFixed(1)} kb)`);
