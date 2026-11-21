/**
 * The single headless-Chrome harness for this project.
 *
 * It attaches to the Chrome instance started by tools/launch-chrome-final.ps1
 * (which writes tools/chrome-ws.log) and drives the dev server through CDP.
 *
 *   # plain capture
 *   node tools/shoot-cdp.mjs --w 1440 --h 900 --out shots/desktop.jpg
 *
 *   # click the opening, wait for it to settle, capture + final DOM
 *   node tools/shoot-cdp.mjs --w 768 --h 1024 --click "#cover" --final --out shots/tablet.jpg
 *
 *   # sample the opening every 400ms for 8s (starts/rises?/settles?/scrolls?)
 *   node tools/shoot-cdp.mjs --w 390 --h 844 --probe --dur 8000 --tag mobile
 *
 *   # scroll the whole page and watch [data-reveal] sections come in
 *   node tools/shoot-cdp.mjs --w 390 --h 844 --click "#cover" --final --walk --step 400
 *
 *   # seek the timeline frame by frame (dev server only: window.__introTl)
 *   node tools/shoot-cdp.mjs --w 390 --h 844 --click "#bow" --seq 0,1200,2400,3600,4800
 *
 * Flags
 *   --w --h --dpr --mobile=false   viewport override (mobile emulation on by default)
 *   --url                          page to load
 *   --reduced                      emulate prefers-reduced-motion: reduce
 *   --nojs                         disable JavaScript (no-JS fallback check)
 *   --click <sel|none>             element to click (default "#bow")
 *   --probe --dur --step --tag     mid-run DOM sampling + wheel-scroll check
 *   --final --wait                 wait, then print FINAL DOM and capture
 *   --seq a,b,c                    pause the intro timeline at those ms
 *   --out --full                   screenshot path, full-page capture
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const THIS = dirname(fileURLToPath(import.meta.url));
const nl = (s) => String(s).replace(/\s+/g, " ").trim();

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const val = (name, fallback) => {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const next = argv[i + 1];
  return next === undefined || next.startsWith("--") ? true : next;
};
const num = (name, fallback) => {
  const v = val(name, fallback);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const W = num("--w", 390);
const H = num("--h", 844);
const DPR = num("--dpr", 1);
const MOBILE = String(val("--mobile", "true")) !== "false";
const URL_ = String(val("--url", "http://127.0.0.1:5199/Siya-BDay/"));
const CLICK = String(val("--click", "#bow"));
const TAG = String(val("--tag", `${W}x${H}`));
const OUT = String(val("--out", join(THIS, "..", "shots", `cdp-${TAG}.jpg`)));
const FULL = flag("--full");
const PROBE = flag("--probe");
const FINAL = flag("--final");
const SEQ = flag("--seq") ? String(val("--seq", "")).split(",").map(Number) : null;
const WALK = flag("--walk");
const SCROLL_TO = val("--scroll-to", null);
const DUR = num("--dur", 8000);
const STEP = num("--step", 400);
const WAIT = num("--wait", 7000);
const SETTLE_MS = num("--settle", 1200);

const wsLog = join(THIS, "chrome-ws.log");
if (!existsSync(wsLog)) {
  console.error("missing tools/chrome-ws.log — run tools/launch-chrome-final.ps1 first");
  process.exit(2);
}
const WS_URL = readFileSync(wsLog, "utf8").replace(/\r/g, "").match(/WS_URL=(ws\S+)/)?.[1];
if (!WS_URL) {
  console.error("no WS_URL in tools/chrome-ws.log — relaunch Chrome");
  process.exit(2);
}
if (typeof globalThis.WebSocket !== "function") {
  console.error("this Node has no global WebSocket");
  process.exit(3);
}

const ws = new WebSocket(WS_URL);
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  const slot = pending.get(msg.id);
  if (!slot) return;
  pending.delete(msg.id);
  msg.error ? slot.err(new Error(msg.error.message)) : slot.ok(msg.result);
});
await new Promise((ok, err) => {
  ws.addEventListener("open", ok);
  ws.addEventListener("error", () => err(new Error(`cannot reach ${WS_URL}`)));
});

function send(method, params = {}, sessionId) {
  const id = ++seq;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((ok, err) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      err(new Error(`timeout: ${method}`));
    }, 30000);
    pending.set(id, {
      ok: (r) => {
        clearTimeout(timer);
        ok(r);
      },
      err: (e) => {
        clearTimeout(timer);
        err(e);
      },
    });
    ws.send(JSON.stringify(payload));
  });
}

async function evaluate(expression, sessionId) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) {
    throw new Error(`${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ""}`);
  }
  return r.result?.value;
}

async function capture(path, sessionId, full = FULL) {
  const params = { format: "jpeg", quality: 88, fromSurface: true };
  if (full) {
    const metrics = await send("Page.getLayoutMetrics", {}, sessionId);
    const size = metrics.cssContentSize || metrics.contentSize;
    params.captureBeyondViewport = true;
    params.clip = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 };
  }
  const shot = await send("Page.captureScreenshot", params, sessionId);
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.from(shot.data, "base64"));
  return abs;
}

const SAMPLE = `(() => {
  const html = document.documentElement;
  const cover = document.getElementById('cover');
  const inv = document.getElementById('invite');
  const tl = window.__introTl;
  const ir = inv ? inv.getBoundingClientRect() : null;
  return {
    locked: html.classList.contains('is-locked'),
    opening: !!cover && cover.classList.contains('is-opening'),
    settled: !!cover && cover.classList.contains('is-settled'),
    tl: tl ? { d: +tl.duration().toFixed(2), p: +tl.progress().toFixed(3), paused: tl.paused() } : null,
    invOp: inv ? +(inv.style.opacity || getComputedStyle(inv).opacity) : null,
    invClip: inv ? getComputedStyle(inv).clipPath : null,
    invRect: ir ? { top: Math.round(ir.top), h: Math.round(ir.height) } : null,
    coverH: cover ? Math.round(cover.getBoundingClientRect().height) : null,
    htmlOverflow: getComputedStyle(html).overflowY,
    scrollH: html.scrollHeight
  };
})()`;

async function wheelTest(sessionId) {
  await evaluate("window.scrollTo(0, 0)", sessionId);
  await new Promise((r) => setTimeout(r, 200));
  await send(
    "Input.dispatchMouseEvent",
    { type: "mouseWheel", x: Math.round(W / 2), y: Math.round(H / 2), deltaX: 0, deltaY: 600 },
    sessionId
  );
  await new Promise((r) => setTimeout(r, 500));
  const res = await evaluate(
    "({ y: Math.round(window.scrollY), docH: document.documentElement.scrollHeight, wheelScrolls: window.scrollY > 0 })",
    sessionId
  );
  console.log("WHEEL", JSON.stringify(res));
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Log.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DPR, mobile: MOBILE }, sessionId);
if (flag("--reduced")) {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
}
if (flag("--nojs")) {
  await send("Emulation.setScriptExecutionDisabled", { value: true }, sessionId);
}

const consoleErrors = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === "Runtime.exceptionThrown") {
    consoleErrors.push(nl(msg.params?.exceptionDetails?.exception?.description ?? msg.params?.exceptionDetails?.text));
  }
  if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
    consoleErrors.push(nl(msg.params.entry.text));
  }
});

await send("Page.navigate", { url: URL_ }, sessionId);
for (let i = 0; i < 100; i++) {
  if ((await evaluate("document.readyState", sessionId)) === "complete") break;
  await new Promise((r) => setTimeout(r, 100));
}
await new Promise((r) => setTimeout(r, SETTLE_MS));

console.log(`=== ${TAG} ${W}x${H} dpr${DPR} ${MOBILE ? "mobile" : "desktop"} ===`);
if (flag("--measure")) {
  const boxes = await evaluate(
    `(() => {
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      };
      const inner = document.querySelector('.invite__inner');
      return {
        cover: box('#cover'), stage: box('.stage'), invite: box('#invite'),
        paper: box('.invite__paper'), inner: box('.invite__inner'),
        innerScroll: inner ? inner.scrollHeight : null,
        envelope: box('#envelope')
      };
    })()`,
    sessionId
  );
  console.log("BOXES ", JSON.stringify(boxes));
}
console.log("PRE   ", JSON.stringify(await evaluate(SAMPLE, sessionId)));

if (!flag("--nojs") && CLICK !== "none") {
  const res = await evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(CLICK)}); if (!el) return 'missing'; el.click(); return 'clicked ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]); })()`,
    sessionId
  );
  console.log("CLICK ", CLICK, "->", res);
}

if (WALK) {
  if (FINAL) await new Promise((r) => setTimeout(r, WAIT));
  console.log("WALK START", JSON.stringify(await evaluate(SAMPLE, sessionId)));
  // step the page down like a reader would and watch [data-reveal] come in
  const total = await evaluate("document.documentElement.scrollHeight - window.innerHeight", sessionId);
  let revealed = 0;
  let minOp = 1;
  for (let y = 0; y <= total + STEP - 1; y += STEP) {
    await evaluate(`window.scrollTo(0, ${Math.min(y, total)})`, sessionId);
    await new Promise((r) => setTimeout(r, 320));
    const s = await evaluate(
      `(() => {
        const els = [...document.querySelectorAll('main [data-reveal]')];
        const ops = els.map((el) => parseFloat(getComputedStyle(el).opacity));
        return {
          total: els.length,
          shown: ops.filter((o) => o > 0.85).length,
          min: Math.min(...ops),
          at: Math.round(window.scrollY)
        };
      })()`,
      sessionId
    );
    revealed = s.shown;
    minOp = s.min;
    console.log(`walk y=${String(s.at).padStart(5)} shown=${s.shown}/${s.total} minOpacity=${s.min}`);
  }
  console.log("WALK FINAL", JSON.stringify({ revealed, minOp, scrollHeight: total + H }));
  console.log("WROTE", await capture(OUT, sessionId));
} else if (SEQ) {
  for (const t of SEQ) {
    const tl = await evaluate(
      `(() => { const tl = window.__introTl; if (!tl) return null; tl.pause(${Number(t) / 1000}); return { d: tl.duration(), p: +tl.progress().toFixed(3) }; })()`,
      sessionId
    );
    await new Promise((r) => setTimeout(r, 180));
    console.log("SEQ", String(t).padStart(5), "dom:", JSON.stringify(await evaluate(SAMPLE, sessionId)), "tl:", tl ? JSON.stringify(tl) : "no-tl");
    console.log("SEQ", String(t).padStart(5), "->", await capture(join(THIS, "..", "shots", `seq-${TAG}-${t}.jpg`), sessionId));
  }
} else if (PROBE) {
  const start = Date.now();
  const shots = [];
  for (let t = STEP; t <= DUR; t += STEP) {
    await new Promise((r) => setTimeout(r, Math.max(0, start + t - Date.now())));
    const elapsed = Date.now() - start;
    console.log(`t=${String(elapsed).padStart(5)}ms`, JSON.stringify(await evaluate(SAMPLE, sessionId)));
    if (t === 2800 || t === DUR) {
      shots.push(await capture(join(THIS, "..", "shots", `probe-${TAG}-${elapsed}.jpg`), sessionId));
    }
  }
  await wheelTest(sessionId);
  console.log("SHOTS", shots.join(" | "));
} else if (SCROLL_TO) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(String(SCROLL_TO))}); if (!el) return false; el.scrollIntoView({ behavior: "instant", block: "start" }); return true; })()`, sessionId);
  await new Promise((r) => setTimeout(r, 800));
  console.log("SECTION", SCROLL_TO, JSON.stringify(await evaluate("({ y: Math.round(window.scrollY), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth })", sessionId)));
  console.log("WROTE", await capture(OUT, sessionId));
} else if (FINAL) {
  await new Promise((r) => setTimeout(r, WAIT));
  console.log("FINAL DOM:", JSON.stringify(await evaluate(SAMPLE, sessionId)));
  // photograph the settled cover from the top of the page, then test scrolling
  await evaluate("window.scrollTo(0, 0)", sessionId);
  await new Promise((r) => setTimeout(r, 250));
  console.log("WROTE", await capture(OUT, sessionId));
  await wheelTest(sessionId);
} else {
  await new Promise((r) => setTimeout(r, 1500));
  console.log("WROTE", await capture(OUT, sessionId));
}

if (consoleErrors.length) {
  console.log("CONSOLE ERRORS:", JSON.stringify(consoleErrors.slice(0, 8)));
} else {
  console.log("CONSOLE ERRORS: none");
}

ws.close();
