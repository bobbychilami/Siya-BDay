/**
 * Headless Chrome screenshot harness (no dependencies).
 *
 *   node tools/shoot.mjs --w=390 --h=844 --out=shots/cover.png
 *   node tools/shoot.mjs --w=390 --h=844 --full --out=shots/full.png
 *   node tools/shoot.mjs --w=390 --h=844 --click="#seal" --every=400 --count=13 --prefix=shots/open
 *
 * Notes:
 *  - always launches a fresh profile, so sessionStorage starts empty
 *  - --settle=<ms> waits before the first capture
 *  - --scroll=<px> scrolls before capture
 *  - --nojs disables JavaScript (no-JS fallback check)
 *  - --reduced emulates prefers-reduced-motion: reduce
 *  - --js=<expr> runs after --click/--scroll and before the capture
 *  - --focus=<selector> --key=Enter|Space sends a real key to a control
 *  - --jpeg writes a .jpg (quality via --quality)
 *  - --reload reloads once before the capture (session-persistence check)
 *  - console errors/exceptions are printed as ERR lines
 */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.length ? rest.join("=") : true];
  })
);

const W = Number(argv.w || 390);
const H = Number(argv.h || 844);
const DPR = Number(argv.dpr || 2);
const URL_ = String(argv.url || "http://localhost:5199/Siya-BDay/");
const SETTLE = Number(argv.settle ?? 1400);
const SCROLL = Number(argv.scroll ?? 0);
const CLICK = argv.click ? String(argv.click) : "";
const EVERY = Number(argv.every ?? 400);
const COUNT = Number(argv.count ?? 1);
const SEEK = argv.seek ? String(argv.seek).split(",").map(Number) : null;
const EVAL = argv.eval ? String(argv.eval) : "";
const PREFIX = argv.prefix ? String(argv.prefix) : "";
const OUT = argv.out ? String(argv.out) : "";
const FULL = Boolean(argv.full);
const MOBILE = argv.mobile === "false" ? false : true;
const NOJS = Boolean(argv.nojs);
const REDUCED = Boolean(argv.reduced);
const PRE = argv.js ? String(argv.js) : "";
const FOCUS = argv.focus ? String(argv.focus) : "";
const KEY = argv.key ? String(argv.key) : "";
const JPEG = Boolean(argv.jpeg);
const QUALITY = Number(argv.quality ?? 88);
const RELOAD = Boolean(argv.reload);
const PORT = 9333 + Math.floor(Math.random() * 300);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), "siya-chrome-"));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--force-color-profile=srgb",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(100);
  }
  throw new Error("devtools never came up");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: ok, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else ok(msg.result);
      } else if (msg.method) {
        for (const fn of this.handlers.get(msg.method) || []) fn(msg.params);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((ok, reject) => {
      this.pending.set(id, { resolve: ok, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 30000);
    });
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
}

const wsUrl = await waitForDevtools();
const ws = new WebSocket(wsUrl);
await new Promise((ok, err) => {
  ws.addEventListener("open", ok);
  ws.addEventListener("error", err);
});
const cdp = new Cdp(ws);

const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

const errs = [];
const logs = [];
cdp.on("Runtime.exceptionThrown", (p) => {
  errs.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || "exception");
});
cdp.on("Runtime.consoleAPICalled", (p) => {
  if (p.type === "error" || p.type === "warning") {
    logs.push(`${p.type}: ${p.args.map((a) => a.value ?? a.description ?? a.type).join(" ")}`);
  }
});
cdp.on("Log.entryAdded", (p) => {
  if (p.entry.level === "error" || p.entry.level === "warning") logs.push(`${p.entry.level}: ${p.entry.text}`);
});

await cdp.send("Runtime.enable", {}, sessionId);
await cdp.send("Log.enable", {}, sessionId);
await cdp.send("Page.enable", {}, sessionId);

await cdp.send(
  "Emulation.setDeviceMetricsOverride",
  { width: W, height: H, deviceScaleFactor: DPR, mobile: MOBILE },
  sessionId
);
await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: MOBILE, maxTouchPoints: 5 }, sessionId);

if (REDUCED) {
  await cdp.send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
    sessionId
  );
}
if (NOJS) {
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: true }, sessionId);
}

async function navigate(url) {
  await cdp.send("Page.navigate", { url }, sessionId);
  await sleep(260);
  for (let i = 0; i < 200; i++) {
    const { result } = await cdp.send(
      "Runtime.evaluate",
      { expression: "document.readyState", returnByValue: true },
      sessionId
    );
    if (result.value === "complete") break;
    await sleep(60);
  }
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description || ""));
  return result.value;
}

