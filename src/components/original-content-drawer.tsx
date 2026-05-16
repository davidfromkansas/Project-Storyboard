"use client";

import { useEffect, useRef, useCallback } from "react";

interface OriginalContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl: string;
  extractedTitle: string;
  extractedBody: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export function OriginalContentDrawer({
  isOpen,
  onClose,
  sourceUrl,
  extractedTitle,
  extractedBody,
  triggerRef,
}: OriginalContentDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus the close button when drawer opens
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Return focus to trigger when closing
  useEffect(() => {
    if (!isOpen) {
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-slate-900/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        aria-label="Original content"
        className="fixed top-0 right-0 h-full w-[480px] max-w-full bg-white border-l border-[#E2E8F0] shadow-[-4px_0_24px_rgba(0,0,0,0.08)] z-50 flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <h2 className="text-base font-semibold text-[#0F172A]">
            Original content
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Source URL */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-2">
            Source URL
          </p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener"
            className="text-sm text-[#2563EB] hover:underline break-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] rounded"
          >
            {sourceUrl}
          </a>
        </div>

        {/* Extracted content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">
            Extracted by Exa
          </p>
          {extractedTitle && (
            <h3 className="text-base font-semibold text-[#0F172A] mb-3">
              {extractedTitle}
            </h3>
          )}
          <div className="text-sm leading-relaxed text-[#1F2937] whitespace-pre-line">
            {extractedBody}
          </div>
        </div>
      </aside>
    </>
  );
}
