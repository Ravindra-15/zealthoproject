import React from "react";
import { Settings as SettingsIcon } from "lucide-react";

const SettingsHeader = () => {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center flex-shrink-0">
        <SettingsIcon className="w-5 h-5 text-indigo-600" strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Professional Profile Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your credentials and how you appear to patients.
        </p>
      </div>
    </div>
  );
};

export default SettingsHeader;