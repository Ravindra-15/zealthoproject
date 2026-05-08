// src/components/common/AppToaster.jsx
// Zealtho - Global Toast Renderer
// Responsive position, swipe-to-dismiss, auto-dismiss working
// Mounted once at app root - lives outside providers

import React, { useState, useEffect } from "react";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const AppToaster = () => {
  const [position, setPosition] = useState("top-right");

  useEffect(() => {
    const updatePosition = () => {
      const mobile = window.innerWidth < 640;
      setPosition(mobile ? "top-center" : "top-right");
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <Toaster
      position={position}
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        top: 20,
      }}
      toastOptions={{
        duration: 3000,
        style: {
          padding: "12px 16px",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: "500",
          lineHeight: "1.4",
          maxWidth: "380px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
        },
        success: {
          duration: 3000,
          style: {
            background: "#f0fdfa",
            color: "#134e4a",
            border: "1px solid #99f6e4",
          },
          iconTheme: {
            primary: "#0d9488",
            secondary: "#fff",
          },
        },
        error: {
          duration: 4000,
          style: {
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
        loading: {
          style: {
            background: "#fff7ed",
            color: "#9a3412",
            border: "1px solid #fed7aa",
          },
          iconTheme: {
            primary: "#f97316",
            secondary: "#fff",
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <motion.div
              drag={t.type !== "loading" ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100 || info.velocity.x > 500) {
                  toast.dismiss(t.id);
                }
              }}
              whileDrag={{ cursor: "grabbing" }}
              style={{
                cursor: t.type !== "loading" ? "grab" : "default",
                touchAction: "pan-y",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {icon}
              <div style={{ flex: 1 }}>{message}</div>
              {t.type !== "loading" && (
                <button
                  onClick={() => toast.dismiss(t.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="ml-2 p-1 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
                  aria-label="Close notification"
                >
                  <X
                    size={16}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
            </motion.div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

export default AppToaster;