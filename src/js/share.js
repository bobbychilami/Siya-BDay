import { copyText } from "./rsvp.js";
import { EVENT } from "../config.js";

/** Native share sheet, with a clipboard fallback. */
export function initShare({ toast } = {}) {
  const btn = document.getElementById("shareBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = window.location.origin + window.location.pathname;
    const payload = {
      title: `${EVENT.celebrant}'s First Birthday`,
      text: `Join ${EVENT.parents.join(" & ")} as they celebrate their little sunshine. ${EVENT.shortDate} | ${EVENT.timeLabel}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const ok = await copyText(`${payload.text}\n${payload.url}`);
    toast?.(ok ? "Invitation link copied" : "Sharing is unavailable in this browser");
  });
}
