/**
 * ADMIN MODULE — Broadcast Message Image Uploader
 * Click/drag to upload, shows a live thumbnail preview immediately
 * (object URL, no network round-trip) — feeds both this control's own
 * preview AND the real-time email preview panel via the same File object.
 */

import React, { useRef, useState, useEffect } from "react";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const MessageImageUploader = ({ value, onChange, disabled = false }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // 🖼️ Build/revoke the object URL whenever the selected file changes
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only JPEG, PNG, or WebP images are allowed";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Max size: ${MAX_SIZE_BYTES / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handleFile = (file) => {
    if (disabled) return;
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    onChange(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

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

  const handleRemove = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(null);
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`
          relative overflow-hidden rounded-xl border cursor-pointer transition-colors
          ${
            disabled
              ? "cursor-not-allowed opacity-60 border-gray-200 bg-gray-50"
              : isDragging
                ? "border-indigo-500 bg-indigo-50"
                : previewUrl
                  ? "border-gray-200"
                  : "border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
          }
        `}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Attachment preview"
              className="w-full max-h-56 object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
                aria-label="Remove image"
              >
                <Trash2 size={14} />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <ImageIcon size={18} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Upload size={14} />
              Click or drag an image to attach
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />

      <p className="text-[11px] text-gray-400 mt-1.5">
        JPEG, PNG, or WebP · Max 5MB
      </p>
    </div>
  );
};

export default MessageImageUploader;
