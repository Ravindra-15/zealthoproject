/**
 * ADMIN MODULE — Photo Uploader
 * Circular dashed-border photo upload component matching Figma.
 *
 * Features:
 *  - Click anywhere on circle to open file picker
 *  - Live preview of selected image
 *  - Drag-and-drop support
 *  - File type and size validation (client-side)
 *  - Remove button to clear selection
 *  - Shows existing photo URL for edit mode
 *  - Fully accessible
 */

import React, { useState, useRef } from "react";
import { Upload, Trash2, User } from "lucide-react";
import toast from "react-hot-toast";

// 🛡️ Client-side validation (matches backend limits)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const PhotoUploader = ({
  value, // File object or string URL (existing photo)
  onChange, // (file: File | null) => void
  existingUrl, // string | null - URL of existing photo (edit mode)
  disabled = false,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removed, setRemoved] = useState(false); // Track if user explicitly removed existing photo

  // 🖼️ Decide which image to show
  // Priority: live preview > existing URL > nothing
  const displayUrl = previewUrl || (removed ? null : existingUrl) || null;

  // ✅ Validate a file
  const validateFile = (file) => {
    if (!file) return "No file selected";

    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only JPEG, PNG, or WebP images are allowed";
    }

    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Max size: ${MAX_SIZE_BYTES / (1024 * 1024)}MB`;
    }

    return null;
  };

  // 📥 Handle file selection (from input or drop)
  const handleFile = (file) => {
    if (disabled) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRemoved(false); // 🆕 Reset removed flag when new file picked
     onChange(file, { removed: false });
  };

  // 📁 Handle file input change
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";
  };

  // 🖱️ Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // 🗑️ Remove photo
  const handleRemove = (e) => {
    e.stopPropagation();
    if (disabled) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setRemoved(true); // 🆕 Mark existing photo as removed
    onChange(null, { removed: true });
  };

  // 🖱️ Click to open file picker
  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  // ⌨️ Keyboard accessibility
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* 📷 Upload circle */}
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={
          displayUrl ? "Change profile photo" : "Upload profile photo"
        }
        aria-disabled={disabled}
        className={`
          relative w-32 h-32 sm:w-36 sm:h-36
          rounded-full
          flex items-center justify-center
          cursor-pointer
          transition-all duration-200
          ${
            disabled
              ? "cursor-not-allowed opacity-60"
              : isDragging
                ? "border-indigo-500 bg-indigo-50 scale-105"
                : displayUrl
                  ? "border-2 border-gray-200 hover:border-indigo-400"
                  : "border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
          }
          ${displayUrl ? "" : "border-2 border-dashed"}
          group
        `}
      >
        {/* 🖼️ Preview image */}
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Doctor profile preview"
              className="w-full h-full rounded-full object-cover"
              onError={() => {
                setPreviewUrl(null);
              }}
            />

            {/* 🌑 Hover overlay */}
            <div
              className="
                absolute inset-0 rounded-full
                bg-black/50
                opacity-0 group-hover:opacity-100
                transition-opacity
                flex items-center justify-center
                pointer-events-none
              "
            >
              <Upload size={20} className="text-white" />
            </div>

            {/* 🗑️ Remove button (only when there's a photo) */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="
                  absolute -top-1 -right-1
                  w-7 h-7 rounded-full
                  bg-red-500 hover:bg-red-600
                  text-white
                  flex items-center justify-center
                  shadow-md
                  transition-colors
                  z-10
                "
                aria-label="Remove photo"
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        ) : (
          /* 📤 Empty state */
          <div className="flex flex-col items-center gap-1.5">
            <Upload
              size={20}
              className="text-gray-400 group-hover:text-indigo-500 transition-colors"
            />
            <p className="text-xs font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">
              Upload Photo
            </p>
          </div>
        )}
      </div>

      {/* 📁 Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />

      {/* ℹ️ Helper text */}
      <p className="text-[11px] text-gray-400 mt-2 text-center">
        JPEG, PNG, WebP · Max 2MB
      </p>
    </div>
  );
};

export default PhotoUploader;
