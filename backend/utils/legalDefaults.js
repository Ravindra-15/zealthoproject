/**
 * LEGAL PAGES & DISCLAIMERS — original text
 *
 * Used for a program that was never edited, and to fill anything missing.
 * The customer apps keep the same text (frontend utils/legalDefaults.js) so
 * the pages still show something if the server can't be reached.
 *
 * Words the apps fill in:
 *   {brand}   → the program's name (Zealtho, YogaT20, …)
 *   {terms}   → link to the Terms of Use page
 *   {privacy} → link to the Privacy Policy page
 * Section text: a blank line starts a new paragraph.
 */

const { PROGRAM_IDS } = require("./bodyProfileDefaults");

const BRAND_NAMES = {
  zealtho: "Zealtho",
  yogat20: "YogaT20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

// where a disclaimer can be shown in the customer apps
const PLACEMENTS = ["signup", "booking_checkout", "program_checkout", "site_footer"];
const TONES = ["info", "warning"];

const PRIVACY_SECTIONS = [
  {
    heading: "1. Information We Collect",
    body: [
      "Zealtho collects certain personal information to provide you with our medical consultation and wellness services. This includes your email address, chosen nickname, health-related information you voluntarily share with healthcare providers, payment information (processed securely via third-party payment processors), and usage data including session attendance and platform interactions.",
      "We collect health information only when you explicitly share it with a doctor or wellness instructor during consultations or sessions. This information is encrypted and stored securely in compliance with healthcare data protection regulations.",
    ],
  },
  {
    heading: "2. How We Use Your Information",
    body: [
      "Your information is used solely to: (a) provide and improve our services, (b) facilitate communication between you and healthcare providers, (c) process payments and manage subscriptions, (d) send service-related notifications and updates, and (e) comply with legal obligations.",
      "We never sell your personal information to third parties. Your health data is shared only with the specific healthcare provider you choose to consult, and only for the duration necessary to provide care.",
    ],
  },
  {
    heading: "3. Data Security & Encryption",
    body: [
      "All data transmission on Zealtho is protected using industry-standard SSL/TLS encryption. Patient health records are encrypted at rest and stored in HIPAA-compliant data centers. Access to personal information is strictly limited to authorized personnel who require it to perform their job functions. We conduct regular security audits and maintain strict access controls to protect your information from unauthorized access, alteration, or disclosure.",
    ],
  },
  {
    heading: "4. Your Rights & Choices",
    body: [
      "You have the right to access, correct, or delete your personal information at any time through your account settings. You may also request a complete export of your data or request account deletion by contacting our support team.",
      "You can opt out of marketing communications while still receiving essential service notifications related to your appointments and subscriptions.",
    ],
  },
];

const TERMS_SECTIONS = [
  {
    heading: "1. Information We Collect",
    body: [
      "Zealtho collects certain personal information to provide you with our medical consultation and wellness services. This includes your email address, chosen nickname, health-related information you voluntarily share with healthcare providers, payment information (processed securely via third-party payment processors), and usage data including session attendance and platform interactions.",
      "We collect health information only when you explicitly share it with a doctor or wellness instructor during consultations or sessions. This information is encrypted and stored securely in compliance with healthcare data protection regulations.",
    ],
  },
  {
    heading: "2. How We Use Your Information",
    body: [
      "Your information is used solely to: (a) provide and improve our services, (b) facilitate communication between you and healthcare providers, (c) process payments and manage subscriptions, (d) send service-related notifications and updates, and (e) comply with legal obligations.",
      "We never sell your personal information to third parties. Your health data is shared only with the specific healthcare provider you choose to consult, and only for the duration necessary to provide care.",
    ],
  },
  {
    heading: "3. Data Security & Encryption",
    body: [
      "All data transmission on Zealtho is protected using industry-standard SSL/TLS encryption. Patient health records are encrypted at rest and stored in HIPAA-compliant data centers. Access to personal information is strictly limited to authorized personnel who require it to perform their job functions.",
      "We conduct regular security audits and maintain strict access controls to protect your information from unauthorized access, alteration, or disclosure.",
    ],
  },
  {
    heading: "4. Your Rights & Choices",
    body: [
      "You have the right to access, correct, or delete your personal information at any time through your account settings. You may also request a complete export of your data or request account deletion by contacting our support team.",
      "You can opt out of marketing communications while still receiving essential service notifications related to your appointments and subscriptions.",
    ],
  },
  {
    heading: "5. Rescheduling & Cancellations",
    body: [
      "Appointments may be rescheduled up to a maximum of 5 times per booking, combined across both the customer and the doctor. As a customer, you may reschedule only if it is done at least 48 hours before your scheduled appointment time; rescheduling is not available within that 48-hour window, though your doctor may still reschedule with shorter notice if required.",
      "Zealtho does not offer cash refunds for appointments cancelled by the customer, regardless of when the cancellation is made. If your doctor cancels an appointment, you will instead receive a free consultation credit to book another available doctor at no additional cost.",
    ],
  },
];

const toSections = (list) => list.map((s) => ({ heading: s.heading, body: s.body.join("\n\n") }));

// built-in disclaimers: text can be edited, they can't be deleted
// (`required` ones can't be switched off either)
const BUILT_IN_NOTICES = [
  {
    key: "signup_consent",
    label: "Sign-up agreement (next to the tick box)",
    placement: "signup",
    text: "I agree to {brand}'s {terms} and {privacy}",
    required: true,
  },
  {
    key: "checkout_consent",
    label: "Booking checkout agreement line",
    placement: "booking_checkout",
    text: "By proceeding, you agree to Zealtho's {terms} and {privacy}.",
  },
  {
    key: "booking_cancel_rule",
    label: "Booking rules — Cancel",
    placement: "booking_checkout",
    text: "you can cancel any time before the appointment starts, but the booking fee is not refunded.",
  },
  {
    key: "booking_doctor_cancel_rule",
    label: "Booking rules — If the doctor cancels",
    placement: "booking_checkout",
    text: "you get a free consultation credit to book another available doctor.",
  },
];
const BUILT_IN_KEYS = BUILT_IN_NOTICES.map((n) => n.key);

const PRIVACY_UPDATED = new Date("2026-02-23T00:00:00.000Z");
const TERMS_UPDATED = new Date("2026-02-22T00:00:00.000Z");

const defaultPrivacy = () => ({
  title: "Privacy Policy",
  sections: toSections(PRIVACY_SECTIONS),
  lastUpdated: PRIVACY_UPDATED,
});

const defaultTerms = () => ({
  title: "Trust &",
  titleAccent: "Transparency Center",
  subtitle: "Everything you need to know about how we protect your data and manage your health journey.",
  highlightTitle: "Your Identity is 100% Protected",
  highlightText:
    "To ensure your absolute privacy, your real name and phone number are strictly masked from all instructors and doctors. You will be identified on the platform only by your chosen Nickname.",
  sections: toSections(TERMS_SECTIONS),
  lastUpdated: TERMS_UPDATED,
});

const defaultNotices = () =>
  BUILT_IN_NOTICES.map((n) => ({
    key: n.key,
    builtIn: true,
    required: !!n.required,
    label: n.label,
    placement: n.placement,
    tone: "info",
    text: n.text,
    enabled: true,
  }));

const defaultLegal = (programId) => ({
  programId,
  brand: BRAND_NAMES[programId] || "Zealtho",
  privacy: defaultPrivacy(),
  terms: defaultTerms(),
  notices: defaultNotices(),
});

module.exports = {
  PROGRAM_IDS,
  BRAND_NAMES,
  PLACEMENTS,
  TONES,
  BUILT_IN_NOTICES,
  BUILT_IN_KEYS,
  defaultPrivacy,
  defaultTerms,
  defaultNotices,
  defaultLegal,
};
