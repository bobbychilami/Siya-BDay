# Siya's First Birthday — Invitation

An interactive digital invitation for **Siya's First Birthday** — Sunday, 22 November 2026, 6:30 PM IST,
Hotel Raviraj, Ghijavne Road, Gadhinglaj 416502, Maharashtra, India.
Hosted by Bobby Chilami and Snehal Chilami.

**Live:** https://bobbychilami.github.io/Siya-BDay/  
**Repository:** https://github.com/bobbychilami/Siya-BDay

Vanilla HTML5, CSS3 and ES modules on Vite, animated with GSAP + ScrollTrigger.
The envelope is cut from the supplied watercolour pack into real, separately animated layers
(paper, coastal liner, flap, ribbon, bow, wax seal, invitation card); the botanical props are the
same paintings keyed onto transparency. Ambient dust motes are Canvas 2D.

> **This branch — `experiment/italian-coast-birthday` — is an alternative art direction, not the
> published invitation.** It re-imagines the same event as a hand-painted Italian-Riviera
> stationery set: a portrait envelope tied with a satin ribbon, a watercolour coast inside an
> arched cameo, and powder blue / blush / lemon paper. `main` still holds the approved version and
> this branch is not merged or deployed. Event facts, the RSVP flow and the deployment setup are
> identical to `main`; only the visual and motion layer differs.

## The opening, layer by layer

The cover is one full-bleed envelope, not a picture of one. Every part that moves is its own
element, stacked in this order (all inside `#envelope`):

| Layer | Element | Motion |
| --- | --- | --- |
| paper body | `.env-back` + `.env-back__light` | static, holds the light |
| coastal liner | `.env-liner` (clipped to the mouth) | revealed as the flap lifts |
| card stage | `#cardFrame` → `.invite` | clipped to the mouth, then released |
| pocket | `.env-pocket` + stitched `.env-seams` | static front wall of the envelope |
| flap | `#flap` (`rotateX`, hinge at the top edge, `preserve-3d`) | lifts, tips back, fades |
| ribbon | `.tie__band--l/--r`, `.tie__bow`, `.tie__knot`, `.tie__tail--l/--r` | loosens, slides out, falls away |
| wax seal | `#waxSeal` | cracks free, tumbles off |
| trigger | `#envelopeTrigger` | the single tap/click/Enter target |

`src/js/envelope.js` builds the GSAP timeline (~4.5 s): press → seal release → bow and knot let go
→ tails fall → flap swings back on its real hinge → the card rises out of the mouth, straightens
and is released from the clip → it expands to fill the screen → it settles. All timings overlap;
nothing is a frame swap and no GIF is used.

`src/js/intro.js` owns the state: scroll lock, the skip button, the 10 s watchdog, the
session-storage "already opened" flag and the replay button. Reduced motion and a missing
GSAP both fall back to `settleInstantly()`.

### Assets

```
src/assets/envelope/source/     the supplied PNGs, untouched (not published)
src/assets/envelope/storyboard/ the reference contact sheets, untouched (not published)
src/assets/envelope/derived/    web layers actually shipped (~490 KB total)
tools/prepare-envelope-assets.py  reproducible pipeline: cut, key, trim, flatten, WebP
```

The pipeline keys the painted ribbon/bow/seal off the cream paper, splits the ribbon at the knot,
flattens the paper wash into a tile-safe texture, trims every prop to its subject, recolours bare
sheet inside a prop to the card paper tone and writes WebP (lossy q93) for layers plus JPEG for
the two photographic-scale images. Originals are never modified.

## Commands

```bash
npm install
npm run dev -- --port 5199   # http://localhost:5199/Siya-BDay/
npm run build                # production build into dist/
npm run preview -- --port 5200  # serve dist/ the way Pages does
```

`vite.config.js` sets `base: "/Siya-BDay/"` because the site is published as a GitHub Pages
**project** site. The dev server and `vite preview` therefore serve everything under
`/Siya-BDay/`, and the screenshot tool defaults to `http://localhost:5199/Siya-BDay/`
(pass `--url=` to point it anywhere else).

## Structure

```
index.html                 markup, metadata, no-JS fallback
src/main.js                boot: art, countdown, scroll, intro, rsvp, share, a11y
src/config.js              event facts, WhatsApp number, site URL, storage keys
src/js/envelope.js         master GSAP opening timeline (untie → unfold → rise → settle)
src/js/intro.js            session state, scroll lock, skip, replay
src/js/art.js              injects the SVG sprite, torn edges, butterflies, ambient sprays
src/js/coast.generated.js  generated sprite (see tools/gen-coast.mjs)
src/js/countdown.js        countdown to the IST start time
src/js/rsvp.js             RSVP validation, preview mode, WhatsApp URL, copy
src/js/share.js            Web Share with clipboard fallback
src/js/particles.js        canvas dust motes
src/js/scroll.js           ScrollTrigger reveals and parallax
src/js/accessibility.js    reduce-motion toggle, persisted locally
src/styles/index.css       stylesheet entry (linked from index.html)
src/styles/*.css           tokens, base, intro/cover+envelope, sections, responsive
public/                    fonts (+ OFL licences), favicon, touch icon, og-image, robots.txt, _headers
tools/                     coast-painting generator, screenshot harness, OG/icon templates
```

