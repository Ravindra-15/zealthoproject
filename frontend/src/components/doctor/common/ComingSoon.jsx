/**
 * Reusable placeholder for doctor pages not yet built.
 */

import React from "react";
import { Construction } from "lucide-react";

const ComingSoon = ({ title, subtitle }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 items-center justify-center mb-5">
          <Construction className="w-7 h-7 text-indigo-600" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {subtitle || "This module is under construction. Check back soon."}
        </p>
        <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Coming soon
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;