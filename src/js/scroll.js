import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Scroll-linked reveals and gentle depth. Deliberately restrained. */
export function initScroll({ reduceMotion = false } = {}) {
  const items = document.querySelectorAll("main [data-reveal]");

  if (reduceMotion) {
    items.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return { refresh: () => ScrollTrigger.refresh() };
  }

  const ctx = gsap.context(() => {
    items.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.95,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    });

    // soft parallax on the corner florals
    gsap.utils.toArray(".section-bouquet").forEach((el) => {
      gsap.to(el, {
        y: -26,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest(".section"),
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      });
    });

    // venue illustration settles as it enters
    const venueArt = document.querySelector(".venue-art > svg");
    if (venueArt) {
      gsap.fromTo(
        venueArt,
        { scale: 1.05 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".venue-art",
            start: "top bottom",
            end: "top 40%",
            scrub: 0.6,
          },
        }
      );
    }

    // closing monogram drift
    const mono = document.querySelector(".closing__monogram .monogram");
    if (mono) {
      gsap.fromTo(
        mono,
        { y: 14 },
        {
          y: -10,
          ease: "none",
          scrollTrigger: {
            trigger: ".section--closing",
            start: "top bottom",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }
  });

  return {
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => ctx.revert(),
  };
}
