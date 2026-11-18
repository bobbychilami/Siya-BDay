import gsap from "gsap";

/**
 * The opening choreography — one continuous paper performance.
 *
 *   untie  · bow releases, ribbon slides off the painted envelope
 *   unfold · side folds swing open, then the top flap
 *   rise   · the ivory invitation edges up out of the pocket
 *   settle · the envelope recedes and the card takes the stage
 *
 * Built lazily on first open so the resting state is pure CSS.
 */

const q = (sel, root = document) => root.querySelector(sel);

function refs() {
  return {
    cover: document.getElementById("cover"),
    envFloat: q(".env-float"),
    envelope: document.getElementById("envelope"),
    ribbon: document.getElementById("ribbon"),
    ribbonTop: q(".ribbon__half--top"),
    ribbonBottom: q(".ribbon__half--bottom"),
    sheen: q(".ribbon__sheen"),
    bow: document.getElementById("bow"),
    knot: q(".bow__knot"),
    loopL: q(".bow__loop--l"),
    loopR: q(".bow__loop--r"),
    tailL: q(".bow__tail--l"),
    tailR: q(".bow__tail--r"),
    top: document.getElementById("envTop"),
    left: document.getElementById("envLeft"),
    right: document.getElementById("envRight"),
    bottom: document.getElementById("envBottom"),
    invite: document.getElementById("invite"),
    frame: document.getElementById("inviteFrame"),
    corners: document.querySelectorAll(".invite__corner"),
    sprigs: document.querySelectorAll(".invite__sprig"),
    content: document.querySelectorAll(".invite__inner > *"),
    tapHint: document.getElementById("tapHint"),
    bloom: document.getElementById("bloom"),
    inside: q(".env-inside"),
    shade: q(".env-inside__shade"),
    wrap: q(".bow__wrap"),
  };
}

/**
 * Resting state for the envelope and the hidden card.
 * Called when the timeline is first built and again on replay.
 */
export function primeIntroStage() {
  const r = refs();

  gsap.set(r.invite, {
    opacity: 0,
    yPercent: 30,
    scale: 0.56,
    clipPath: "inset(0% 0% 100% 0%)",
    transformOrigin: "50% 32%",
    pointerEvents: "none",
  });
  gsap.set(r.frame, { opacity: 0 });

  gsap.set(r.envFloat, { autoAlpha: 1, opacity: 1, y: 0, yPercent: 0, scale: 1, pointerEvents: "auto" });

  gsap.set([r.top, r.left, r.right], { rotateX: 0, rotateY: 0, opacity: 1 });
  gsap.set(r.shade, { opacity: 0 });
  gsap.set(r.wrap, { opacity: 1 });
  gsap.set([r.ribbonTop, r.ribbonBottom], { yPercent: 0, rotate: 0, opacity: 1 });
  gsap.set(r.bow, { opacity: 1, scale: 1 });
  gsap.set([r.loopL, r.loopR, r.tailL, r.tailR, r.knot], {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
  });
  gsap.set(r.sheen, { opacity: 0.9 });
  gsap.set(r.bloom, { opacity: 0, scale: 1 });
  gsap.set([r.corners, r.sprigs, r.content], { clearProps: "opacity,transform" });
}

