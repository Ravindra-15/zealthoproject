/**
 * ============================================================
 * ADMIN PORTAL — Email templates
 * ============================================================
 * Branded HTML + plain-text emails sent to portal admins:
 *   - account created
 *   - profile updated            (+ a security notice to the OLD address
 *                                  when the login email is changed)
 *   - access activated / deactivated
 *   - password reset
 *
 * Built for real email clients: table layout, inline styles, no images,
 * a "bulletproof" button, and a small media query for phones.
 * Every dynamic value is HTML-escaped.
 * ============================================================
 */

// 🎨 Zealtho admin theme (matches the admin panel: indigo → purple)
const BRAND = {
  primary: "#4F46E5",
  primaryDark: "#4338CA",
  accent: "#6D28D9",
  ink: "#111827",
  body: "#374151",
  muted: "#6B7280",
  line: "#E5E7EB",
  page: "#F3F4F8",
  card: "#F9FAFB",
};

const TONES = {
  primary: { bg: "#EEF2FF", fg: "#4338CA", edge: "#C7D2FE" },
  success: { bg: "#ECFDF5", fg: "#047857", edge: "#A7F3D0" },
  danger: { bg: "#FEF2F2", fg: "#B91C1C", edge: "#FECACA" },
  warning: { bg: "#FFFBEB", fg: "#B45309", edge: "#FDE68A" },
};

const FONT = "Arial,Helvetica,sans-serif";

// ============================================
// 🧰 HELPERS
// ============================================
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const firstName = (fullName) =>
  String(fullName || "").trim().split(/\s+/)[0] || "there";

// "21 Sep 2026, 15:42 UTC" — the whole admin panel shows UTC
const formatWhen = (date = new Date()) =>
  `${new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })} UTC`;

// ab***@example.com — used when we must mention an address to someone else
const maskEmail = (email) => {
  const at = String(email || "").indexOf("@");
  if (at < 1) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
};

// ============================================
// 🧱 BUILDING BLOCKS
// ============================================
const pill = (label, tone = "primary") => {
  const t = TONES[tone];
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${t.bg};color:${t.fg};font:700 12px ${FONT};letter-spacing:0.3px;">${esc(label)}</span>`;
};

const button = (label, url) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;">
  <tr>
    <td bgcolor="${BRAND.primary}" style="border-radius:10px;background:${BRAND.primary};">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 30px;font:700 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}</a>
    </td>
  </tr>
</table>`;

// rows: [label, valueHtml]  (valueHtml is already escaped / trusted markup)
const detailsCard = (title, rows) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:12px;margin:20px 0 6px;">
  <tr>
    <td style="padding:16px 20px 6px;font:700 11px ${FONT};letter-spacing:1px;color:${BRAND.muted};text-transform:uppercase;">${esc(title)}</td>
  </tr>
  ${rows
    .map(
      ([label, valueHtml]) => `
  <tr>
    <td style="padding:7px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="stack" width="36%" valign="top" style="font:13px/1.5 ${FONT};color:${BRAND.muted};">${esc(label)}</td>
          <td class="stack" valign="top" style="font:600 14px/1.5 ${FONT};color:${BRAND.ink};word-break:break-word;">${valueHtml}</td>
        </tr>
      </table>
    </td>
  </tr>`
    )
    .join("")}
  <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
</table>`;

const credentialsCard = ({ email, password }) => {
  const t = TONES.primary;
  const box = (value) =>
    `<div style="background:#ffffff;border:1px solid ${t.edge};border-radius:8px;padding:10px 12px;font:600 14px 'Courier New',Courier,monospace;color:${BRAND.ink};word-break:break-all;">${esc(value)}</div>`;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.bg};border:1px solid ${t.edge};border-radius:12px;margin:20px 0 6px;">
  <tr><td style="padding:16px 20px 4px;font:700 11px ${FONT};letter-spacing:1px;color:${t.fg};text-transform:uppercase;">Your sign-in details</td></tr>
  <tr><td style="padding:10px 20px 4px;font:12px ${FONT};color:${BRAND.muted};">Email</td></tr>
  <tr><td style="padding:0 20px 8px;">${box(email)}</td></tr>
  <tr><td style="padding:4px 20px 4px;font:12px ${FONT};color:${BRAND.muted};">Password</td></tr>
  <tr><td style="padding:0 20px 18px;">${box(password)}</td></tr>
