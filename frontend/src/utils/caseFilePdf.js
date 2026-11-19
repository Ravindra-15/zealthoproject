/**
 * CUSTOMER MODULE — Case file PDF ("Download PDF" in a case's folder)
 * One structured PDF for a whole case:
 *  1. Summary page — the case, its problem and a table of every appointment
 *  2. One section per appointment (first visit + every follow-up): date /
 *     time, doctor, the patient's problem, the doctor's prescription, reports
 *  3. Photo reports (JPG / PNG) right after their visit, one per page
 * PDF / Word reports can't be placed inside, so they're listed by name (they
 * download from the case folder screen).
 * Each part is rendered on its own, so a long case never hits the browser's
 * canvas size limit on phones.
 */

import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";
import { fetchReportBlob } from "../services/medicalReportService";
import { formatUtcDate, formatUtcTime24h, getViewerTimezone } from "./time";

export const PROGRAM_NAMES = {
  zealtho: "Zealtho",
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

// 🏷️ Status of one appointment inside a case
export const visitStatus = (a) => {
  if (a.isUpcoming) return { label: "Upcoming", fg: "#B45309", bg: "#FFFBEB", bd: "#FDE68A" };
  if (a.status === "completed") return { label: "Completed", fg: "#047857", bg: "#ECFDF5", bd: "#A7F3D0" };
  if (a.status === "no_show") return { label: "Missed", fg: "#6B7280", bg: "#F3F4F6", bd: "#E5E7EB" };
  // confirmed / pending and the slot is over — consulted, not marked complete
  return { label: "Consulted", fg: "#047857", bg: "#ECFDF5", bd: "#A7F3D0" };
};

export const visitTitle = (a) => `Visit ${a.visitNumber} · ${a.visitType === "follow_up" ? "Follow-up" : "First visit"}`;

export const isImageReport = (r) => /^image\/(jpeg|png)$/.test(String(r?.mimeType || ""));

export const reportKind = (r) => {
  const m = String(r?.mimeType || "");
  if (m === "application/pdf") return "PDF";
  if (m === "image/jpeg") return "JPG";
  if (m === "image/png") return "PNG";
  if (m.includes("word")) return "Word";
  return "File";
};

export const fmtSize = (bytes) => {
  const b = Number(bytes) || 0;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
};

export const sanitizeRx = (html) =>
  DOMPurify.sanitize(String(html || ""), {
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "button"],
  });

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// multi-line text → one block per line (so a page break never cuts a line in half)
const lines = (s) =>
  String(s || "")
    .split(/\r?\n/)
    .map((l) => `<div class="cf-avoid" style="min-height:1.2em;">${esc(l) || "&nbsp;"}</div>`)
    .join("");

// "Asia/Calcutta" (old name some browsers report) → "Asia/Kolkata"
const TZ_RENAMED = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Katmandu": "Asia/Kathmandu", "Asia/Saigon": "Asia/Ho_Chi_Minh", "Asia/Rangoon": "Asia/Yangon" };
const tzName = () => TZ_RENAMED[getViewerTimezone()] || getViewerTimezone();

const dateTime = (iso) => `${formatUtcDate(iso)}, ${formatUtcTime24h(iso)}`;

