import gsap from "gsap";
import { RSVP_WHATSAPP_NUMBER, EVENT } from "../config.js";

const MAX_GUESTS = 10;

function digitsOnly(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

export function buildRsvpMessage({ name, attending, guests, message }) {
  const lines = [
    `Hello! RSVP for ${EVENT.celebrant}'s ${EVENT.occasion} — ${EVENT.shortDate}, ${EVENT.timeLabel}.`,
    "",
    `Guest name: ${name}`,
    `Attendance: ${attending}`,
  ];
  if (attending !== "Regretfully declines") {
    lines.push(`Number of guests: ${guests}`);
  }
  const note = (message || "").trim();
  if (note) {
    lines.push("", `A note for Siya: "${note}"`);
  }
  return lines.join("\n");
}

export function buildWhatsAppUrl(message, number = RSVP_WHATSAPP_NUMBER) {
  const target = digitsOnly(number);
  if (!target) return "";
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function initRsvp({ toast } = {}) {
  const toggle = document.getElementById("rsvpToggle");
  const panel = document.getElementById("rsvpPanel");
  const form = document.getElementById("rsvpForm");
  if (!toggle || !panel || !form) return null;

  const nameInput = document.getElementById("guestName");
  const nameError = document.getElementById("nameError");
  const attendError = document.getElementById("attendError");
  const guestsField = document.getElementById("guestsField");
  const guestsInput = document.getElementById("guestCount");
  const minus = document.getElementById("guestMinus");
  const plus = document.getElementById("guestPlus");
  const messageInput = document.getElementById("guestMessage");
  const submit = document.getElementById("rsvpSubmit");
  const copyBtn = document.getElementById("rsvpCopy");
  const status = document.getElementById("rsvpStatus");
  const closeBtn = document.getElementById("rsvpClose");
  const note = document.getElementById("rsvpNote");
  const radios = [...form.querySelectorAll('input[name="attending"]')];

  const configured = digitsOnly(RSVP_WHATSAPP_NUMBER).length >= 8;
  let isOpen = false;
  let preparedMessage = "";

  if (!configured) {
    note.hidden = false;
    note.textContent =
      "Preview mode — a WhatsApp number has not been connected yet, so this reply cannot be sent from this page. You can copy your prepared message and share it with the family directly.";
    submit.textContent = "Prepare RSVP message";
  } else {
    note.hidden = true;
    submit.textContent = "Send RSVP";
  }

  const setGuests = (value) => {
    const next = Math.min(MAX_GUESTS, Math.max(1, Number(value) || 1));
    guestsInput.value = String(next);
  };

  const syncGuestsField = () => {
    const declining = form.querySelector('input[name="attending"]:checked')?.value === "Regretfully declines";
    guestsInput.disabled = declining;
    guestsField.style.opacity = declining ? "0.45" : "1";
    if (declining) setGuests(1);
  };

  function openPanel() {
    if (isOpen) return;
    isOpen = true;
    preparedMessage = "";
    status.textContent = "";
    copyBtn.hidden = true;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    gsap.fromTo(
      panel,
      { height: 0, opacity: 0 },
      {
        height: "auto",
        opacity: 1,
        duration: 0.65,
        ease: "power2.out",
        onComplete: () => {
          panel.style.height = "auto";
        },
      }
    );
    window.setTimeout(() => {
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }

  function closePanel() {
    if (!isOpen) return;
    gsap.to(panel, {
      height: 0,
      opacity: 0,
      duration: 0.45,
      ease: "power2.inOut",
      onComplete: () => {
        panel.hidden = true;
        panel.style.height = "";
        isOpen = false;
      },
    });
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
  }

  function clearErrors() {
    nameError.hidden = true;
    attendError.hidden = true;
    nameInput.removeAttribute("aria-invalid");
    radios.forEach((r) => r.removeAttribute("aria-invalid"));
  }

  function validate() {
    clearErrors();
    let valid = true;
    const name = nameInput.value.trim();
    const attending = form.querySelector('input[name="attending"]:checked')?.value;

    if (name.length < 2) {
      nameError.hidden = false;
      nameInput.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!attending) {
      attendError.hidden = false;
      radios.forEach((r) => r.setAttribute("aria-invalid", "true"));
      valid = false;
    }
    if (!valid) {
      (name.length < 2 ? nameInput : radios[0]).focus({ preventScroll: false });
    }
    return valid;
  }

  function prepare() {
    if (!validate()) return null;
    const attending = form.querySelector('input[name="attending"]:checked').value;
    const message = buildRsvpMessage({
      name: nameInput.value.trim().replace(/\s+/g, " "),
      attending,
      guests: Math.min(MAX_GUESTS, Math.max(1, Number(guestsInput.value) || 1)),
      message: messageInput.value,
    });
    preparedMessage = message;
    return message;
  }

  toggle.addEventListener("click", () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });
  closeBtn?.addEventListener("click", closePanel);

  form.addEventListener("change", (event) => {
    if (event.target.name === "attending") {
      syncGuestsField();
      attendError.hidden = true;
    }
  });

  minus?.addEventListener("click", () => setGuests(Number(guestsInput.value) - 1));
  plus?.addEventListener("click", () => setGuests(Number(guestsInput.value) + 1));
  guestsInput?.addEventListener("blur", () => setGuests(guestsInput.value));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = prepare();
    if (!message) {
      status.textContent = "Please complete the highlighted fields.";
      return;
    }

    copyBtn.hidden = false;

    if (!configured) {
      status.textContent =
        "Preview only — responses cannot be sent yet. Your RSVP message is ready to copy.";
      copyBtn.focus({ preventScroll: true });
      return;
    }

    const url = buildWhatsAppUrl(message);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    status.textContent = win
      ? "Opening WhatsApp with your reply. If it does not open, copy the message below."
      : "Your browser blocked the WhatsApp window. Copy the message below and send it to the family.";
    if (!win) toast?.("Pop-up blocked — copy your RSVP message instead.");
  });

  copyBtn.addEventListener("click", async () => {
    const message = preparedMessage || prepare();
    if (!message) return;
    const ok = await copyText(message);
    if (ok) {
      status.textContent = configured
        ? "Message copied. You can paste it into WhatsApp."
        : "Message copied. Preview mode — send it to the family directly.";
      toast?.("RSVP message copied");
    } else {
      status.textContent = "Copying is unavailable in this browser. Please select and copy the text manually.";
      toast?.("Could not copy automatically");
    }
  });

  return { openPanel, closePanel, isConfigured: () => configured };
}
