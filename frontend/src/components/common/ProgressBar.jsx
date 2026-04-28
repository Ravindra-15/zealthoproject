// src/components/common/ProgressBar.jsx

import React from "react";

const ProgressBar = ({ step, total }) => {
  const percentage = (step / total) * 100;

  return (
    <div className="w-full mb-4">
      
      {/* Header */}
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Step {step} of {total}: Your Profile</span>
        <span>{Math.round(percentage)}%</span>
      </div>

      {/* Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-700 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;