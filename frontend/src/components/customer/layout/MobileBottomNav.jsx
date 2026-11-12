/**
 * CUSTOMER MODULE — Mobile bottom tab bar
 *
 * On phones / tablets (below lg) every navbar link sits in a fixed bar at
 * the bottom of the screen, app style — no hamburger menu. Desktop keeps
 * the normal top links (this bar is lg:hidden).
 *
 * Gets the same links + click handlers as the top navbar, so a tab does
 * exactly what the desktop link does. While mounted it adds
 * `has-bottom-nav` to <body> (see index.css) so page content and the
 * WhatsApp button stay above the bar.
 */

import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Stethoscope, CalendarDays, HeartPulse, Circle } from "lucide-react";

const ICONS = {
  Home: Home,
  "Our Programs": LayoutGrid,
  "Book Doctor": Stethoscope,
  "My Appointments": CalendarDays,
  "My Health": HeartPulse,
  "Add Progress": HeartPulse,
};

// shorter labels so 5 tabs fit a 320px phone
const SHORT = {
  "Our Programs": "Programs",
  "My Appointments": "Appointments",
};

const MobileBottomNav = ({
  links = [],
  onHomeClick,
  onProgramsClick,
  onProgressClick,
  dashboardPath = null,
  appointmentsCount = 0,
  activeClass = "text-orange-500", // per-program accent
}) => {
  const { pathname, hash, search } = useLocation();

  useEffect(() => {
    document.body.classList.add("has-bottom-nav");
    return () => document.body.classList.remove("has-bottom-nav");
  }, []);

  const onProgramsSection = pathname === "/home" && hash === "#programs";
  const progressOpen = !!dashboardPath && pathname === dashboardPath && search.includes("openProgress");

  const isActive = (link) => {
    if (link.isAddProgress) return progressOpen;
    if (link.label === "Home")
      return ((pathname === "/home" || pathname === "/") && !onProgramsSection) ||
        (!!dashboardPath && pathname === dashboardPath && !progressOpen);
    if (link.to.includes("#")) return onProgramsSection;
    return pathname === link.to || pathname.startsWith(`${link.to}/`);
  };

  const handlerFor = (link) => {
    if (link.isAddProgress) return onProgressClick;
    if (link.label === "Home") return onHomeClick;
    if (link.to.includes("#")) return onProgramsClick;
    return undefined;
  };

  return (
    <nav
      aria-label="Main menu"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(16,24,40,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch max-w-2xl mx-auto">
        {links.map((link) => {
          const Icon = ICONS[link.label] || Circle;
          const active = isActive(link);
          const badge = link.to === "/my-appointments" && appointmentsCount > 0;
          return (
            <li key={link.isAddProgress ? "progress" : link.to} className="flex-1 min-w-0">
              <Link
                to={link.to}
                onClick={handlerFor(link)}
                aria-current={active ? "page" : undefined}
                className={`relative h-16 flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
                  active ? activeClass : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {/* active indicator — like Facebook's tab underline, on top */}
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-b-full bg-current transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  {badge && (
                    <span
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none"
                      aria-label={`${appointmentsCount} upcoming appointments`}
                    >
                      {appointmentsCount > 9 ? "9+" : appointmentsCount}
                    </span>
                  )}
                </span>
                <span className={`max-w-full truncate text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                  {SHORT[link.label] || link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
