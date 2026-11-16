import gsap from "gsap";

/**
 * The opening choreography.
 * One master timeline with named labels: ignite → unfold → rise → settle.
 * Built once, replayed on demand.
 */
export function buildIntroTimeline({ onIgnite, onSettle } = {}) {
  const cover = document.getElementById("cover");
  const envelopeFloat = document.querySelector(".env-float");
  const envelope = document.getElementById("envelope");
  const flap = document.getElementById("envFlap");
  const seal = document.getElementById("seal");
  const envCard = document.getElementById("envCard");
  const envGlow = document.querySelector(".env-glow");
  const bloom = document.getElementById("bloom");
  const invite = document.getElementById("invite");
  const frame = document.getElementById("inviteFrame");
  const corners = document.querySelectorAll(".invite__corner");
  const sprigs = document.querySelectorAll(".invite__sprig");
  const content = document.querySelectorAll(
    ".invite .cover__top, .invite .name, .invite .cover__sunshine, .invite .cover__copy, .invite .cover__date, .invite .scroll-hint"
  );
  const tapHint = document.getElementById("tapHint");
  const sealPlate = document.querySelector(".seal-plate");

  const envH = Math.max(320, envelope.getBoundingClientRect().height || 470);

  gsap.set(seal, { xPercent: -50, yPercent: -50, z: 12, transformOrigin: "50% 50%" });
  gsap.set(frame, { clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(invite, { opacity: 0, y: 88, scale: 0.905, transformOrigin: "50% 62%" });

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.out" },
    onComplete: () => onSettle?.(),
  });

  tl
    /* ---------- A · seal ignition ---------- */
    .addLabel("ignite", 0)
    .to(tapHint, { opacity: 0, duration: 0.4 }, 0.05)
    .to(seal, { scale: 0.93, duration: 0.16, ease: "power2.in" }, 0)
    .to(seal, { scale: 1.05, duration: 0.6, ease: "back.out(2)" }, 0.16)
    .to(bloom, { opacity: 0.34, duration: 0.95, ease: "power2.out" }, 0.12)
    .to(envGlow, { opacity: 1, duration: 1.0, ease: "power2.out" }, 0.14)
    .to(
      ".gold-hair",
      { strokeDashoffset: 0, duration: 1.15, stagger: 0.06, ease: "power2.inOut" },
      0.3
    )

    /* ---------- B · unfolding ---------- */
    .addLabel("unfold", 0.9)
    .to(flap, { rotateX: 118, duration: 1.5, ease: "power3.inOut" }, 0.9)
    .to(envelopeFloat, { y: 12, scale: 0.95, duration: 1.5, ease: "power2.inOut" }, 0.9)
    .to(seal, { y: -envH * 0.26, z: 130, rotate: -8, scale: 0.92, duration: 0.75, ease: "power2.inOut" }, 1.0)
    .to(envCard, { yPercent: -46, duration: 1.2, ease: "power2.inOut" }, 1.5)
    .to(seal, { opacity: 0, scale: 1.12, duration: 0.4, ease: "power2.in" }, 1.35)
    .to(sealPlate, { opacity: 0, duration: 0.45, ease: "power2.in" }, 1.55)
    .to(bloom, { opacity: 0.5, duration: 0.5, ease: "power2.out" }, 1.8)
    .to(bloom, { scale: 1.12, duration: 1.4, ease: "power2.inOut" }, 1.85)

    /* ---------- C · the card rises ---------- */
    .addLabel("rise", 2.3)
    .to(invite, { opacity: 1, y: 0, scale: 1, duration: 1.15, ease: "power3.out" }, 2.35)
    .to(envelopeFloat, { opacity: 0, y: 52, scale: 0.9, duration: 0.85, ease: "power2.inOut" }, 2.45)
    .to(bloom, { opacity: 0, duration: 1.0, ease: "power2.out" }, 2.9)
    .to(frame, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power2.inOut" }, 2.7)
    .from(corners, { opacity: 0, duration: 1.15, stagger: 0.09 }, 2.95)
    .from(sprigs, { opacity: 0, duration: 1.05 }, 3.15)

    /* ---------- D · settlement ---------- */
    .from(
      content,
      { opacity: 0, y: 16, duration: 0.9, stagger: 0.12, ease: "power2.out" },
      3.2
    )
    .addLabel("settle", 4.65)
    .to({}, { duration: 0.25 }, 4.65);

  // seal ignition side effects
  tl.call(() => onIgnite?.(), null, 0.05);

  // keep the envelope wrapper out of the a11y tree once it has receded
  tl.add(() => {
    if (envelopeFloat) envelopeFloat.style.pointerEvents = "none";
  }, 3.6);

  return tl;
}

/** Instant, motion-free path used for skipped openings and reduced-motion visitors. */
export function settleInstantly({ fade = 0.35 } = {}) {
  const envelopeFloat = document.querySelector(".env-float");
  const invite = document.getElementById("invite");
  const frame = document.getElementById("inviteFrame");

  gsap.set(envelopeFloat, { autoAlpha: 0, pointerEvents: "none" });
  gsap.set(frame, { clipPath: "inset(0% 0% 0% 0%)" });
  gsap.set(invite, { opacity: 1, y: 0, scale: 1 });
  if (fade > 0) {
    gsap.fromTo(invite, { opacity: 0 }, { opacity: 1, duration: fade, ease: "power2.out" });
  }
  // hide decorative layers that the timeline would have faded
  gsap.set(["#bloom", ".env-glow"], { opacity: 0 });
  gsap.set(".invite__corner, .invite__sprig, .invite .cover__top, .invite .name, .invite .cover__sunshine, .invite .cover__copy, .invite .cover__date, .invite .scroll-hint", {
    clearProps: "opacity,transform",
  });
}
