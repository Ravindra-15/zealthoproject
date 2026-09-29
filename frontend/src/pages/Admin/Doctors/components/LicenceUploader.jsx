/**
 * ADMIN MODULE — Licence Document Uploader
 * File picker for a doctor's licence document (PDF, Word, or image).
 * Optional here — the admin can leave it blank; the doctor is required to
 * provide it during their own profile completion if it's still missing.
 *
 * Mirrors PhotoUploader's interaction pattern (click/drag to upload, remove
 * button) but for a generic document instead of an image preview.
 */

import React, { useRef, useState } from "react";
import { FileText, Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const LicenceUploader = ({
  value, // File object (only set when a new file is picked)
  onChange, // (file: File | null, meta: { removed: boolean }) => void
  existingName, // string | null — existing document's original filename
  disabled = false,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [removed, setRemoved] = useState(false);

  const displayName = value ? value.name : removed ? null : existingName || null;

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only PDF, Word documents, or images (JPEG/PNG/WebP) are allowed";
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
    setRemoved(false);
    onChange(file, { removed: false });
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
    setRemoved(true);
    onChange(null, { removed: true });
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
          flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
          ${
            disabled
              ? "cursor-not-allowed opacity-60 border-gray-200 bg-gray-50"
              : isDragging
                ? "border-indigo-500 bg-indigo-50"
                : displayName
                  ? "border-gray-200 hover:border-indigo-300"
                  : "border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
          }
        `}
      >
        {displayName ? (
          <>
            <FileText size={18} className="text-indigo-500 flex-shrink-0" />
            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">
              {displayName}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                aria-label="Remove licence document"
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            <Upload size={18} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500">
              Click or drag a file to upload
            </span>
          </>
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
        PDF, Word, or image · Max 5MB
      </p>
    </div>
  );
};

export default LicenceUploader;
