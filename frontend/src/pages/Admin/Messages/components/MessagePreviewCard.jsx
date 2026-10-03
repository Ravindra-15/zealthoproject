/**
 * ADMIN MODULE — Live Email Preview
 * Mirrors exactly what sendBroadcastMessageEmail renders — pure function
 * of the form's own state, so it updates instantly as the admin types or
 * attaches an image, with no save/refresh step.
 */

import React, { useEffect, useState } from "react";
import { Mail } from "lucide-react";

const MessagePreviewCard = ({ title, bodyHtml, imageFile }) => {
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const hasContent = title.trim() || bodyHtml.trim();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <Mail size={14} className="text-gray-400" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Live Email Preview
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {!hasContent ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Start typing to see how the email will look...
          </p>
        ) : (
          <div className="max-w-[520px] mx-auto">
            {/* 📧 Mock email chrome */}
            <div className="text-center pb-4 mb-4 border-b border-gray-100">
              <span className="text-lg font-extrabold text-orange-500">Zealtho</span>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-3 break-words">
              {title.trim() || <span className="text-gray-300">Your title here</span>}
            </h2>

            <div
              className="text-sm text-gray-700 leading-relaxed break-words [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
              dangerouslySetInnerHTML={{
                __html: bodyHtml.trim() || '<p style="color:#d1d5db">Your message body here...</p>',
              }}
            />

            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Attachment preview"
                className="w-full rounded-lg mt-5"
              />
            )}

            <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
              — The Zealtho Team
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagePreviewCard;