export function buildIntroTimeline({ onIgnite, onSettle } = {}) {
  const r = refs();

  primeIntroStage();

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.out" },
    onComplete: () => onSettle?.(),
  });

  tl
    /* ---------- A · the bow comes undone ---------- */
    .addLabel("untie", 0)
    .call(() => onIgnite?.(), null, 0.06)
    .to(r.tapHint, { opacity: 0, duration: 0.35 }, 0.05)
    .to(r.bow, { scale: 0.95, duration: 0.18, ease: "power2.in" }, 0)
    .to(r.bow, { scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.17)
    .to(r.loopL, { x: -5, y: -2, rotate: -7, duration: 0.3 }, 0.08)
    .to(r.loopR, { x: 5, y: -2, rotate: 7, duration: 0.3 }, 0.13)
    .to(r.knot, { scale: 0.84, duration: 0.24, ease: "power2.inOut" }, 0.12)

    /* the loops pull tight and collapse into the knot */
    .to(r.loopL, { x: 3, y: -3, rotate: 10, scale: 0.34, opacity: 0, duration: 0.5, ease: "power2.in" }, 0.44)
    .to(r.loopR, { x: -3, y: -3, rotate: -10, scale: 0.34, opacity: 0, duration: 0.5, ease: "power2.in" }, 0.5)
    .to(r.tailL, { y: -7, scale: 0.62, opacity: 0, duration: 0.48, ease: "power2.in" }, 0.56)
    .to(r.tailR, { y: -7, scale: 0.62, opacity: 0, duration: 0.48, ease: "power2.in" }, 0.6)
    .to(r.knot, { scale: 0.4, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.62)
    .to(r.wrap, { opacity: 0, duration: 0.4, ease: "power2.in" }, 0.66)
    .to(r.bow, { opacity: 0, duration: 0.32 }, 0.98)

    /* the ribbon slips away in two calm halves */
    .to(r.sheen, { opacity: 0, duration: 0.3 }, 0.78)
    .to(r.ribbonTop, { yPercent: -64, opacity: 0, duration: 0.85, ease: "power2.inOut" }, 0.78)
    .to(r.ribbonBottom, { yPercent: 64, opacity: 0, duration: 0.85, ease: "power2.inOut" }, 0.84)

    /* ---------- B · the paper unfolds ---------- */
    .addLabel("unfold", 1.55)
    .to(r.envFloat, { y: 12, scale: 0.985, duration: 1.4, ease: "power2.inOut" }, 1.55)
    .to(r.left, { rotateY: 72, opacity: 0, duration: 1.2, ease: "power2.inOut" }, 1.58)
    .to(r.right, { rotateY: -72, opacity: 0, duration: 1.2, ease: "power2.inOut" }, 1.62)
    .to(r.top, { rotateX: -84, duration: 1.15, ease: "power2.inOut" }, 1.72)
    .to(r.shade, { opacity: 0.55, duration: 1.1 }, 1.6)
    .to(r.bloom, { opacity: 0.26, duration: 0.9 }, 1.75)

    /* ---------- C · the invitation rises out of the pocket ---------- */
    .addLabel("rise", 2.4)
    .to(r.invite, { opacity: 1, duration: 0.01 }, 2.4)
    .to(
      r.invite,
      {
        yPercent: 0,
        scale: 0.74,
        clipPath: "inset(0% 0% 50% 0%)",
        duration: 1.15,
        ease: "power2.inOut",
      },
      2.45
    )
    .to(r.invite, { filter: "drop-shadow(0 26px 34px rgba(63,107,124,.22))", duration: 1.0 }, 2.45)

    /* ---------- D · the pocket steps aside, then the card settles ---------- */
    .addLabel("settle", 3.5)
    /* the envelope leaves *before* any copy is readable, so its liner
       never ghosts across the invitation */
    .to(r.envFloat, { opacity: 0, yPercent: 24, scale: 0.88, duration: 0.5, ease: "power2.in" }, 3.5)
    .to(r.bloom, { opacity: 0, duration: 0.5 }, 3.55)
    .to(
      r.invite,
      {
        yPercent: 0,
        scale: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.2,
        ease: "power3.out",
      },
      3.7
    )
    .to(r.frame, { opacity: 1, duration: 0.7 }, 2.95)
    .from(r.corners, { opacity: 0, duration: 0.85, stagger: 0.09 }, 3.05)
    .from(r.sprigs, { opacity: 0, duration: 0.9, stagger: 0.09 }, 4.15)
    .from(r.content, { opacity: 0, y: 16, duration: 0.8, stagger: 0.06, ease: "power2.out" }, 4.05)

    .to({}, { duration: 0.2 }, 5.55);

  tl.add(() => {
    if (r.envFloat) r.envFloat.style.pointerEvents = "none";
  }, 4.0);

  return tl;
}

/** Instant, motion-free path used for skipped openings and reduced-motion visitors. */
export function settleInstantly({ fade = 0.35 } = {}) {
  const r = refs();

  gsap.set(r.envFloat, { autoAlpha: 0, pointerEvents: "none" });
  gsap.set(r.invite, {
    opacity: 1,
    yPercent: 0,
    scale: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    filter: "none",
    pointerEvents: "auto",
  });
  gsap.set(r.frame, { opacity: 1 });
  gsap.set(r.bloom, { opacity: 0 });
  gsap.set([r.corners, r.sprigs, r.content], { clearProps: "opacity,transform" });

  if (fade > 0) {
    gsap.fromTo(r.invite, { opacity: 0 }, { opacity: 1, duration: fade, ease: "power2.out" });
  }
}
