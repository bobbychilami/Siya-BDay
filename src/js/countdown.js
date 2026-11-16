import { EVENT } from "../config.js";

const UNITS = ["days", "hours", "minutes", "seconds"];
const HOUR = 3600000;
const DAY = 86400000;

const pad = (value, length = 2) => String(value).padStart(length, "0");

export function initCountdown() {
  const grid = document.getElementById("countdownGrid");
  const status = document.getElementById("countdownStatus");
  if (!grid || !status) return null;

  const target = Date.parse(EVENT.startsAt);
  const digits = {};
  UNITS.forEach((unit) => {
    digits[unit] = grid.querySelector(`[data-unit="${unit}"]`);
  });

  const rendered = { days: null, hours: null, minutes: null, seconds: null };
  let timer = 0;
  let alignment = 0;

  grid.setAttribute(
    "aria-label",
    `Countdown to ${EVENT.dateLabel} at ${EVENT.timeLabel} India Standard Time`
  );

  function setUnit(unit, value) {
    if (rendered[unit] === value) return;
    rendered[unit] = value;
    const el = digits[unit];
    if (!el) return;
    el.textContent = value;
    el.classList.remove("digit-tick");
    // restart the CSS animation
    void el.offsetWidth;
    el.classList.add("digit-tick");
  }

  function update() {
    const diff = target - Date.now();

    if (diff > 0) {
      const days = Math.floor(diff / DAY);
      setUnit("days", days >= 100 ? String(days) : pad(days));
      setUnit("hours", pad(Math.floor(diff / HOUR) % 24));
      setUnit("minutes", pad(Math.floor(diff / 60000) % 60));
      setUnit("seconds", pad(Math.floor(diff / 1000) % 60));
      status.textContent = `${EVENT.dateLabel} · ${EVENT.timeLabel} IST`;
      status.classList.remove("is-live");
      return;
    }

    UNITS.forEach((unit) => setUnit(unit, "00"));

    if (diff > -6 * HOUR) {
      status.textContent = "Today is the day — Siya turns ONE!";
    } else {
      status.textContent = "Thank you for celebrating our little sunshine.";
    }
    status.classList.add("is-live");
  }

  function schedule() {
    window.clearTimeout(alignment);
    window.clearInterval(timer);
    update();
    alignment = window.setTimeout(() => {
      update();
      timer = window.setInterval(update, 1000);
    }, 1000 - (Date.now() % 1000));
  }

  schedule();

  // resynchronise when the visitor returns to the tab
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });

  return {
    stop() {
      window.clearTimeout(alignment);
      window.clearInterval(timer);
    },
    refresh: schedule,
  };
}
