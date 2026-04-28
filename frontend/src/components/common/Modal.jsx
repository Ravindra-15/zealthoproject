// src/components/common/Modal.jsx

import React from "react";

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      
      <div className="bg-white rounded-2xl p-8 w-[90%] max-w-md relative shadow-xl">

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
};

export default Modal;