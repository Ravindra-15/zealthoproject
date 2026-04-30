/**
 * ADMIN MODULE — Remind Users Table
 * Shows users with subscriptions expiring soon.
 * Filter is controlled (managed by parent for backend refetching).
 * Renders skeleton while loading.
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import AdminCard from "../../../../components/admin/common/AdminCard";
import { TableSkeleton } from "../../../../components/admin/common/AdminSkeleton";

// 🎨 ADMIN: Filter dropdown options
const FILTER_OPTIONS = [
  { value: "expiring-soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "active", label: "Active" },
];

// 🎯 ADMIN: Filter dropdown — accessible, click-outside-to-close
const FilterDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 🖱️ Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌨️ Close on Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const selected =
    FILTER_OPTIONS.find((opt) => opt.value === value) || FILTER_OPTIONS[0];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          flex items-center gap-2 px-3 py-2
          bg-white border border-gray-200 rounded-lg
          text-sm font-medium text-gray-700
          hover:bg-gray-50 transition-colors
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="
            absolute right-0 top-full mt-1 z-10
            min-w-[140px] py-1
            bg-white border border-gray-200 rounded-lg
            shadow-lg
          "
        >
          {FILTER_OPTIONS.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                px-3 py-2 text-sm cursor-pointer
                hover:bg-gray-50 transition-colors
                ${
                  option.value === value
                    ? "text-indigo-600 font-medium"
                    : "text-gray-700"
                }
              `}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 👤 ADMIN: Avatar component with fallback
const UserAvatar = ({ user }) => {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={`${user.name} avatar`}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div
      className="
        w-10 h-10 rounded-full flex-shrink-0
        bg-gradient-to-br from-gray-200 to-gray-300
        flex items-center justify-center
      "
      aria-hidden="true"
    >
      <User size={18} className="text-gray-400" />
    </div>
  );
};

const RemindUsersTable = ({
  users = [],
  loading = false,
  filter = "expiring-soon",
  onFilterChange,
  onMessageUser,
}) => {
  // ⏳ ADMIN: Show skeleton while loading
  if (loading) {
    return <TableSkeleton rows={3} />;
  }

  // 💬 ADMIN: Safe message handler
  const handleMessage = (user) => {
    if (typeof onMessageUser === "function") {
      onMessageUser(user);
    }
  };

  // 🎯 ADMIN: Safe filter change handler
  const handleFilterChange = (value) => {
    if (typeof onFilterChange === "function") {
      onFilterChange(value);
    }
  };

  return (
    <AdminCard
      title="Remind Users"
      headerAction={
        <FilterDropdown value={filter} onChange={handleFilterChange} />
      }
      noPadding
    >
      {/* 🚫 ADMIN: Empty state */}
      {users.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No users to remind right now</p>
        </div>
      ) : (
        <>
          {/* 💻 DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    Plan
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    Subscription
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${
                        idx !== users.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.userId}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">{user.plan}</span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-red-500">
                        {user.subscription}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleMessage(user)}
                        className="
                          text-sm font-medium text-indigo-600
                          hover:text-indigo-700 hover:underline
                          transition-colors
                        "
                        aria-label={`Send message to ${user.name}`}
                      >
                        Message
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 📱 MOBILE STACKED CARDS */}
          <div className="md:hidden divide-y divide-gray-100">
            {users.map((user) => (
              <div key={user.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.userId}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMessage(user)}
                    className="
                      flex-shrink-0 text-sm font-medium text-indigo-600
                      hover:text-indigo-700 hover:underline
                      transition-colors
                    "
                    aria-label={`Send message to ${user.name}`}
                  >
                    Message
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                      Plan
                    </span>
                    <span className="text-sm text-gray-700">{user.plan}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                      Subscription
                    </span>
                    <span className="text-sm font-medium text-red-500">
                      {user.subscription}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminCard>
  );
};

export default RemindUsersTable;