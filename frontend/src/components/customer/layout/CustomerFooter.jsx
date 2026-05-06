/**
 * CUSTOMER MODULE — Footer
 *
 * Reusable across all customer pages.
 * Sections: contact info + social, link columns, dark green CTA card.
 * Most links are placeholders ("#") — wire them up as pages ship.
 */

import React from "react";
import { Link } from "react-router-dom";
// AFTER
import { Mail, Phone, MapPin } from "lucide-react";

// Brand icons removed from lucide-react — inline SVG replacements
const Linkedin = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Facebook = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Youtube = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </svg>
);
// ============================================
// 🔗 LINK COLUMNS
// ============================================
const LINK_COLUMNS = [
  {
    title: "Company",
    links: [
      { label: "About", to: "#" },
      { label: "Contact Us", to: "#" },
      { label: "Privacy Policy", to: "#" },
      { label: "Terms Of Use", to: "#" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "Instagram", to: "#" },
      { label: "Facebook", to: "#" },
      { label: "YouTube", to: "#" },
      { label: "LinkedIn", to: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Find A Doctor", to: "/book-doctor" },
      { label: "Our Programs", to: "/programs" },
      { label: "Pricing", to: "#" },
      { label: "Refer & Earn", to: "#" },
    ],
  },
];

// ============================================
// 🌐 SOCIAL ICONS
// ============================================
const SOCIAL_ICONS = [
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

const CustomerFooter = () => {
  return (
    <footer className="bg-white border-t border-gray-100 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ============================================ */}
        {/* 🔝 TOP GRID — contact / links / CTA card     */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* 📬 LEFT — Contact + Links */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {/* Contact column */}
            <div className="sm:col-span-1">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Contact</h3>

              <div className="space-y-2.5">
                <a
                  href="mailto:support@zealtho.com"
                  className="flex items-start gap-2 text-xs text-gray-600 hover:text-teal-700 transition-colors"
                >
                  <Mail size={13} className="mt-0.5 flex-shrink-0" />
                  <span>support@zealtho.com</span>
                </a>

                <p className="flex items-start gap-2 text-xs text-gray-600">
                  <Phone size={13} className="mt-0.5 flex-shrink-0" />
                  <span>+1 (123) 456-7890</span>
                </p>

                <p className="flex items-start gap-2 text-xs text-gray-600">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  <span>123 Wellness Way, Calm City, CA 90210</span>
                </p>
              </div>

              {/* Social row */}
              <div className="flex items-center gap-2 mt-4">
                {SOCIAL_ICONS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="
                      w-8 h-8 rounded-lg
                      flex items-center justify-center
                      text-gray-500 hover:text-teal-700 hover:bg-teal-50
                      border border-gray-200
                      transition-colors
                    "
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {LINK_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  {col.title}
                </h3>

                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.to.startsWith("#") ? (
                        <a
                          href={link.to}
                          className="text-xs text-gray-600 hover:text-teal-700 transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-xs text-gray-600 hover:text-teal-700 transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 🎴 RIGHT — Dark CTA card */}
          <div
            className="
              relative overflow-hidden
              bg-gradient-to-br from-teal-800 to-emerald-900
              rounded-2xl p-7 sm:p-8
              flex flex-col justify-between gap-6
              shadow-[0_8px_24px_rgba(13,148,136,0.18)]
            "
          >
            <img
              src="/images/illustration_7.png"
              alt="decor"
              className="
                absolute top-0 right-0
                w-24 sm:w-32 lg:w-56
                opacity-90
                pointer-events-none select-none
                "
            />
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-orange-300/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
                Find Support,
                <br />
                Guidance,
                <br />
                and Balance.
              </h2>
            </div>

            <Link
              to="/book-doctor"
              className="
                relative inline-flex items-center justify-center
                px-6 py-3 rounded-full
                text-sm font-semibold text-teal-900
                bg-white hover:bg-gray-50
                transition-colors
                self-start
              "
            >
              Find Support Now
            </Link>
          </div>
        </div>

        {/* ============================================ */}
        {/* ⬇️ BOTTOM BAR — copyright */}
        {/* ============================================ */}
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