// a 1600px JPEG copy of a photo report (keeps the PDF small)
const imageForPdf = async (blob, maxPx = 1600) => {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const k = Math.min(1, maxPx / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { src: cv.toDataURL("image/jpeg", 0.85), w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
};

// ============================================
// 🧱 HTML of each part
// ============================================
const BASE = "font-family: Arial, Helvetica, sans-serif; color:#1F2937; width:100%; box-sizing:border-box; padding:2px 3px 8px;";
const PAGE_W = 700; // px — fits the A4 printable width
const IMG_MAX_H = 820;

const pill = (text, fg, bg, bd) =>
  // html2canvas draws text ~3px lower than the browser — the inner span is lifted to centre it in the PDF
  `<span style="display:inline-block; height:18px; line-height:16px; padding:0 9px; box-sizing:border-box; border-radius:999px; font-size:10px; font-weight:700; color:${fg}; background:${bg}; border:1px solid ${bd}; white-space:nowrap;"><span style="position:relative; top:-3px;">${esc(text)}</span></span>`;

const box = (title, color, inner, bg = "#F9FAFB", bd = "#E5E7EB") => `
  <div style="border:1px solid ${bd}; background:${bg}; border-radius:10px; padding:10px 12px; margin-top:10px;">
    <div class="cf-avoid" style="font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${color}; margin-bottom:6px;">${esc(title)}</div>
    <div style="font-size:12px; line-height:1.55;">${inner}</div>
  </div>`;

const summaryHtml = ({ file, brand, theme }) => {
  const c = file.case;
  const appts = file.appointments;
  const doctors = [...new Set(appts.map((a) => a.doctorName).filter(Boolean))];
  const problem = c.description || appts[0]?.notes || "";
  const stat = (label, value) => `
    <td style="width:33%; padding:6px; vertical-align:top;">
      <div style="border:1px solid #E5E7EB; border-radius:10px; padding:9px 11px;">
        <div style="font-size:10px; color:#6B7280;">${esc(label)}</div>
        <div style="font-size:13px; font-weight:700; margin-top:2px;">${esc(value)}</div>
      </div>
    </td>`;
  const statusPill =
    c.status === "open"
      ? pill("Open", "#047857", "#ECFDF5", "#A7F3D0")
      : pill(`Closed${c.closedAt ? ` · ${formatUtcDate(c.closedAt)}` : ""}`, "#4B5563", "#F3F4F6", "#E5E7EB");

  const rows = appts
    .map((a) => {
      const st = visitStatus(a);
      return `
      <tr class="cf-avoid">
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6; font-weight:700; color:${theme.dark};">${a.visitNumber}</td>
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6;">${esc(dateTime(a.scheduledAt))}</td>
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6;">${esc(a.doctorName || "—")}${a.doctor?.domain ? `<div style="font-size:10px; color:#9CA3AF;">${esc(a.doctor.domain)}</div>` : ""}</td>
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6;">${a.visitType === "follow_up" ? "Follow-up" : "First visit"}</td>
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6;">${pill(st.label, st.fg, st.bg, st.bd)}</td>
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6; text-align:center;">${a.prescription ? "Yes" : "—"}</td>
        <td style="padding:7px 6px; border-bottom:1px solid #F3F4F6; text-align:center;">${a.reports.length || "—"}</td>
      </tr>`;
    })
    .join("");

  return `
  <div style="${BASE}">
    <div style="border-radius:12px; overflow:hidden; border:1px solid ${theme.border};">
      <div style="height:6px; background:${theme.main};"></div>
      <div style="padding:14px 16px; background:${theme.soft}; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
        <div>
          <div style="font-size:20px; font-weight:800; color:${theme.dark};">${esc(brand)}</div>
          <div style="font-size:11px; color:#6B7280; margin-top:2px; letter-spacing:0.05em; text-transform:uppercase; font-weight:700;">Case File</div>
        </div>
        <div style="text-align:right; font-size:10px; color:#6B7280; line-height:1.6;">
          <div><b>Patient:</b> ${esc(file.patient?.fullName || "—")}</div>
          <div><b>Generated:</b> ${esc(dateTime(file.generatedAt || new Date()))}</div>
          <div>Times shown in ${esc(tzName())}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <div style="font-size:19px; font-weight:800;">${esc(c.label)}</div>
      ${statusPill}
    </div>

    <table style="width:100%; border-collapse:collapse; margin-top:8px; table-layout:fixed;">
      <tr>
        ${stat("Started", c.firstVisitAt ? formatUtcDate(c.firstVisitAt) : formatUtcDate(c.createdAt))}
        ${stat("Appointments", `${appts.length} (${c.visitCount} visited)`)}
        ${stat("Follow-ups", String(c.followUpCount || 0))}
      </tr>
      <tr>
        ${stat("Last visit", c.lastVisitAt ? formatUtcDate(c.lastVisitAt) : "—")}
        ${stat(c.status === "closed" ? "Closed on" : "Next appointment", c.status === "closed" ? (c.closedAt ? formatUtcDate(c.closedAt) : "—") : c.nextAppointment ? dateTime(c.nextAppointment.scheduledAt) : "—")}
        ${stat(doctors.length === 1 ? "Doctor" : "Doctors", doctors.join(", ") || "—")}
      </tr>
    </table>

    ${box("Problem (as first described)", theme.dark, problem ? lines(problem) : `<i style="color:#9CA3AF;">Not described.</i>`)}

    <div class="cf-avoid" style="margin-top:18px; font-size:12px; font-weight:800; color:${theme.dark}; text-transform:uppercase; letter-spacing:0.05em;">All appointments in this case</div>
    <table style="width:100%; border-collapse:collapse; margin-top:6px; font-size:11px;">
      <thead>
        <tr style="background:${theme.soft}; color:#374151; text-align:left;">
          <th style="padding:7px 6px; width:22px;">#</th>
          <th style="padding:7px 6px;">Date &amp; time</th>
          <th style="padding:7px 6px;">Doctor</th>
          <th style="padding:7px 6px;">Type</th>
          <th style="padding:7px 6px;">Status</th>
          <th style="padding:7px 6px; text-align:center;">Prescription</th>
          <th style="padding:7px 6px; text-align:center;">Reports</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" style="padding:10px 6px; color:#9CA3AF;">No appointments in this case yet.</td></tr>`}</tbody>
    </table>
    <div style="margin-top:14px; font-size:10px; color:#9CA3AF;">Each appointment follows on its own page with the problem, prescription and reports.</div>
  </div>`;
};

const visitHtml = ({ a, theme, images }) => {
  const st = visitStatus(a);
  const program = PROGRAM_NAMES[a.platform] || "Zealtho";
  const rx = a.prescription
    ? `<div class="cf-rx">${sanitizeRx(a.prescription)}</div>`
    : `<i style="color:#9CA3AF;">${a.isUpcoming ? "The prescription will appear here after the consultation." : "The doctor hasn't shared a prescription for this visit."}</i>`;
  const reportRows = a.reports
    .map((r) => {
      const included = images.has(String(r._id));
      return `
      <tr class="cf-avoid">
        <td style="padding:6px; border-bottom:1px solid #F3F4F6; word-break:break-all;">${esc(r.originalName)}</td>
        <td style="padding:6px; border-bottom:1px solid #F3F4F6;">${reportKind(r)}</td>
        <td style="padding:6px; border-bottom:1px solid #F3F4F6; white-space:nowrap;">${fmtSize(r.size)}</td>
        <td style="padding:6px; border-bottom:1px solid #F3F4F6; white-space:nowrap;">${r.createdAt ? formatUtcDate(r.createdAt) : "—"}</td>
        <td style="padding:6px; border-bottom:1px solid #F3F4F6; color:${included ? "#047857" : "#6B7280"};">${included ? "Included on the next page(s)" : "Download it from the case file in the app"}</td>
      </tr>`;
    })
    .join("");
  const reports = a.reports.length
    ? `<table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead><tr style="text-align:left; color:#6B7280;">
          <th style="padding:4px 6px; font-weight:600;">File</th><th style="padding:4px 6px; font-weight:600;">Type</th>
          <th style="padding:4px 6px; font-weight:600;">Size</th><th style="padding:4px 6px; font-weight:600;">Added</th>
          <th style="padding:4px 6px; font-weight:600;">In this PDF</th>
        </tr></thead><tbody>${reportRows}</tbody></table>`
    : `<i style="color:#9CA3AF;">No reports added for this visit.</i>`;

  return `
  <div style="${BASE}">
    <div class="cf-avoid" style="border-radius:12px; overflow:hidden; border:1px solid ${theme.border};">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:11px 14px; background:${theme.soft}; border-left:6px solid ${theme.main};">
        <div>
          <div style="font-size:15px; font-weight:800; color:${theme.dark};">${esc(visitTitle(a))}</div>
          <div style="font-size:11px; color:#4B5563; margin-top:2px;">${esc(dateTime(a.scheduledAt))} · ${a.durationMinutes} min</div>
        </div>
        ${pill(st.label, st.fg, st.bg, st.bd)}
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <tr>
          <td style="padding:8px 14px; width:50%;"><span style="color:#6B7280;">Doctor</span><br/><b>${esc(a.doctorName || "—")}</b>${a.doctor?.domain ? ` <span style="color:#6B7280;">· ${esc(a.doctor.domain)}</span>` : ""}</td>
          <td style="padding:8px 14px;"><span style="color:#6B7280;">Booked on</span><br/><b>${esc(program)}</b></td>
        </tr>
      </table>
    </div>

    ${box("Problem described", theme.dark, a.notes ? lines(a.notes) : `<i style="color:#9CA3AF;">No problem described.</i>`)}
    ${box(
      `Prescription & diet plan${a.prescriptionSentAt ? ` · shared ${formatUtcDate(a.prescriptionSentAt)}` : ""}`,
      theme.dark,
      rx,
      a.prescription ? theme.soft : "#F9FAFB",
      a.prescription ? theme.border : "#E5E7EB"
    )}
    ${box(`Reports (${a.reports.length})`, theme.dark, reports)}
  </div>`;
};

const imageHtml = ({ a, r, img, idx, total, theme }) => {
  const k = Math.min(PAGE_W / img.w, IMG_MAX_H / img.h, 1.5);
  return `
  <div style="${BASE}">
    <div class="cf-avoid" style="display:flex; justify-content:space-between; gap:10px; align-items:baseline; border-bottom:2px solid ${theme.main}; padding-bottom:6px;">
      <div style="font-size:12px; font-weight:800; color:${theme.dark};">${esc(visitTitle(a))} · Report ${idx} of ${total}</div>
      <div style="font-size:10px; color:#6B7280;">${esc(formatUtcDate(a.scheduledAt))}</div>
    </div>
    <div style="font-size:11px; color:#374151; margin:6px 0 10px; word-break:break-all;">${esc(r.originalName)}${r.createdAt ? ` · added ${esc(formatUtcDate(r.createdAt))}` : ""}</div>
    <div><img src="${img.src}" style="display:block; margin:0 auto; width:${Math.round(img.w * k)}px; height:${Math.round(img.h * k)}px; border:1px solid #E5E7EB; border-radius:6px;" /></div>
  </div>`;
};

// lists drawn with ::before — html2canvas puts native list markers in the wrong place.
// Quill can save bullets as <ol><li data-list="bullet">, so both shapes are handled.
const RX_CSS = `
  .cf-rx ul, .cf-rx ol { list-style: none; padding-left: 4px; margin: 3px 0; counter-reset: cfn; }
  .cf-rx li { position: relative; padding-left: 16px; margin: 2px 0; }
  .cf-rx ul > li::before, .cf-rx li[data-list="bullet"]::before { content: "•"; position: absolute; left: 3px; top: 0; }
  .cf-rx ol > li:not([data-list="bullet"]) { counter-increment: cfn; }
  .cf-rx ol > li:not([data-list="bullet"])::before { content: counter(cfn) "."; position: absolute; left: 0; top: 0; }
  .cf-rx .ql-ui { display: none; }
  .cf-rx h1 { font-size: 15px; font-weight: 700; margin: 5px 0; }
  .cf-rx h2 { font-size: 14px; font-weight: 700; margin: 5px 0; }
  .cf-rx h3 { font-size: 13px; font-weight: 700; margin: 4px 0; }
  .cf-rx p { margin: 2px 0; }
  .cf-rx a { color: #4F46E5; text-decoration: underline; }
  .cf-rx img { max-width: 100%; }
`;

const toEl = (html) => {
  const el = document.createElement("div");
  el.innerHTML = `<style>${RX_CSS}</style>${html}`;
  return el;
};

export const caseFileName = (c) => {
  const title = String(c?.title || "Case")
    .replace(/[\\/:*?"<>|\x00-\x1f]+/g, " ")
    .replace(/[.\s]+$/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `Case-${c?.caseNumber || ""}_${title || "Case"}_${ymd}.pdf`;
};

// ============================================
// 📄 BUILD + SAVE
// ============================================
// theme: { main, dark, border, soft } · brand: "Zealtho" / "Yoga T20" / …
// Returns { skippedImages } — photo reports that couldn't be loaded.
export const downloadCaseFilePdf = async ({ file, brand, theme }) => {
  // 🖼️ photo reports → small JPEG copies (a failed one is just listed)
  const images = new Map();
  let skippedImages = 0;
  for (const a of file.appointments) {
    for (const r of a.reports.filter(isImageReport)) {
      try {
        images.set(String(r._id), await imageForPdf(await fetchReportBlob(r._id)));
      } catch {
        skippedImages += 1;
      }
    }
  }

  const parts = [summaryHtml({ file, brand, theme })];
  for (const a of file.appointments) {
    parts.push(visitHtml({ a, theme, images }));
    const pics = a.reports.filter((r) => images.has(String(r._id)));
    pics.forEach((r, i) => parts.push(imageHtml({ a, r, img: images.get(String(r._id)), idx: i + 1, total: pics.length, theme })));
  }

  const opt = {
    margin: [12, 10, 14, 10], // mm — room for the page footer
    filename: caseFileName(file.case),
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: [".cf-avoid", ".cf-rx p", ".cf-rx li", ".cf-rx h1", ".cf-rx h2", ".cf-rx h3", "tr", "img"] },
  };

  try {
    let worker = html2pdf().set(opt).from(toEl(parts[0])).toPdf();
    parts.slice(1).forEach((html) => {
      worker = worker
        .get("pdf")
        .then((pdf) => pdf.addPage())
        .from(toEl(html))
        .toContainer()
        .toCanvas()
        .toPdf();
    });
    // page footer: "Zealtho · Case 2 file      Page 3 of 7"
    worker = worker.get("pdf").then((pdf) => {
      const n = pdf.internal.getNumberOfPages();
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const left = `${String(brand).replace(/[^\x20-\x7e]/g, "")} - Case ${file.case.caseNumber} file`;
      for (let i = 1; i <= n; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(left, 10, H - 6);
        pdf.text(`Page ${i} of ${n}`, W - 10, H - 6, { align: "right" });
      }
    });
    await worker.save();
  } finally {
    // never leave html2pdf's hidden render layer behind if something failed
    document.querySelectorAll(".html2pdf__overlay").forEach((el) => el.remove());
  }
  return { skippedImages };
};
