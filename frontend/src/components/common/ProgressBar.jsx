// src/components/common/ProgressBar.jsx

import React from "react";

const ProgressBar = ({ step, total }) => {
  const percentage = Math.round((step / total) * 100);

  return (
    <div className="w-full">
      
      {/* Top text */}
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Step {step} of {total}: Your Profile</span>
        <span>{percentage}%</span>
      </div>

      {/* Bar background */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        
        {/* Progress fill */}
        <div
          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

    </div>
  );
};

export default ProgressBar;