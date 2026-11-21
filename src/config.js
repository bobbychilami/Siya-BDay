/**
 * Single source of truth for the invitation.
 * Update the WhatsApp number here when the host supplies it.
 */

/**
 * Host WhatsApp number in international format, digits only (e.g. "919812345678").
 * Leave empty to keep RSVP in preview mode: responses can be copied but not sent.
 * Never invent a number.
 */
export const RSVP_WHATSAPP_NUMBER = "917387785196";

export const SITE_URL = "https://bobbychilami.github.io/Siya-BDay/";

export const EVENT = {
  celebrant: "Siya",
  occasion: "First Birthday",
  parents: ["Bobby Chilami", "Snehal Chilami"],
  /** ISO 8601 with the fixed IST offset (Asia/Kolkata has no DST). */
  startsAt: "2026-11-22T18:30:00+05:30",
  timezone: "Asia/Kolkata",
  timeLabel: "6:30 PM",
  dateLabel: "Sunday, 22 November 2026",
  shortDate: "22 November 2026",
  venue: {
    name: "Hotel Raviraj",
    street: "Ghijavne Road",
    locality: "Gadhinglaj - 416502",
    region: "Maharashtra, India",
    /** Free-text query — no fabricated coordinates. */
    query: "Hotel Raviraj, Ghijavne Road, Gadhinglaj 416502, Maharashtra, India",
  },
};

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  EVENT.venue.query
)}`;

export const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  EVENT.venue.query
)}`;

/** The polite note the RSVP buttons pre-fill in WhatsApp. */
export const RSVP_MESSAGE =
  "Hello Bobby and Snehal! Thank you for the lovely invitation to Siya's first birthday on " +
  "Sunday, 22 November 2026 at 6:30 PM. We would be delighted to celebrate with you.";

export const RSVP_URL = `https://wa.me/${RSVP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  RSVP_MESSAGE
)}`;

export const SESSION_KEY = "siya:invitation-opened";
export const MOTION_KEY = "siya:reduce-motion";
