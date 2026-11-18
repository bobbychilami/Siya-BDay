import { SESSION_KEY } from "../config.js";
import { buildIntroTimeline, primeIntroStage, settleInstantly } from "./envelope.js";
import { createDust } from "./particles.js";

/**
 * Orchestrates the opening: session state, scroll lock, skip, replay.
 */
export function initIntro({ reduceMotion = false, onSettled } = {}) {
  const cover = document.getElementById("cover");
  const bow = document.getElementById("bow");
  const envelope = document.getElementById("envelope");
  const invite = document.getElementById("invite");
  const skipBtn = document.getElementById("skipOpen");
  const replayBtn = document.getElementById("replayBtn");
  const canvas = document.getElementById("dust");

  const dust = createDust(canvas, { reduceMotion });

  // Hidden from assistive tech only while the opening is scripted; with
  // JavaScript disabled this is never set, so the static card stays readable.
  invite?.setAttribute("aria-hidden", "true");

  let opened = false;
  let settled = false;
  let tl = null;

  const lock = () => document.documentElement.classList.add("is-locked");
  const unlock = () => document.documentElement.classList.remove("is-locked");

  const readSeen = () => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  };
  const rememberSeen = (value) => {
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, "1");
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage may be unavailable — the session simply replays */
    }
  };

  function settle() {
    if (settled) return;
    settled = true;
    opened = true;
    window.clearTimeout(settleTimer);
    cover.classList.add("is-settled");
    invite.setAttribute("aria-hidden", "false");
    unlock();
    rememberSeen(true);
    dust.start();
    onSettled?.();
  }

  // Safety net: if the intro timeline never reaches a settled state
  // (timeline error, missing DOM, interrupted play), reveal the card so
  // the visitor is not left looking at a blank cover.
  let settleTimer = 0;
  function armSettleWatchdog() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (!settled && cover) {
        settleInstantly({ fade: 0.35 });
        settle();
      }
    }, 9000);
  }
  function clearSettleWatchdog() {
    window.clearTimeout(settleTimer);
  }

  function open({ instant = false } = {}) {
    if (opened) return;
    opened = true;
    cover.classList.add("is-opening");
    skipBtn?.setAttribute("disabled", "disabled");

    if (instant) {
      settleInstantly({ fade: 0.4 });
      settle();
      clearSettleWatchdog();
      return;
    }

    dust.start();
    armSettleWatchdog();
    if (!tl) {
      tl = buildIntroTimeline({
        onIgnite: () => {
          dust.burst();
          if (navigator.vibrate) navigator.vibrate(10);
        },
        onSettle: settle,
      });
      if (import.meta.env.DEV) window.__introTl = tl;
    }
    try {
      tl.play(0);
    } catch (err) {
      console.warn("[Siya] intro timeline failed; revealing the card.", err);
      settle();
    }
  }

  function resetForReplay() {
    opened = false;
    settled = false;
    cover.classList.remove("is-settled", "is-opening");
    invite.setAttribute("aria-hidden", "true");
    skipBtn?.removeAttribute("disabled");
    primeIntroStage();
    window.scrollTo(0, 0);
    lock();
    dust.start();
    // let the reset paint before the timeline starts
    requestAnimationFrame(() => open());
  }

  bow?.addEventListener("click", () => open());
  envelope?.addEventListener("click", (event) => {
    if (event.target.closest("#bow")) return;
    open();
  });
  // Tapping anywhere on the painted cover opens it, including the paper
  // around the envelope. open() is idempotent, so the bow/envelope handlers
  // firing first simply make this a no-op, and the skip button still takes
  // its own instant path because it runs before the event bubbles here.
  cover?.addEventListener("click", (event) => {
    if (event.target.closest("#skipOpen")) return;
    open();
  });
  skipBtn?.addEventListener("click", () => open({ instant: true }));
  replayBtn?.addEventListener("click", () => {
    rememberSeen(false);
    resetForReplay();
  });

  // keyboard: Enter/Space land on the bow button natively; the envelope
  // itself is a pointer affordance only.
  envelope?.setAttribute("aria-hidden", "false");

  const seen = readSeen();
  if (reduceMotion || seen) {
    lock();
    // wait a frame so layout is settled, then present the card directly
    requestAnimationFrame(() => open({ instant: true }));
  } else {
    lock();
    // petals drift while the envelope waits to be opened
    dust.start();
  }

  return {
    open,
    isSettled: () => settled,
    dust,
  };
}
