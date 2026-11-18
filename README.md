# Siya's First Birthday — Invitation

An interactive digital invitation for **Siya's First Birthday** — Sunday, 22 November 2026, 6:30 PM IST,
Hotel Raviraj, Ghijavne Road, Gadhinglaj 416502, Maharashtra, India.
Hosted by Bobby Chilami and Snehal Chilami.

**Live:** https://bobbychilami.github.io/Siya-BDay/  
**Repository:** https://github.com/bobbychilami/Siya-BDay

Vanilla HTML5, CSS3 and ES modules on Vite, animated with GSAP + ScrollTrigger.
All botanical artwork is original generated SVG; the dust motes are Canvas 2D.

> **This branch — `experiment/italian-coast-birthday` — is an alternative art direction, not the
> published invitation.** It re-imagines the same event as a hand-painted Italian-Riviera
> stationery set: a portrait envelope tied with a satin ribbon, a watercolour coast inside an
> arched cameo, and powder blue / blush / lemon paper. `main` still holds the approved version and
> this branch is not merged or deployed. Event facts, the RSVP flow and the deployment setup are
> identical to `main`; only the visual and motion layer differs.

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

`tools/shoot.mjs` drives headless Chrome over the DevTools protocol — no extra dependencies.

```bash
node tools/shoot.mjs --w=390 --h=844 --out=shots/cover.png
node tools/shoot.mjs --w=390 --h=844 --click="#skipOpen" --scroll=3461 --out=shots/rsvp.png
node tools/shoot.mjs --w=1440 --h=900 --dpr=1 --out=shots/desktop.png
node tools/shoot.mjs --nojs --out=shots/no-js.png          # JavaScript disabled
node tools/shoot.mjs --reduced --out=shots/reduced.png     # prefers-reduced-motion
node tools/shoot.mjs --focus="#bow" --key=Enter            # keyboard activation
node tools/shoot.mjs --click="#skipOpen" --reload          # session persistence
node tools/shoot.mjs --js="…" --eval="…"                   # scriptable checks
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
- Without JavaScript the invitation renders as a plain static card; the RSVP panel points
  guests to the family instead.

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