Stylesheets are linked from `index.html` (not imported from JS) so the invitation is fully
styled even when JavaScript is disabled, blocked, or still loading.

## Configuration

| What | Where |
| --- | --- |
| WhatsApp number for RSVP | `src/config.js` → `RSVP_WHATSAPP_NUMBER` (digits only, e.g. `"919812345678"`) |
| Canonical URL, Open Graph URLs, `SITE_URL` | `index.html` `<head>` and `src/config.js` |
| Production URL placeholder | `https://siya-first-birthday.pages.dev` |

While `RSVP_WHATSAPP_NUMBER` is empty the RSVP form runs in **preview mode**: it validates the
reply, prepares the message and offers copy-to-clipboard, but never opens WhatsApp. Set a real
number only when the family supplies one.

When the invitation moves to its final domain, update the canonical link, `og:image`, `og:url`
and `SITE_URL` in one pass, then regenerate the OG image if the wording changes.

## Screenshot QA

`tools/shoot-cdp.mjs` drives Chrome over the DevTools protocol — no extra dependencies.

```bash
node tools/shoot-cdp.mjs --w=390  --h=844 --settle=700 --out=shots/initial-390.jpg
node tools/shoot-cdp.mjs --w=390  --h=844 --click="#envelopeTrigger" --seq "4600" --out=shots/card-390.jpg
node tools/shoot-cdp.mjs --w=1440 --h=900 --click="#envelopeTrigger" --seq "4600" --out=shots/card-1440.jpg
node tools/shoot-cdp.mjs --nojs    --out=shots/no-js.jpg     # JavaScript disabled
node tools/shoot-cdp.mjs --reduced --out=shots/reduced.jpg   # prefers-reduced-motion
node tools/shoot-cdp.mjs --probe --walk                      # metrics + overflow walk
```

To freeze the opening for a still, click the bow and pause the exposed timeline:

```bash
node tools/shoot.mjs --click="#bow" --js="window.__introTl.pause(2.8); 1" --out=shots/probe.png --settle=1200
```

`window.__introTl` exists only in the dev build.

It reports console errors/warnings and page metrics (`scrollWidth` vs `innerWidth`) as JSON.
`--jpeg` captures JPEG instead of PNG, which is how `public/og-image.jpg` was produced from
`tools/og.html`.

## Regenerating artwork and social images

```bash
python tools/prepare-envelope-assets.py   # rebuilds src/assets/envelope/derived/
node tools/gen-coast.mjs     # rewrites src/js/coast.generated.js
```

With the dev server running:

```bash
node tools/shoot.mjs --url="http://localhost:5199/Siya-BDay/tools/og.html" --w=1200 --h=630 --dpr=1 --jpeg --quality=90 --out=public/og-image.jpg
node tools/shoot.mjs --url="http://localhost:5199/Siya-BDay/tools/icon.html" --w=180 --h=180 --dpr=1 --out=public/apple-touch-icon.png
```

The venue picture is an **illustrated impression** of a garden celebration, labelled as such on
the page; it is not a photograph or a claim about how Hotel Raviraj looks.

## Accessibility

- Skip link, native buttons for every control, visible focus rings.
- `prefers-reduced-motion` is honoured automatically, with a persisted “Reduce motion” toggle.
- The opening is skippable and remembered per tab session.
- Without JavaScript the envelope layers are hidden and the invitation renders as a plain,
  fully readable static card (`.no-js` rules in `base.css`).
- Enter/Space open the envelope from the keyboard; the skip and replay controls are buttons.

## Deployment

The site is served by **GitHub Pages** from a **GitHub Actions** workflow in
`.github/workflows/deploy.yml`: every push to `main` (or a manual *Run workflow*) installs with
`npm ci`, builds with `npm run build` and publishes `dist/` as a Pages artifact.

- Public URL: https://bobbychilami.github.io/Siya-BDay/
- Pages source must be **GitHub Actions** (Settings → Pages → Build and deployment → Source → GitHub Actions).

### First-time enablement (once)

If the repository was previously published with the legacy branch *Deploy from a branch* source,
the Actions workflow can fail at the *Configure Pages* step because the two sources conflict. To
switch:

1. Go to **Settings → Pages → Build and deployment → Source**.
2. Select **GitHub Actions** and save.
3. Push (or re-run) `.github/workflows/deploy.yml`; the workflow now owns the Pages publishing.

Do not use the legacy branch source for this project — that mode publishes the raw repository
tree (including `src/`), so `/src/main.js` and `/src/styles/index.css` resolve to the domain root
and 404, leaving the page unstyled.

Because the site is a project page, all asset URLs are prefixed with `/Siya-BDay/` by
`vite.config.js`. If the repository is ever renamed, update `base` in `vite.config.js`, the
canonical/Open Graph URLs in `index.html`, and `SITE_URL` in `src/config.js` together.

`reference/` (the reference video), `shots/` (local QA captures), `node_modules/` and `dist/`
are git-ignored and never published.

`public/_headers` is a Cloudflare Pages artefact kept for a possible move to Cloudflare;
GitHub Pages ignores it.

## Font licences

Pinyon Script, Cormorant Garamond, Italianno and DM Sans are bundled with their OFL licence
files in `public/fonts/`.
