// src/components/common/WhatsAppFloat.jsx
// Floating WhatsApp button — icon only, visible on every page.
// Always gently pulses; every 5s it briefly pops a tooltip bubble.

import { useEffect, useState } from "react";

const WHATSAPP_URL = "https://wa.me/919876543210";

// Messages it cycles through when the bubble pops
const MESSAGES = ["Chat with us!", "Need help?", "We're online 👋"];

const WhatsAppFloat = () => {
  const [showBubble, setShowBubble] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    let hideTimer;

    // every 5s: pick the next message, show bubble for ~3s, then hide
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
      setShowBubble(true);
      hideTimer = setTimeout(() => setShowBubble(false), 3000);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {/* local keyframes — pulse ring + bubble pop */}
      <style>{`
        @keyframes waPulse {
          0%   { box-shadow: 0 0 0 0 rgba(37,211,102,0.45); }
          70%  { box-shadow: 0 0 0 14px rgba(37,211,102,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
        }
        @keyframes waPop {
          0%   { opacity: 0; transform: translateY(6px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .wa-pulse { animation: waPulse 2s ease-out infinite; }
        .wa-pop   { animation: waPop 0.25s ease-out forwards; }
      `}</style>

      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2">
        {/* Tooltip bubble (shows on the timer) */}
        {showBubble && (
          <div className="wa-pop bg-white text-gray-800 text-xs md:text-sm font-medium px-3 py-2 rounded-2xl rounded-br-sm shadow-[0_6px_18px_rgba(0,0,0,0.15)] whitespace-nowrap">
            {MESSAGES[msgIndex]}
          </div>
        )}

        {/* The button — white icon on green */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="wa-pulse flex items-center justify-center bg-[#25D366] hover:bg-[#1EBE5B] rounded-full shadow-lg transition-colors"
          style={{ width: "3.25rem", height: "3.25rem" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="white"
            className="w-7 h-7 md:w-8 md:h-8"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </a>
      </div>
    </>
  );
};

export default WhatsAppFloat;