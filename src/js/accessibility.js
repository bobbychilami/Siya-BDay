import { MOTION_KEY } from "../config.js";

/** Motion preference toggle, persisted locally. */
export function initAccessibility({ reduceMotion = false, onChange } = {}) {
  const btn = document.getElementById("motionBtn");
  const root = document.documentElement;

  const apply = (reduced, { persist = true } = {}) => {
    root.classList.toggle("reduce-motion", reduced);
    if (btn) {
      btn.setAttribute("aria-pressed", String(reduced));
      btn.textContent = reduced ? "Motion reduced" : "Reduce motion";
    }
    if (persist) {
      try {
        localStorage.setItem(MOTION_KEY, reduced ? "1" : "0");
      } catch {
        /* storage optional */
      }
    }
    onChange?.(reduced);
  };

  apply(reduceMotion, { persist: false });

  btn?.addEventListener("click", () => {
    const next = !root.classList.contains("reduce-motion");
    apply(next);
  });

  return { set: apply };
}
