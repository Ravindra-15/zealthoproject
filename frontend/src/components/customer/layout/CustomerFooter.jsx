/**
 * CUSTOMER MODULE — Footer
 * Matches Figma: dark icons, structured contact info, working navigation links
 */

import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

// ============================================
// 🎨 BRAND ICONS — dark filled style
// ============================================
const Linkedin = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const Facebook = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
  </svg>
);

const Instagram = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

const Whatsapp = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z" />
  </svg>
);

// ============================================
// 🔗 NAVIGATION DATA
// ============================================
const COMPANY_LINKS = [
  { label: "About", type: "page", to: "/about" },
  { label: "Contact Us", type: "page", to: "/contact" },
  { label: "Privacy Policy", type: "page", to: "/privacy-policy" },
  { label: "Terms Of Use", type: "page", to: "/terms-of-use" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", type: "external", to: "https://instagram.com" },
  { label: "Facebook", type: "external", to: "https://facebook.com" },
  { label: "YouTube", type: "external", to: "https://youtube.com" },
  { label: "LinkedIn", type: "external", to: "https://linkedin.com" },
];

const RESOURCE_LINKS = [
  { label: "Find A Doctor", type: "page", to: "/book-doctor" },
  { label: "Our Programs", type: "section", to: "programs" },
  { label: "Pricing", type: "section", to: "pricing" },
  { label: "Refer & Earn", type: "page", to: "/refer-and-earn" },
];

const SOCIAL_ICONS = [
  { Icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { Icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { Icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { Icon: Whatsapp, href: "https://wa.me/11234567890", label: "WhatsApp" },
];

// ============================================
// 🔗 SMART LINK
// ============================================
const FooterLink = ({ link }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionClick = (e) => {
    e.preventDefault();

    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: link.to } });
    } else {
      const el = document.getElementById(link.to);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  };

  const className =
    "text-sm text-gray-700 hover:text-teal-700 transition-colors";

  if (link.type === "external") {
    return (
      <a
        href={link.to}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {link.label}
      </a>
    );
  }
  
  if (link.type === "section") {
    return (
      <a
        href={`#${link.to}`}
        onClick={handleSectionClick}
        className={className}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link to={link.to} className={className}>
      {link.label}
    </Link>
  );
};

// ============================================
// 🏠 MAIN FOOTER
// ============================================
const CustomerFooter = () => {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-12">
        {/* TOP GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16">
          {/* LEFT — Contact + Links */}
          <div>
            {/* Contact details */}
            <div className="space-y-2 mb-4">
              <p className="text-sm text-[#0F2C3D]">
                <span className="font-bold">Email:</span>{" "}
                <a
                  href="mailto:support@zealtho.com"
                  className="hover:text-teal-700 transition-colors"
                >
                  support@zealtho.com
                </a>
              </p>

              <p className="text-sm text-[#0F2C3D]">
                <span className="font-bold">Phone:</span> +1 (123) 456-7890
                <span className="ml-4">+1 (123) 456-7890</span>
              </p>

              <p className="text-sm text-[#0F2C3D]">
                <span className="font-bold">Address:</span> 123 Wellness Way,
                Calm City, CA 90210
              </p>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-4 mb-8">
              {SOCIAL_ICONS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-[#0F2C3D] hover:text-teal-700 transition-colors"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>

            {/* Three-column link grid */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl">
              {/* Company */}
              <ul className="space-y-3">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>

              {/* Social */}
              <ul className="space-y-3">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>

              {/* Resources */}
              <ul className="space-y-3">
                {RESOURCE_LINKS.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT — CTA CARD */}
<div
  className="
    relative overflow-hidden
    bg-[#0F3D38]
    rounded-tl-3xl rounded-bl-3xl rounded-br-3xl rounded-tr-none
    p-8 sm:p-10
    flex flex-col justify-between gap-8
    w-full lg:w-[500px]
    min-h-[340px]
    shadow-[0_8px_24px_rgba(15,61,56,0.15)]
  "
>
  {/* Decorative illustration — flush to top-right */}
  <img
    src="/images/illustration_7.png"
    alt=""
    className="
      absolute top-0 right-0
      w-36 sm:w-44 lg:w-52
      pointer-events-none select-none
    "
  />

  {/* Heading */}
  <div className="relative z-10">
    <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-white leading-[1.15] tracking-tight">
      Find
      <br />
      Support,
      <br />
      Guidance,
      <br />
      and Balance.
    </h2>
  </div>

  {/* CTA button */}
  <Link
    to="/book-doctor"
    className="
      relative z-10 inline-flex items-center justify-center
      w-full px-6 py-3.5 rounded-full
      text-sm sm:text-base font-bold text-[#0F3D38]
      bg-white hover:bg-gray-50
      shadow-[0_2px_8px_rgba(0,0,0,0.08)]
      transition-colors
    "
  >
    Find Support Now
  </Link>
</div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Zealtho. All rights reserved.
          </p>

          <p className="text-xs text-gray-400">
            Made with care for your wellness journey.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default CustomerFooter;
