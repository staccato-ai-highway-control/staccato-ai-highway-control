"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface MediaLightboxProps {
  src: string;
  isVideo: boolean;
  alt?: string;
  onClose: () => void;
}

export function MediaLightbox({ src, isVideo, alt, onClose }: MediaLightboxProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="닫기"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/25"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={src}
            controls
            autoPlay
            className="w-full rounded-xl shadow-2xl"
            style={{ maxHeight: "85vh" }}
          />
        ) : (
          <img
            src={src}
            alt={alt ?? "미디어"}
            className="w-full rounded-xl object-contain shadow-2xl"
            style={{ maxHeight: "85vh" }}
          />
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
