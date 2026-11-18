/* Injects the original painted SVG artwork into the document. */
import { SPRITE, EXTRA } from "./coast.generated.js";
import { MAPS_URL } from "../config.js";

const BUTTERFLY = {
  blush: EXTRA.butterflyBlush,
  rose: EXTRA.butterflyBlush,
  sea: EXTRA.butterflySea,
  gold: EXTRA.butterflyLemon,
  lemon: EXTRA.butterflyLemon,
};

export function mountArt() {
  // one sprite holds the gradients, filters and every painted symbol
  document.body.insertAdjacentHTML("afterbegin", SPRITE);

  // deckled paper edges
  document.querySelectorAll(".torn").forEach((el, i) => {
    el.innerHTML = i % 2 === 0 ? EXTRA.torn : EXTRA.tornAlt;
  });

  // butterflies
  document.querySelectorAll(".butterfly-slot").forEach((slot) => {
    const tint = BUTTERFLY[slot.dataset.butterfly] || EXTRA.butterflyBlush;
    slot.insertAdjacentHTML("afterbegin", tint);
  });

  // ambient florals beside the column on wide screens
  const ambient = document.createElement("div");
  ambient.className = "page-ambient";
  ambient.setAttribute("aria-hidden", "true");
  ambient.innerHTML = `
    <svg class="amb amb--left" viewBox="0 0 220 220"><use href="#bougainvillea" /></svg>
    <svg class="amb amb--right" viewBox="0 0 200 200"><use href="#rose-spray" /></svg>`;
  document.body.prepend(ambient);

  // map link is generated from the confirmed venue (single source of truth)
  const maps = document.getElementById("mapsLink");
  if (maps) maps.href = MAPS_URL;
}
