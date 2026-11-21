import gsap from "gsap/dist/gsap.js";

const byId = (id) => document.getElementById(id);
const pick = (selector) => document.querySelector(selector);

/**
 * Every moving part of the opening. The envelope is built from separate paper,
 * flap, ribbon, bow, tail, seal and liner layers, so each one gets its own
 * transform; no still frame is ever swapped for another.
 */
function refs() {
  return {
    cover: byId("cover"),
    envelope: byId("envelope"),
    trigger: byId("envelopeTrigger"),
    hint: byId("tapHint"),
    skip: byId("skipOpen"),
    flap: byId("flap"),
    liner: pick(".env-liner"),
    flapLift: pick(".env-flap__lift"),
    linerScene: pick(".env-liner__scene"),
    pocket: pick(".env-pocket"),
    back: pick(".env-back"),
    seams: pick(".env-seams"),
    frame: byId("cardFrame"),
    invite: byId("invite"),
    bandL: pick(".tie__band--l"),
    bandR: pick(".tie__band--r"),
    tailL: pick(".tie__tail--l"),
    tailR: pick(".tie__tail--r"),
    bow: pick(".tie__bow"),
    knot: pick(".tie__knot"),
    glow: pick(".tie__glow"),
    seal: byId("waxSeal"),
    tie: byId("tie"),
  };
}

/** Mirrors --flap-tip in intro.css; kept numeric so GSAP can tween the clip. */
const MOUTH = "polygon(8% 0%, 92% 0%, 50% 53%)";
const OPEN_CLIP = "polygon(-40% -40%, 140% -40%, 140% 140%, -40% 140%)";

/** Put every layer back in its closed, resting state (also used by replay). */
export function primeIntroStage() {
  const r = refs();
  if (!r.envelope) return;

  gsap.set(r.frame, { clipPath: MOUTH, zIndex: 2 });
  gsap.set(r.tie, { autoAlpha: 1 });
  gsap.set(r.invite, {
    autoAlpha: 0,
    scale: 0.36,
    yPercent: 10,
    rotate: -3.4,
    transformOrigin: "50% 50%",
  });
  gsap.set(r.flap, {
    rotateX: 0,
    rotateY: 0,
    yPercent: 0,
    autoAlpha: 1,
    transformOrigin: "50% 0%",
  });
  gsap.set(r.flapLift, { opacity: 0 });
  gsap.set([r.bandL, r.bandR, r.tailL, r.tailR, r.bow, r.seal], {
    autoAlpha: 1,
    xPercent: 0,
    yPercent: 0,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
  });
  gsap.set(r.knot, { scale: 1, autoAlpha: 1 });
  gsap.set(r.glow, { autoAlpha: 1 });
  gsap.set([r.pocket, r.back, r.seams, r.liner], { autoAlpha: 1 });
  gsap.set(r.linerScene, { scale: 1 });
  gsap.set(r.envelope, { scale: 1 });
  gsap.set(r.trigger, { autoAlpha: 1, pointerEvents: "auto" });
  gsap.set(r.hint, { autoAlpha: 1, y: 0 });
  gsap.set(r.skip, { autoAlpha: 1, pointerEvents: "auto" });
}

