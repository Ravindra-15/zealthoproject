import React from "react";

const Input = ({
  type = "text",
  placeholder,
  name,
  value,
  onChange,
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border rounded-full px-4 py-3 text-sm outline-none"
    />
  );
};

export default Input;