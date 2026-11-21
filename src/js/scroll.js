import gsap from "gsap/dist/gsap.js";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

/** Calm reveals and a small amount of artwork depth for the long-form story. */
export function initScroll({ reduceMotion = false } = {}) {
  const items = document.querySelectorAll("main [data-reveal]");
  if (reduceMotion) {
    items.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return { refresh: () => ScrollTrigger.refresh(), destroy() {} };
  }

  const ctx = gsap.context(() => {
    items.forEach((el) => {
      gsap.fromTo(el, { autoAlpha: 0, y: 20 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    gsap.utils.toArray(".story__sprig, .details__lemon, .venue__tree").forEach((el) => {
      gsap.to(el, {
        y: -12,
        ease: "none",
        scrollTrigger: { trigger: el.closest(".section"), start: "top bottom", end: "bottom top", scrub: 1.2 },
      });
    });
  });

  return { refresh: () => ScrollTrigger.refresh(), destroy: () => ctx.revert() };
}
