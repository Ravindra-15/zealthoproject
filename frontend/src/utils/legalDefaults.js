/**
 * LEGAL PAGES & DISCLAIMERS — original text (same as backend utils/legalDefaults.js)
 * Shown until the latest text loads, and if the server can't be reached.
 * {brand} → program name, {terms} / {privacy} → links to those pages.
 */

export const BRAND_NAMES = {
  "zealtho": "Zealtho",
  "yogat20": "YogaT20",
  "diabmukt": "Diabmukt",
  "mommyfit": "MommyFit",
  "slimfitter": "Slimfitter"
};

const PRIVACY = {
  "title": "Privacy Policy",
  "sections": [
    {
      "heading": "1. Information We Collect",
      "body": "Zealtho collects certain personal information to provide you with our medical consultation and wellness services. This includes your email address, chosen nickname, health-related information you voluntarily share with healthcare providers, payment information (processed securely via third-party payment processors), and usage data including session attendance and platform interactions.\n\nWe collect health information only when you explicitly share it with a doctor or wellness instructor during consultations or sessions. This information is encrypted and stored securely in compliance with healthcare data protection regulations."
    },
    {
      "heading": "2. How We Use Your Information",
      "body": "Your information is used solely to: (a) provide and improve our services, (b) facilitate communication between you and healthcare providers, (c) process payments and manage subscriptions, (d) send service-related notifications and updates, and (e) comply with legal obligations.\n\nWe never sell your personal information to third parties. Your health data is shared only with the specific healthcare provider you choose to consult, and only for the duration necessary to provide care."
    },
    {
      "heading": "3. Data Security & Encryption",
      "body": "All data transmission on Zealtho is protected using industry-standard SSL/TLS encryption. Patient health records are encrypted at rest and stored in HIPAA-compliant data centers. Access to personal information is strictly limited to authorized personnel who require it to perform their job functions. We conduct regular security audits and maintain strict access controls to protect your information from unauthorized access, alteration, or disclosure."
    },
    {
      "heading": "4. Your Rights & Choices",
      "body": "You have the right to access, correct, or delete your personal information at any time through your account settings. You may also request a complete export of your data or request account deletion by contacting our support team.\n\nYou can opt out of marketing communications while still receiving essential service notifications related to your appointments and subscriptions."
    }
  ],
  "lastUpdated": "2026-02-23T00:00:00.000Z"
};

const TERMS = {
  "title": "Trust &",
  "titleAccent": "Transparency Center",
  "subtitle": "Everything you need to know about how we protect your data and manage your health journey.",
  "highlightTitle": "Your Identity is 100% Protected",
  "highlightText": "To ensure your absolute privacy, your real name and phone number are strictly masked from all instructors and doctors. You will be identified on the platform only by your chosen Nickname.",
  "sections": [
    {
      "heading": "1. Information We Collect",
      "body": "Zealtho collects certain personal information to provide you with our medical consultation and wellness services. This includes your email address, chosen nickname, health-related information you voluntarily share with healthcare providers, payment information (processed securely via third-party payment processors), and usage data including session attendance and platform interactions.\n\nWe collect health information only when you explicitly share it with a doctor or wellness instructor during consultations or sessions. This information is encrypted and stored securely in compliance with healthcare data protection regulations."
    },
    {
      "heading": "2. How We Use Your Information",
      "body": "Your information is used solely to: (a) provide and improve our services, (b) facilitate communication between you and healthcare providers, (c) process payments and manage subscriptions, (d) send service-related notifications and updates, and (e) comply with legal obligations.\n\nWe never sell your personal information to third parties. Your health data is shared only with the specific healthcare provider you choose to consult, and only for the duration necessary to provide care."
    },
    {
      "heading": "3. Data Security & Encryption",
      "body": "All data transmission on Zealtho is protected using industry-standard SSL/TLS encryption. Patient health records are encrypted at rest and stored in HIPAA-compliant data centers. Access to personal information is strictly limited to authorized personnel who require it to perform their job functions.\n\nWe conduct regular security audits and maintain strict access controls to protect your information from unauthorized access, alteration, or disclosure."
    },
    {
      "heading": "4. Your Rights & Choices",
      "body": "You have the right to access, correct, or delete your personal information at any time through your account settings. You may also request a complete export of your data or request account deletion by contacting our support team.\n\nYou can opt out of marketing communications while still receiving essential service notifications related to your appointments and subscriptions."
    },
    {
      "heading": "5. Rescheduling & Cancellations",
      "body": "Appointments may be rescheduled up to a maximum of 5 times per booking, combined across both the customer and the doctor. As a customer, you may reschedule only if it is done at least 48 hours before your scheduled appointment time; rescheduling is not available within that 48-hour window, though your doctor may still reschedule with shorter notice if required.\n\nZealtho does not offer cash refunds for appointments cancelled by the customer, regardless of when the cancellation is made. If your doctor cancels an appointment, you will instead receive a free consultation credit to book another available doctor at no additional cost."
    }
  ],
  "lastUpdated": "2026-02-22T00:00:00.000Z"
};

const NOTICES = [
  {
    "key": "signup_consent",
    "builtIn": true,
    "required": true,
    "label": "Sign-up agreement (next to the tick box)",
    "placement": "signup",
    "tone": "info",
    "text": "I agree to {brand}'s {terms} and {privacy}",
    "enabled": true
  },
  {
    "key": "checkout_consent",
    "builtIn": true,
    "required": false,
    "label": "Booking checkout agreement line",
    "placement": "booking_checkout",
    "tone": "info",
    "text": "By proceeding, you agree to Zealtho's {terms} and {privacy}.",
    "enabled": true
  },
  {
    "key": "booking_cancel_rule",
    "builtIn": true,
    "required": false,
    "label": "Booking rules — Cancel",
    "placement": "booking_checkout",
    "tone": "info",
    "text": "you can cancel any time before the appointment starts, but the booking fee is not refunded.",
    "enabled": true
  },
  {
    "key": "booking_doctor_cancel_rule",
    "builtIn": true,
    "required": false,
    "label": "Booking rules — If the doctor cancels",
    "placement": "booking_checkout",
    "tone": "info",
    "text": "you get a free consultation credit to book another available doctor.",
    "enabled": true
  }
];

export const defaultLegal = (programId) => ({
  programId,
  brand: BRAND_NAMES[programId] || "Zealtho",
  privacy: JSON.parse(JSON.stringify(PRIVACY)),
  terms: JSON.parse(JSON.stringify(TERMS)),
  notices: NOTICES.map((n) => ({ ...n })),
});

// "Last updated" date as people read it (e.g. February 23, 2026)
export const formatLegalDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};