</table>`;
};

const noticeBox = (tone, html) => {
  const t = TONES[tone];
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 6px;">
  <tr>
    <td style="background:${t.bg};border-left:4px solid ${t.fg};border-radius:8px;padding:13px 16px;font:13px/1.65 ${FONT};color:${t.fg};">${html}</td>
  </tr>
</table>`;
};

// ============================================
// 📐 PAGE LAYOUT
// ============================================
const layout = ({
  preheader,
  icon,
  tone = "primary",
  badge,
  heading,
  intro,
  body = "",
  cta,
  recipientEmail,
}) => {
  const t = TONES[tone];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(heading)}</title>
  <style>
    @media only screen and (max-width: 520px) {
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .stack { display: block !important; width: 100% !important; }
      .h1 { font-size: 21px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background:${BRAND.page};">
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">

          <!-- 🏷️ Brand header -->
          <tr>
            <td class="px" bgcolor="${BRAND.primary}" style="background:${BRAND.primary};background-image:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.accent} 100%);padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border-radius:11px;background:rgba(255,255,255,0.2);font-size:20px;line-height:42px;">🛡️</td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="font:800 21px/1.1 ${FONT};color:#ffffff;">Zealtho</div>
                    <div style="font:700 10px ${FONT};letter-spacing:1.8px;color:#C7D2FE;margin-top:4px;">ADMIN PORTAL</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 🎉 Hero -->
          <tr>
            <td class="px" style="padding:32px 32px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;border-radius:50%;background:${t.bg};font-size:24px;line-height:52px;">${icon}</td>
                </tr>
              </table>
              <div style="margin:16px 0 0;">${badge ? pill(badge, tone) : ""}</div>
              <h1 class="h1" style="margin:12px 0 10px;font:800 25px/1.25 ${FONT};color:${BRAND.ink};">${esc(heading)}</h1>
              <p style="margin:0;font:15px/1.7 ${FONT};color:${BRAND.body};">${intro}</p>
            </td>
          </tr>

          <!-- 📋 Body -->
          <tr>
            <td class="px" style="padding:0 32px 30px;">
              ${body}
              ${cta ? button(cta.label, cta.url) : ""}
            </td>
          </tr>

          <!-- 📎 Footer -->
          <tr>
            <td class="px" style="padding:20px 32px 26px;border-top:1px solid ${BRAND.line};background:${BRAND.card};">
              <p style="margin:0 0 6px;font:12px/1.6 ${FONT};color:${BRAND.muted};">This is an automated message from the Zealtho Admin Portal${recipientEmail ? ` sent to <strong style="color:${BRAND.body};">${esc(recipientEmail)}</strong>` : ""}. Please don't reply to this email.</p>
              <p style="margin:0;font:11px ${FONT};color:#9CA3AF;">© ${new Date().getFullYear()} Zealtho. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const MANAGES = "Doctors, Users, Appointments, Enquiries, Clinical Videos and Referrals";

// ============================================
// ✉️ 1) ACCOUNT CREATED
// ============================================
const createdEmail = ({ admin, createdByName, password, includePassword, panelUrl, at }) => {
  const first = firstName(admin.fullName);
  const subject = "Your Zealtho admin account is ready";

  let extra = "";
  if (includePassword) {
    extra =
      credentialsCard({ email: admin.email, password }) +
      noticeBox(
        "warning",
        "<strong>Keep this email private.</strong> Anyone who can read it can sign in as you. If you weren't expecting this account, please contact your administrator."
      );
  } else {
    extra = noticeBox(
      "primary",
      `Your password will be shared with you separately by <strong>${esc(createdByName)}</strong>. Use it together with the email above to sign in.`
    );
  }

  const html = layout({
    preheader: `${createdByName} created your Zealtho admin account. Sign in to get started.`,
    icon: "🎉",
    tone: "success",
    badge: "Account created",
    heading: `Welcome aboard, ${first}!`,
    intro: `<strong>${esc(createdByName)}</strong> has created an admin account for you on the Zealtho Admin Portal. You can sign in right away — you'll be able to manage ${esc(MANAGES)}.`,
    body:
      detailsCard("Account details", [
        ["Name", esc(admin.fullName)],
        ["Login email", esc(admin.email)],
        ["Mobile", esc(admin.phone || "—")],
        ["Role", "Portal Admin"],
        ["Created", esc(formatWhen(at))],
      ]) + extra,
    cta: { label: "Sign in to Admin Portal", url: panelUrl },
    recipientEmail: admin.email,
  });

  const text = [
    `Welcome aboard, ${first}!`,
    "",
    `${createdByName} has created an admin account for you on the Zealtho Admin Portal.`,
    "",
    `Name:        ${admin.fullName}`,
    `Login email: ${admin.email}`,
    `Mobile:      ${admin.phone || "-"}`,
    ...(includePassword
      ? [`Password:    ${password}`, "", "Keep this email private — anyone who can read it can sign in as you."]
      : ["", `Your password will be shared with you separately by ${createdByName}.`]),
    "",
    `Sign in: ${panelUrl}`,
    "",
    "— Zealtho Admin Portal",
  ].join("\n");

  return { subject, html, text };
};

// ============================================
// ✉️ 2) PROFILE UPDATED
// changes: [{ field: "name"|"mobile"|"email", label, from, to }]
// ============================================
const updatedEmail = ({ admin, changes, updatedByName, panelUrl, at }) => {
  const first = firstName(admin.fullName);
  const plural = changes.length > 1;
  const subject = "Your Zealtho admin profile was updated";
  const emailChange = changes.find((c) => c.field === "email");

  const rows = changes.map((c) => [
    c.label,
    `<span style="color:#9CA3AF;text-decoration:line-through;font-weight:400;">${esc(c.from || "—")}</span>` +
      ` &nbsp;→&nbsp; <span style="color:${BRAND.ink};">${esc(c.to || "—")}</span>`,
  ]);
  rows.push(["Changed by", esc(updatedByName)], ["When", esc(formatWhen(at))]);

  let body = detailsCard("What changed", rows);
  if (emailChange) {
    body += noticeBox(
      "primary",
      `Your login email is now <strong>${esc(emailChange.to)}</strong>. Use it the next time you sign in — your password stays the same.`
    );
  }
  body += noticeBox(
    "warning",
    "If you weren't expecting this change, please contact your administrator."
  );

  const html = layout({
    preheader: `${updatedByName} updated your admin profile.`,
    icon: "✏️",
    tone: "primary",
    badge: "Profile updated",
    heading: `Your profile was updated`,
    intro: `Hi ${esc(first)}, <strong>${esc(updatedByName)}</strong> made the following change${plural ? "s" : ""} to your Zealtho admin account.`,
    body,
    cta: { label: "Open Admin Portal", url: panelUrl },
    recipientEmail: admin.email,
  });

  const text = [
    `Hi ${first},`,
    "",
    `${updatedByName} made the following change${plural ? "s" : ""} to your Zealtho admin account:`,
    "",
    ...changes.map((c) => `- ${c.label}: ${c.from || "-"}  ->  ${c.to || "-"}`),
    "",
    `When: ${formatWhen(at)}`,
    ...(emailChange ? ["", `Your login email is now ${emailChange.to}. Your password stays the same.`] : []),
    "",
    "If you weren't expecting this change, please contact your administrator.",
    `Admin Portal: ${panelUrl}`,
  ].join("\n");

  return { subject, html, text };
};

// ============================================
// ✉️ 2b) LOGIN EMAIL CHANGED — security notice to the OLD address
// ============================================
const emailChangedOldAddressEmail = ({ admin, oldEmail, newEmail, updatedByName, at }) => {
  const first = firstName(admin.fullName);
  const subject = "Your Zealtho admin login email was changed";

  const html = layout({
    preheader: "The login email for your Zealtho admin account was changed.",
    icon: "🔐",
    tone: "warning",
    badge: "Security notice",
    heading: "Your login email was changed",
    intro: `Hi ${esc(first)}, the login email for your Zealtho admin account was changed by <strong>${esc(updatedByName)}</strong>.`,
    body:
      detailsCard("Details", [
        ["Previous email", esc(oldEmail)],
        ["New email", esc(maskEmail(newEmail))],
        ["Changed by", esc(updatedByName)],
        ["When", esc(formatWhen(at))],
      ]) +
      noticeBox(
        "warning",
        "You'll no longer receive sign-in details at this address. If you didn't expect this change, please contact your administrator right away."
      ),
    recipientEmail: oldEmail,
  });

  const text = [
    `Hi ${first},`,
    "",
    `The login email for your Zealtho admin account was changed by ${updatedByName}.`,
    "",
    `Previous email: ${oldEmail}`,
    `New email:      ${maskEmail(newEmail)}`,
    `When:           ${formatWhen(at)}`,
    "",
    "If you didn't expect this change, please contact your administrator right away.",
  ].join("\n");

  return { subject, html, text };
};

// ============================================
// ✉️ 3) ACCESS ACTIVATED / DEACTIVATED
// ============================================
const statusEmail = ({ admin, isActive, changedByName, panelUrl, at }) => {
  const first = firstName(admin.fullName);

  const subject = isActive
    ? "Your Zealtho admin access has been restored"
    : "Your Zealtho admin access has been deactivated";

  const details = detailsCard("Account", [
    ["Login email", esc(admin.email)],
    ["Status", pill(isActive ? "Active" : "Deactivated", isActive ? "success" : "danger")],
    ["Changed by", esc(changedByName)],
    ["When", esc(formatWhen(at))],
  ]);

  const html = isActive
    ? layout({
        preheader: "You can sign in to the Zealtho Admin Portal again.",
        icon: "✅",
        tone: "success",
        badge: "Access restored",
        heading: "Welcome back — your access is restored",
        intro: `Hi ${esc(first)}, <strong>${esc(changedByName)}</strong> has reactivated your Zealtho admin account. You can sign in again with your existing email and password.`,
        body: details,
        cta: { label: "Sign in to Admin Portal", url: panelUrl },
        recipientEmail: admin.email,
      })
    : layout({
        preheader: "Your access to the Zealtho Admin Portal has been deactivated.",
        icon: "⏸️",
        tone: "danger",
        badge: "Access deactivated",
        heading: "Your access has been deactivated",
        intro: `Hi ${esc(first)}, <strong>${esc(changedByName)}</strong> has deactivated your Zealtho admin account. You've been signed out and won't be able to log in until it is reactivated.`,
        body:
          details +
          noticeBox(
            "warning",
            "If you think this is a mistake, please contact your administrator."
          ),
        recipientEmail: admin.email,
      });

  const text = isActive
    ? [
        `Hi ${first},`,
        "",
        `${changedByName} has reactivated your Zealtho admin account. You can sign in again with your existing email and password.`,
        "",
        `Sign in: ${panelUrl}`,
      ].join("\n")
    : [
        `Hi ${first},`,
        "",
        `${changedByName} has deactivated your Zealtho admin account. You've been signed out and can't log in until it is reactivated.`,
        "",
        "If you think this is a mistake, please contact your administrator.",
      ].join("\n");

  return { subject, html, text };
};

// ============================================
// ✉️ 4) PASSWORD RESET
// ============================================
const passwordResetEmail = ({ admin, password, includePassword, resetByName, panelUrl, at }) => {
  const first = firstName(admin.fullName);
  const subject = "Your Zealtho admin password was reset";

  let extra;
  if (includePassword) {
    extra =
      credentialsCard({ email: admin.email, password }) +
      noticeBox(
        "warning",
        "<strong>Keep this email private.</strong> Anyone who can read it can sign in as you."
      );
  } else {
    extra = noticeBox(
      "primary",
      `Your new password will be shared with you separately by <strong>${esc(resetByName)}</strong>.`
    );
  }

  const html = layout({
    preheader: `${resetByName} reset your Zealtho admin password.`,
    icon: "🔑",
    tone: "warning",
    badge: "Password reset",
    heading: "Your password was reset",
    intro: `Hi ${esc(first)}, <strong>${esc(resetByName)}</strong> has reset the password for your Zealtho admin account. For your security you've been signed out of all devices.`,
    body:
      detailsCard("Details", [
        ["Login email", esc(admin.email)],
        ["Reset by", esc(resetByName)],
        ["When", esc(formatWhen(at))],
      ]) + extra,
    cta: { label: "Sign in to Admin Portal", url: panelUrl },
    recipientEmail: admin.email,
  });

  const text = [
    `Hi ${first},`,
    "",
    `${resetByName} has reset the password for your Zealtho admin account. You've been signed out of all devices.`,
    "",
    ...(includePassword
      ? [`Login email:  ${admin.email}`, `New password: ${password}`, "", "Keep this email private."]
      : [`Your new password will be shared with you separately by ${resetByName}.`]),
    "",
    `Sign in: ${panelUrl}`,
  ].join("\n");

  return { subject, html, text };
};

module.exports = {
  createdEmail,
  updatedEmail,
  emailChangedOldAddressEmail,
  statusEmail,
  passwordResetEmail,
  // exported for tests / reuse
  firstName,
  maskEmail,
  formatWhen,
};
