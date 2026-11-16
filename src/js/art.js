/* Injects the original SVG artwork into the document. */
import { SPRITE, EXTRA } from "./art.generated.js";
import { MAPS_URL } from "../config.js";

export function mountArt() {
  // sprite with all botanical symbols + gradients
  document.body.insertAdjacentHTML("afterbegin", SPRITE);

  // wax seal outlines (smooth, organic blobs)
  document.querySelectorAll(".seal__path, .rsvp-seal__path").forEach((path) => {
    path.setAttribute("d", EXTRA.sealBlob);
  });

  // deckled paper edges
  document.querySelectorAll(".torn").forEach((el, i) => {
    el.innerHTML = i === 0 ? EXTRA.torn : EXTRA.tornAlt;
  });

  // butterflies
  document.querySelectorAll(".butterfly-slot").forEach((slot) => {
    const tint = slot.dataset.butterfly || "rose";
    slot.insertAdjacentHTML(
      "afterbegin",
      tint === "gold" ? EXTRA.butterflyGold : tint === "wine" ? EXTRA.butterflyWine : EXTRA.butterflyRose
    );
  });

  // ambient florals beside the column on wide screens
  const ambient = document.createElement("div");
  ambient.className = "page-ambient";
  ambient.setAttribute("aria-hidden", "true");
  ambient.innerHTML = `
    <svg class="amb amb--left" viewBox="0 0 320 320"><use href="#bouquet-c" /></svg>
    <svg class="amb amb--right" viewBox="0 0 320 320"><use href="#bouquet-b" /></svg>`;
  document.body.prepend(ambient);

  // map link is generated from the confirmed venue (single source of truth)
  const maps = document.getElementById("mapsLink");
  if (maps) maps.href = MAPS_URL;
}