async function capture(path, { full = false } = {}) {
  let clip;
  if (full) {
    const metrics = await cdp.send("Page.getLayoutMetrics", {}, sessionId);
    const size = metrics.cssContentSize || metrics.contentSize;
    clip = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 };
  }
  const { data } = await cdp.send(
    "Page.captureScreenshot",
    {
      format: JPEG ? "jpeg" : "png",
      ...(JPEG ? { quality: QUALITY } : {}),
      fromSurface: true,
      captureBeyondViewport: full,
      ...(clip ? { clip } : {}),
    },
    sessionId
  );
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.from(data, "base64"));
  return abs;
}

await navigate(URL_);
await sleep(SETTLE);

if (CLICK && !NOJS) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(CLICK)}); if (!el) return "missing"; el.click(); return "clicked"; })()`);
  await sleep(900);
}

if (SCROLL && !NOJS) {
  await evaluate(`window.scrollTo(0, ${SCROLL})`);
  await sleep(1100);
}

if (PRE && !NOJS) {
  await evaluate(PRE);
  await sleep(1000);
}

if (FOCUS && !NOJS) {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(FOCUS)}); if (!el) return "missing"; el.focus(); return document.activeElement === el; })()`);
  await sleep(200);
}

if (KEY && !NOJS) {
  const code = KEY === "Space" ? 32 : KEY === "Tab" ? 9 : 13;
  const key = KEY === "Space" ? " " : KEY === "Tab" ? "Tab" : "Enter";
  const keyCode = KEY === "Space" ? "Space" : KEY;
  const base = { key, code: keyCode, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
  const text = KEY === "Space" ? " " : KEY === "Enter" ? "\r" : undefined;
  await cdp.send(
    "Input.dispatchKeyEvent",
    text ? { ...base, type: "keyDown", text, unmodifiedText: text } : { ...base, type: "keyDown" },
    sessionId
  );
  await cdp.send("Input.dispatchKeyEvent", { ...base, type: "keyUp" }, sessionId);
  await sleep(1400);
}

if (RELOAD && !NOJS) {
  await cdp.send("Page.reload", {}, sessionId);
  await sleep(300);
  for (let i = 0; i < 200; i++) {
    const { result } = await cdp.send(
      "Runtime.evaluate",
      { expression: "document.readyState", returnByValue: true },
      sessionId
    );
    if (result.value === "complete") break;
    await sleep(60);
  }
  await sleep(SETTLE);
}

const written = [];

if (PREFIX && SEEK) {
  await evaluate(`(() => { const tl = window.__introTl; if (!tl) return "no-timeline"; tl.pause(0); return tl.duration(); })()`);
  for (const t of SEEK) {
    await evaluate(`(() => { window.__introTl.pause(${t}); return 1; })()`);
    await sleep(140);
    written.push(await capture(`${PREFIX}-${String(t).replace(".", "_")}.png`));
  }
} else if (PREFIX && COUNT > 1) {
  for (let i = 0; i < COUNT; i++) {
    const label = String(i).padStart(2, "0");
    written.push(await capture(`${PREFIX}-${label}.png`));
    await sleep(EVERY);
  }
} else if (OUT) {
  written.push(await capture(OUT, { full: FULL }));
}

async function readInfo() {
  const { result } = await cdp.send(
    "Runtime.evaluate",
    {
      expression: `({
  w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth,
  sh: document.documentElement.scrollHeight,
  title: document.title,
  locked: document.documentElement.classList.contains("is-locked"),
  settled: document.getElementById("cover")?.classList.contains("is-settled"),
  sheets: [...document.styleSheets].filter((s) => !s.href || !s.href.includes("vite")).length,
  sheetsAll: document.styleSheets.length,
  sections: [...document.querySelectorAll("section[id], main[id]")].map((s) => ({ id: s.id, top: Math.round(s.offsetTop), h: Math.round(s.offsetHeight) }))
})`,
      returnByValue: true,
    },
    sessionId
  );
  return result.value;
}

const info = await readInfo();

if (EVAL) {
  const { result, exceptionDetails } = await cdp.send(
    "Runtime.evaluate",
    { expression: EVAL, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (exceptionDetails) console.log(JSON.stringify({ evalError: exceptionDetails.text }, null, 2));
  else console.log(JSON.stringify({ eval: result.value }, null, 2));
}

console.log(JSON.stringify({ info, files: written, errors: errs, warnings: logs }, null, 2));

ws.close();
chrome.kill();
process.exit(0);
