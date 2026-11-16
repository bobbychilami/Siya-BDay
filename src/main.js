/* Styles live in /src/styles/index.css and are linked from index.html
   so the page is never unstyled when this module fails to load. */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

import { MOTION_KEY } from "./config.js";
import { mountArt } from "./js/art.js";
import { initIntro } from "./js/intro.js";
import { initScroll } from "./js/scroll.js";
import { initCountdown } from "./js/countdown.js";
import { initRsvp } from "./js/rsvp.js";
import { initShare } from "./js/share.js";
import { initAccessibility } from "./js/accessibility.js";

/* ---------- toast ---------- */
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
      window.setTimeout(() => {
        el.hidden = true;
      }, 420);
    }, 3400);
  };
}

/* ---------- motion preference ---------- */
function resolveMotionPreference() {
  let stored = null;
  try {
    stored = localStorage.getItem(MOTION_KEY);
  } catch {
    stored = null;
  }
  if (stored === "1") return true;
  if (stored === "0") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------- boot ---------- */
const reduceMotion = resolveMotionPreference();

mountArt();
document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

const toast = createToast();
const countdown = initCountdown();
const scroll = initScroll({ reduceMotion });

const intro = initIntro({
  reduceMotion,
  onSettled: () => {
    window.setTimeout(() => ScrollTrigger.refresh(), 120);
  },
});

initRsvp({ toast });
initShare({ toast });

initAccessibility({
  reduceMotion,
  onChange: (reduced) => {
    if (reduced) {
      scroll.destroy?.();
      document.querySelectorAll("main [data-reveal]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      intro.dust?.stop();
    } else {
      initScroll({ reduceMotion: false });
      intro.dust?.start();
    }
  },
});

/* keep measurements correct once fonts and the viewport settle */
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

let resizeTimer = 0;
window.addEventListener(
  "resize",
  () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 220);
  },
  { passive: true }
);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) countdown?.refresh?.();
});
