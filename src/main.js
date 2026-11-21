import gsap from "gsap/dist/gsap.js";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger.js";

import { MAPS_URL, MAPS_DIRECTIONS_URL, MOTION_KEY, RSVP_URL } from "./config.js";
import { initIntro } from "./js/intro.js";
import { initScroll } from "./js/scroll.js";
import { initCountdown } from "./js/countdown.js";
import { initRsvp } from "./js/rsvp.js";
import { initShare } from "./js/share.js";
import { initAccessibility } from "./js/accessibility.js";

let intro = null;
let scroll = null;
let countdown = null;

function createToast() {
  const el = document.getElementById("toast");
  let timer = 0;
  return (message) => {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      el.classList.remove("is-visible");
      window.setTimeout(() => { el.hidden = true; }, 240);
    }, 3200);
  };
}

function resolveMotionPreference() {
  try {
    const stored = localStorage.getItem(MOTION_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch { /* Local storage is optional. */ }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function syncCardBox() {
  // 100vw includes the scrollbar; the card must match the real content box.
  const root = document.documentElement;
  root.style.setProperty("--card-w", `${root.clientWidth}px`);
  root.style.setProperty("--card-h", `${root.clientHeight}px`);
}

function boot() {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const reduceMotion = resolveMotionPreference();
  syncCardBox();
  window.addEventListener("resize", syncCardBox, { passive: true });
  root.classList.remove("no-js");
  root.classList.add("js");

  const toast = createToast();
  countdown = initCountdown();
  scroll = initScroll({ reduceMotion });
  intro = initIntro({
    reduceMotion,
    onSettled: () => {
      syncCardBox();
      window.setTimeout(() => ScrollTrigger.refresh(), 120);
    },
  });
  initRsvp({ toast });
  initShare({ toast });

  // one source of truth for every outbound link
  const links = {
    mapsLink: MAPS_URL,
    venueDirectionsLink: MAPS_DIRECTIONS_URL,
    directionsLink: MAPS_DIRECTIONS_URL,
    rsvpLink: RSVP_URL,
    rsvpQuickLink: RSVP_URL,
  };
  Object.entries(links).forEach(([id, href]) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  });

  initAccessibility({
    reduceMotion,
    onChange: (reduced) => {
      intro?.setReducedMotion(reduced);
      scroll?.destroy?.();
      scroll = initScroll({ reduceMotion: reduced });
      if (!reduced) requestAnimationFrame(() => ScrollTrigger.refresh());
    },
  });

  if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) countdown?.refresh?.();
  });
}

try {
  boot();
} catch (error) {
  console.warn("[Siya] app boot failed; showing the static invitation.", error);
  document.documentElement.classList.remove("js");
  document.documentElement.classList.add("no-js");
  document.documentElement.classList.remove("is-locked");
}

try {
  document.documentElement.dataset.appReady = "1";
  document.documentElement.dispatchEvent(new Event("app-ready", { bubbles: true }));
} catch { /* The readiness event is a progressive enhancement. */ }
