/**
 * Enquiry desk — customer emails, branded per program.
 *
 *  ackEmail   → "We've received your enquiry ENQ-1042" (sent on submit)
 *  replyEmail → an admin's answer, with a "Reply to this enquiry" button
 *
 * The customer answers through the secure link (no login), never by
 * replying to the email. Admin names are not shown — replies come from
 * "<Program> Support".
 */

const BRANDS = {
  zealtho: { name: "Zealtho", accent: "#EA580C" },
  yogat20: { name: "YogaT20", accent: "#EA580C" },
  diabmukt: { name: "Diabmukt", accent: "#4F46E5" },
  mommyfit: { name: "MommyFit", accent: "#C2547F" },
  slimfitter: { name: "Slimfitter", accent: "#4E4391" },
};

const brandFor = (source) => BRANDS[source] || BRANDS.zealtho;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// plain text → safe HTML paragraphs (keeps the admin's line breaks)
const textToHtml = (text) =>
  esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

const ticketLabel = (ticketNo) => `ENQ-${ticketNo}`;
const firstName = (name) => String(name || "there").trim().split(/\s+/)[0] || "there";

const layout = ({ brand, preheader, heading, bodyHtml, cta, footerNote }) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#F4F5F7;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F5F7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
  <tr><td style="padding:22px 28px;border-bottom:3px solid ${brand.accent};font:700 20px ${FONT};color:${brand.accent};">${esc(brand.name)}</td></tr>
  <tr><td style="padding:26px 28px 8px;font:700 19px/1.35 ${FONT};color:#111827;">${esc(heading)}</td></tr>
  <tr><td style="padding:6px 28px 4px;font:15px/1.65 ${FONT};color:#374151;">${bodyHtml}</td></tr>
  ${
    cta
      ? `<tr><td style="padding:10px 28px 26px;"><a href="${esc(cta.url)}" style="display:inline-block;background:${brand.accent};color:#FFFFFF;text-decoration:none;font:600 15px ${FONT};padding:12px 22px;border-radius:10px;">${esc(cta.label)}</a></td></tr>`
      : ""
  }
  <tr><td style="padding:16px 28px 22px;border-top:1px solid #F0F1F3;font:12px/1.6 ${FONT};color:#6B7280;">${footerNote}</td></tr>
</table>
</td></tr></table>
</body></html>`;

const quoteBox = (label, text) =>
  `<div style="margin:14px 0;padding:12px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
    <div style="font:600 11px ${FONT};letter-spacing:.06em;text-transform:uppercase;color:#6B7280;margin-bottom:6px;">${esc(label)}</div>
    <div style="font:14px/1.6 ${FONT};color:#374151;">${textToHtml(text)}</div>
  </div>`;

// ⭐ "How did we do?" — 5 links that open the private page with the score
// picked; the customer confirms there (mail scanners that open links can't
// rate on their behalf)
const ratingBlock = (brand, link) => {
  const labels = ["Very poor", "Poor", "Okay", "Good", "Excellent"];
  const cells = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<td style="padding:0 3px;"><a href="${esc(`${link}&rate=${n}`)}" title="${labels[n - 1]}" style="display:inline-block;min-width:44px;text-align:center;padding:8px 0;border:1px solid #E5E7EB;border-radius:8px;text-decoration:none;font:600 14px ${FONT};color:${brand.accent};">${n}&#9733;</a></td>`
    )
    .join("");
  return `<div style="margin:18px 0 6px;padding:14px;background:#F9FAFB;border-radius:10px;">
    <div style="font:600 14px ${FONT};color:#111827;margin-bottom:8px;">How did we do?</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
    <div style="font:12px ${FONT};color:#6B7280;margin-top:8px;">1 = very poor · 5 = excellent</div>
  </div>`;
};

// ============================================
// 📨 "We've received your enquiry"
// ============================================
const ackEmail = ({ source, name, ticketNo, message, link }) => {
  const brand = brandFor(source);
  const ticket = ticketLabel(ticketNo);
  const subject = `We've received your enquiry ${ticket}`;
  const html = layout({
    brand,
    preheader: `Your enquiry number is ${ticket}. Our team will reply by email.`,
    heading: `Thanks, ${firstName(name)} — we've got your enquiry`,
    bodyHtml:
      `<p style="margin:0 0 12px;">Your enquiry number is <strong>${esc(ticket)}</strong>. Our support team will reply to you by email — you don't need to do anything else.</p>` +
      (message ? quoteBox("Your message", message) : "") +
      `<p style="margin:0 0 12px;">You can check its progress or add more details any time:</p>`,
    cta: { label: "View your enquiry", url: link },
    footerNote: `Please keep this email — the button above is your private link to this enquiry. ${esc(brand.name)} Support`,
  });
  const text = [
    `Thanks, ${firstName(name)} — we've got your enquiry.`,
    "",
    `Your enquiry number is ${ticket}. Our support team will reply to you by email.`,
    ...(message ? ["", "Your message:", message] : []),
    "",
    `View your enquiry or add details: ${link}`,
    "",
    `${brand.name} Support`,
  ].join("\n");
  return { subject, html, text, fromName: `${brand.name} Support` };
};

