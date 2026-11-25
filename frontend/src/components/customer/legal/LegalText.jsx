/**
 * Legal text set by the super admin (Legal & Disclaimers page).
 *  - LegalInline     → one line; {brand} → program name, {terms} / {privacy} → links
 *  - LegalParagraphs → section text; a blank line starts a new paragraph
 *  - LegalNotices    → the admin's disclaimers for one spot in the app
 * Plain text only — nothing the admin types is treated as HTML.
 */

import { AlertTriangle, Info } from "lucide-react";

const TOKEN = /(\{brand\}|\{terms\}|\{privacy\})/g;

const LINKS = {
  "{terms}": { to: "/terms-of-use", label: "Terms of Service" },
  "{privacy}": { to: "/privacy-policy", label: "Privacy Policy" },
};

export const LegalInline = ({ text, brand, linkClassName = "underline hover:no-underline" }) => (
  <>
    {String(text || "")
      .split(TOKEN)
      .map((part, i) => {
        if (part === "{brand}") return brand;
        const link = LINKS[part];
        if (link) {
          // new tab, so a half-filled sign-up or checkout isn't lost
          return (
            <a key={i} href={link.to} target="_blank" rel="noopener noreferrer" className={linkClassName}>
              {link.label}
            </a>
          );
        }
        return part;
      })}
  </>
);

export const LegalParagraphs = ({ text, brand, className }) => (
  <>
    {String(text || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => (
        <p key={i} className={`whitespace-pre-line ${className || ""}`}>
          <LegalInline text={p} brand={brand} />
        </p>
      ))}
  </>
);

const TONE = {
  info: { box: "bg-gray-50 border-gray-200 text-gray-600", icon: "text-gray-400", Icon: Info },
  warning: { box: "bg-amber-50 border-amber-200 text-amber-800", icon: "text-amber-500", Icon: AlertTriangle },
};

export const LegalNotices = ({ notices, brand, variant = "box", className = "" }) => {
  if (!notices?.length) return null;
  if (variant === "plain") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {notices.map((n) => (
          <p key={n.key} className="whitespace-pre-line">
            <LegalInline text={n.text} brand={brand} />
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className={`space-y-2 ${className}`}>
      {notices.map((n) => {
        const t = TONE[n.tone] || TONE.info;
        return (
          <div
            key={n.key}
            role={n.tone === "warning" ? "note" : undefined}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed text-left ${t.box}`}
          >
            <t.Icon size={14} className={`mt-0.5 flex-shrink-0 ${t.icon}`} aria-hidden="true" />
            <p className="whitespace-pre-line min-w-0">
              <LegalInline text={n.text} brand={brand} />
            </p>
          </div>
        );
      })}
    </div>
  );
};

// shown for a moment while the latest text loads (first visit only)
export const LegalSkeleton = ({ sections = 3 }) => (
  <div className="max-w-4xl mx-auto space-y-10 animate-pulse" aria-busy="true" aria-label="Loading">
    {Array.from({ length: sections }).map((_, i) => (
      <div key={i} className="space-y-3 flex flex-col items-center">
        <div className="h-5 w-64 max-w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-11/12 rounded bg-gray-100" />
        <div className="h-3 w-4/5 rounded bg-gray-100" />
      </div>
    ))}
  </div>
);