/** The full cinematic: untie → release → hinge → rise → settle. */
export function buildIntroTimeline({ onSettle } = {}) {
  const r = refs();
  primeIntroStage();

  const tl = gsap.timeline({ paused: true, onComplete: () => onSettle?.() });

  // Stage 2 · the press, and the note that told the guest what to do
  tl.to(r.envelope, { scale: 0.994, duration: 0.16, yoyo: true, repeat: 1, ease: "power1.inOut" }, 0)
    .to(r.hint, { autoAlpha: 0, y: -6, duration: 0.45, ease: "power2.out" }, 0.02)
    .to(r.skip, { autoAlpha: 0, duration: 0.3, ease: "power1.out", pointerEvents: "none" }, 0.05)
    .to(r.glow, { autoAlpha: 0, duration: 0.4, ease: "power1.out" }, 0.1)

    // the wax seal lifts, comes free and tumbles away
    .to(r.seal, { yPercent: -7, rotate: "+=5", scale: 1.03, duration: 0.3, ease: "power2.out" }, 0.22)
    .to(r.seal, { yPercent: 240, xPercent: 14, rotate: "+=58", scale: 0.72, autoAlpha: 0, duration: 0.82, ease: "power2.in" }, 0.54)

    // the bow loses its tension, then slips off the paper
    .to(r.bow, { scale: 1.035, yPercent: -3, rotate: -1.1, duration: 0.58, ease: "power2.out" }, 0.34)
    .to(r.knot, { scale: 0.84, duration: 0.45, ease: "power2.inOut" }, 0.46)
    .to(r.bow, { yPercent: 30, rotate: 1.6, autoAlpha: 0, duration: 0.72, ease: "power2.in" }, 1.02)
    .to(r.knot, { scale: 0.7, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 1.05)

    // the tails swing from the knot and fall away
    .to(r.tailL, { rotate: -9, xPercent: -4, yPercent: 4, duration: 0.55, ease: "power2.out" }, 0.4)
    .to(r.tailR, { rotate: 9, xPercent: 4, yPercent: 4, duration: 0.55, ease: "power2.out" }, 0.4)
    .to(r.tailL, { yPercent: 46, xPercent: -10, rotate: -27, autoAlpha: 0, duration: 0.85, ease: "power2.in" }, 0.9)
    .to(r.tailR, { yPercent: 46, xPercent: 10, rotate: 27, autoAlpha: 0, duration: 0.85, ease: "power2.in" }, 0.94)

    // the band unthreads from both sides
    .to([r.bandL, r.bandR], { yPercent: 5, duration: 0.32, ease: "power1.out" }, 0.46)
    .to(r.bandL, { xPercent: -15, yPercent: 16, autoAlpha: 0, duration: 0.75, ease: "power2.in" }, 0.86)
    .to(r.bandR, { xPercent: 15, yPercent: 16, autoAlpha: 0, duration: 0.75, ease: "power2.in" }, 0.9)

    // Stage 3 · the flap hinges up and back on the top edge
    .to(r.flap, { rotateX: -13, duration: 0.52, ease: "power2.out" }, 0.66)
    .to(r.flapLift, { opacity: 0.9, duration: 0.9, ease: "power2.out" }, 0.72)
    .to(r.flap, { rotateX: -104, duration: 1.05, ease: "power2.inOut" }, 1.14)
    .to(r.flap, { autoAlpha: 0, duration: 0.4, ease: "power1.out" }, 2.06)

    // the painted coast inside catches the light
    .fromTo(r.linerScene, { scale: 1.07 }, { scale: 1, duration: 1.5, ease: "power2.out" }, 1.15)

    // Stage 4 · the card rises out of the mouth
    .set(r.invite, { autoAlpha: 1 }, 1.46)
    .to(r.invite, { yPercent: -39, scale: 0.36, rotate: -1.2, duration: 1.16, ease: "power2.inOut" }, 1.5)

    // Stage 5 · it clears the pocket, comes forward and fills the view. The card
    // is fully outside the mouth at this instant, so releasing the clip is invisible.
    .set(r.frame, { zIndex: 13, clipPath: OPEN_CLIP }, 2.64)
    .to(r.invite, { yPercent: 0, scale: 1, rotate: 0, duration: 1.24, ease: "power3.inOut" }, 2.64)
    .to(r.invite, { scale: 1.005, duration: 0.26, ease: "power2.out" }, 3.84)
    .to(r.invite, { scale: 1, duration: 0.28, ease: "power2.inOut" }, 4.1)
    .to([r.pocket, r.back, r.seams, r.liner], { autoAlpha: 0, duration: 0.55, ease: "power1.out" }, 3.1)
    .addLabel("settled", 4.4)
    .to({}, { duration: 0.12 });

  return tl;
}

/** Jump to the finished invitation (reduced motion, skipped, or seen before). */
export function settleInstantly() {
  const r = refs();
  if (!r.envelope) return;
  gsap.set(r.frame, { clipPath: "none", zIndex: 13 });
  gsap.set(r.invite, { autoAlpha: 1, scale: 1, yPercent: 0, rotate: 0 });
  gsap.set([r.pocket, r.back, r.seams, r.liner, r.flap, r.tie, r.trigger], {
    autoAlpha: 0,
    pointerEvents: "none",
  });
  gsap.set([r.hint, r.skip], { autoAlpha: 0, pointerEvents: "none" });
}
