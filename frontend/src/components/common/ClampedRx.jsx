/**
 * SHARED — a prescription that folds when it's long
 *
 * Shows the doctor's prescription (rich text) up to `maxHeight`; if it's
 * longer, it fades out at the bottom with a "Show more" button, and
 * "Show less" folds it again — so every card / case file keeps the same
 * height whatever the doctor wrote. Short prescriptions show in full with
 * no button. The HTML is always cleaned (no scripts) before it's shown.
 *
 * Props:
 *   html        the prescription HTML
 *   className   classes for the text (fonts, list styles…)
 *   maxHeight   folded height in px (default 168 ≈ 7 lines)
 *   accent      colour of the Show more / less button
 *   fade        background colour of the box (the fade blends into it)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ChevronDown, ChevronUp } from "lucide-react";

const clean = (html) =>
  DOMPurify.sanitize(String(html || ""), {
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "button"],
  });

// a little slack, so a prescription just one line too long isn't folded
const SLACK = 28;

const ClampedRx = ({ html, className = "", maxHeight = 168, accent = "#4F46E5", fade = "#FFFFFF" }) => {
  const safe = useMemo(() => clean(html), [html]);
  const boxRef = useRef(null);
  const textRef = useRef(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  // measure: is it taller than the folded height? (re-checks on resize,
  // font load, or when the prescription changes)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return undefined;
    const check = () => setLong(el.scrollHeight > maxHeight + SLACK);
    if (typeof ResizeObserver === "undefined") {
      const id = requestAnimationFrame(check);
      return () => cancelAnimationFrame(id);
    }
    const ro = new ResizeObserver(check); // also fires once straight away
    ro.observe(el);
    return () => ro.disconnect();
  }, [safe, maxHeight]);

  const folded = long && !open;

  const toggle = () => {
    const closing = open;
    setOpen((v) => !v);
    // folding a long one back up: keep the box in view
    if (closing) {
      requestAnimationFrame(() => {
        const box = boxRef.current;
        if (box && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  };

  return (
    <div ref={boxRef}>
      <div className="relative">
        <div
          ref={textRef}
          className={className}
          style={folded ? { maxHeight, overflow: "hidden" } : undefined}
          dangerouslySetInnerHTML={{ __html: safe }}
        />
        {folded && (
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${fade}00, ${fade})` }}
            aria-hidden="true"
          />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: accent }}
        >
          {open ? "Show less" : "Show more"}
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}
    </div>
  );
};

export default ClampedRx;
