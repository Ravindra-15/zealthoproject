import React from "react";

const Button = ({ text, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-orange-500 text-white py-3 rounded-full text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50"
    >
      {text}
    </button>
  );
};

export default Button;