// ============================================
// 💬 An admin's reply
// ============================================
const replyEmail = ({ source, name, ticketNo, body, link, status }) => {
  const brand = brandFor(source);
  const ticket = ticketLabel(ticketNo);
  const resolved = status === "resolved";
  const subject = `Re: your enquiry ${ticket}`;
  const closing = resolved
    ? `We've marked this enquiry as <strong>resolved</strong>. If you still need help, use the button below within 3 days and it will reopen.`
    : status === "waiting"
      ? `We need a little more information from you — please answer using the button below.`
      : `To answer, use the button below — please don't reply to this email directly.`;
  const html = layout({
    brand,
    preheader: String(body).slice(0, 120),
    heading: `Hi ${firstName(name)},`,
    bodyHtml:
      `<div style="margin:0 0 6px;">${textToHtml(body)}</div>` +
      `<p style="margin:14px 0 12px;font-size:14px;color:#4B5563;">${closing}</p>` +
      (resolved ? ratingBlock(brand, link) : ""),
    cta: { label: resolved ? "I still need help" : "Reply to this enquiry", url: link },
    footerNote: `${esc(brand.name)} Support · Enquiry ${esc(ticket)}`,
  });
  const text = [
    `Hi ${firstName(name)},`,
    "",
    body,
    "",
    resolved
      ? "We've marked this enquiry as resolved. If you still need help, open the link below within 3 days and it will reopen."
      : "To answer, open the link below — please don't reply to this email directly.",
    link,
    "",
    `${brand.name} Support · Enquiry ${ticket}`,
  ].join("\n");
  return { subject, html, text, fromName: `${brand.name} Support` };
};

// ============================================
// ✅ resolved without a written reply (status change) — with rating
// ============================================
const resolvedEmail = ({ source, name, ticketNo, link, autoCloseDays = 3 }) => {
  const brand = brandFor(source);
  const ticket = ticketLabel(ticketNo);
  const html = layout({
    brand,
    preheader: `We've resolved your enquiry ${ticket}.`,
    heading: `Hi ${firstName(name)}, your enquiry is resolved`,
    bodyHtml:
      `<p style="margin:0 0 12px;">We've marked your enquiry <strong>${esc(ticket)}</strong> as resolved. If you still need help, use the button below within ${autoCloseDays} days and it will reopen.</p>` +
      ratingBlock(brand, link),
    cta: { label: "I still need help", url: link },
    footerNote: `${esc(brand.name)} Support · Enquiry ${esc(ticket)}`,
  });
  const text = [
    `Hi ${firstName(name)},`,
    "",
    `We've marked your enquiry ${ticket} as resolved. If you still need help, open the link below within ${autoCloseDays} days and it will reopen.`,
    link,
    "",
    `${brand.name} Support`,
  ].join("\n");
  return { subject: `Your enquiry ${ticket} is resolved`, html, text, fromName: `${brand.name} Support` };
};

// ============================================
// ⏳ waiting on the customer too long — one polite nudge
// ============================================
const nudgeEmail = ({ source, name, ticketNo, link, autoCloseDays = 3 }) => {
  const brand = brandFor(source);
  const ticket = ticketLabel(ticketNo);
  const html = layout({
    brand,
    preheader: `Do you still need help with ${ticket}?`,
    heading: `Hi ${firstName(name)}, do you still need help?`,
    bodyHtml: `<p style="margin:0 0 12px;">We're waiting for your answer on enquiry <strong>${esc(ticket)}</strong>. If you still need help, reply using the button below. If we don't hear from you within ${autoCloseDays} days, we'll mark it as resolved.</p>`,
    cta: { label: "Reply to this enquiry", url: link },
    footerNote: `${esc(brand.name)} Support · Enquiry ${esc(ticket)}`,
  });
  const text = [
    `Hi ${firstName(name)},`,
    "",
    `We're waiting for your answer on enquiry ${ticket}. If you still need help, reply here: ${link}`,
    `If we don't hear from you within ${autoCloseDays} days, we'll mark it as resolved.`,
    "",
    `${brand.name} Support`,
  ].join("\n");
  return { subject: `Still need help with ${ticket}?`, html, text, fromName: `${brand.name} Support` };
};

// ============================================
// 🔁 a second enquiry within 24h — added to the open one
// ============================================
const mergedEmail = ({ source, name, ticketNo, link }) => {
  const brand = brandFor(source);
  const ticket = ticketLabel(ticketNo);
  const html = layout({
    brand,
    preheader: `We've added your message to ${ticket}.`,
    heading: `Thanks, ${firstName(name)} — we've added your message`,
    bodyHtml: `<p style="margin:0 0 12px;">You already have an open enquiry with us, <strong>${esc(ticket)}</strong>, so we've added your new message to it. The same team will reply — no need to send it again.</p>`,
    cta: { label: "View your enquiry", url: link },
    footerNote: `${esc(brand.name)} Support · Enquiry ${esc(ticket)}`,
  });
  const text = [
    `Thanks, ${firstName(name)} — we've added your message to your open enquiry ${ticket}.`,
    `View it: ${link}`,
    "",
    `${brand.name} Support`,
  ].join("\n");
  return { subject: `We've added your message to ${ticket}`, html, text, fromName: `${brand.name} Support` };
};

module.exports = { ackEmail, replyEmail, resolvedEmail, nudgeEmail, mergedEmail, brandFor, ticketLabel, BRANDS };
