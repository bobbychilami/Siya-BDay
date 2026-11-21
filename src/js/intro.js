import { SESSION_KEY } from "../config.js";
import { buildIntroTimeline, primeIntroStage, settleInstantly } from "./envelope.js";

/** Controls the invitation reveal, including its instant and replay paths. */
export function initIntro({ reduceMotion = false, onSettled } = {}) {
  const cover = document.getElementById("cover");
  const trigger = document.getElementById("envelopeTrigger");
  const invite = document.getElementById("invite");
  const skip = document.getElementById("skipOpen");
  const replay = document.getElementById("replayBtn");
  if (!cover || !trigger || !invite) return null;

  let reduced = reduceMotion;
  let opened = false;
  let settled = false;
  let timeline = null;
  let watchdog = 0;

  const lock = () => document.documentElement.classList.add("is-locked");
  const unlock = () => document.documentElement.classList.remove("is-locked");

  const readSeen = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  };
  const rememberSeen = (seen) => {
    try {
      if (seen) sessionStorage.setItem(SESSION_KEY, "1");
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* Session storage is optional. */ }
  };

  function settle() {
    if (settled) return;
    settled = true;
    opened = true;
    window.clearTimeout(watchdog);
    cover.classList.add("is-settled");
    invite.setAttribute("aria-hidden", "false");
    trigger.setAttribute("disabled", "disabled");
    trigger.setAttribute("tabindex", "-1");
    skip?.setAttribute("disabled", "disabled");
    unlock();
    rememberSeen(true);
    onSettled?.();
  }

  function open({ instant = false } = {}) {
    if (opened) return;
    opened = true;
    cover.classList.add("is-opening");
    skip?.setAttribute("disabled", "disabled");

    if (instant || reduced) {
      settleInstantly();
      settle();
      return;
    }

    lock();
    try {
      timeline = buildIntroTimeline({ onSettle: settle });
      if (import.meta.env.DEV) window.__introTl = timeline;
      timeline.play(0);
    } catch (error) {
      console.warn("[Siya] opening animation failed; showing the invitation.", error);
      settleInstantly();
      settle();
      return;
    }

    watchdog = window.setTimeout(() => {
      if (!settled) {
        timeline?.kill();
        settleInstantly();
        settle();
      }
    }, 10000);
  }

  function resetForReplay() {
    timeline?.kill();
    timeline = null;
    opened = false;
    settled = false;
    cover.classList.remove("is-settled", "is-opening");
    invite.setAttribute("aria-hidden", "true");
    trigger.removeAttribute("disabled");
    trigger.removeAttribute("tabindex");
    skip?.removeAttribute("disabled");
    primeIntroStage();
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    lock();
    requestAnimationFrame(() => open({ instant: reduced }));
  }

  trigger.addEventListener("click", () => open());
  skip?.addEventListener("click", () => open({ instant: true }));
  replay?.addEventListener("click", () => {
    rememberSeen(false);
    resetForReplay();
  });

  invite.setAttribute("aria-hidden", "true");
  lock();
  if (readSeen() || reduced) {
    requestAnimationFrame(() => open({ instant: true }));
  }

  return {
    open,
    isSettled: () => settled,
    setReducedMotion(value) {
      reduced = Boolean(value);
      if (reduced && !settled) {
        timeline?.kill();
        settleInstantly();
        settle();
      }
    },
  };
}
