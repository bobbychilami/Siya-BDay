import gsap from "gsap";
import { SESSION_KEY } from "../config.js";
import { buildIntroTimeline, settleInstantly } from "./envelope.js";
import { createDust } from "./particles.js";

/**
 * Orchestrates the opening: session state, scroll lock, skip, replay.
 */
export function initIntro({ reduceMotion = false, onSettled } = {}) {
  const cover = document.getElementById("cover");
  const seal = document.getElementById("seal");
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
        // Reveal the card without the envelope animation.
        const f = document.querySelector(".env-float");
        if (f) f.style.pointerEvents = "none";
        gsap.set(f, { autoAlpha: 0 });
        gsap.set(invite, { opacity: 1, y: 0, scale: 1 });
        gsap.set(document.getElementById("inviteFrame"), { clipPath: "inset(0% 0% 0% 0%)" });
        gsap.set("#bloom, .env-glow", { opacity: 0 });
        invite.setAttribute("aria-hidden", "false");
        cover.classList.add("is-settled");
        unlock();
        settled = true;
        opened = true;
        dust.start();
        onSettled?.();
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
    const envFloat = document.querySelector(".env-float");
    opened = false;
    settled = false;
    cover.classList.remove("is-settled", "is-opening");
    invite.setAttribute("aria-hidden", "true");
    skipBtn?.removeAttribute("disabled");
    gsap.set(envFloat, { autoAlpha: 1, opacity: 1, y: 0, scale: 1, pointerEvents: "auto" });
    gsap.set(invite, { opacity: 0, y: 88, scale: 0.905 });
    gsap.set("#seal", { opacity: 1, scale: 1, y: 0, rotate: 0 });
    gsap.set("#envCard", { yPercent: 0 });
    gsap.set("#envFlap", { rotateX: 0 });
    gsap.set("#inviteFrame", { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(".invite__corner, .invite__sprig, .invite .cover__top, .invite .name, .invite .cover__sunshine, .invite .cover__copy, .invite .cover__date, .invite .scroll-hint", {
      clearProps: "opacity,transform",
    });
    window.scrollTo(0, 0);
    lock();
    // let the reset paint before the timeline starts
    requestAnimationFrame(() => open());
  }

  seal?.addEventListener("click", () => open());
  envelope?.addEventListener("click", (event) => {
    if (event.target.closest("#seal")) return;
    open();
  });
  skipBtn?.addEventListener("click", () => open({ instant: true }));
  replayBtn?.addEventListener("click", () => {
    rememberSeen(false);
    resetForReplay();
  });

  // keyboard: Enter/Space on the envelope itself
  envelope?.setAttribute("tabindex", "-1");

  const seen = readSeen();
  if (reduceMotion || seen) {
    lock();
    // wait a frame so layout is settled, then present the card directly
    requestAnimationFrame(() => open({ instant: true }));
  } else {
    lock();
  }

  return {
    open,
    isSettled: () => settled,
    dust,
  };
}
