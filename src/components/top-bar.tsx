"use client";

import { RefObject } from "react";
import Link from "next/link";

interface TopBarProps {
  title: string;
  currentIndex: number;
  totalIdeas: number;
  shareUrl: string | null;
  publishing: boolean;
  copied: boolean;
  onPublish: () => void;
  onCopy: () => void;
  onOpenOriginalContent: () => void;
  originalContentButtonRef: RefObject<HTMLButtonElement | null>;
}

export function TopBar({
  title,
  currentIndex,
  totalIdeas,
  shareUrl,
  publishing,
  copied,
  onPublish,
  onCopy,
  onOpenOriginalContent,
  originalContentButtonRef,
}: TopBarProps) {
  return (
    <header className="w-full bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-4">
      {/* Left cluster */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link
          href={`/`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors shrink-0 h-8 px-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          <span aria-hidden="true">&larr;</span> Back
        </Link>
        <h1 className="text-[16px] leading-[22px] font-semibold text-[#0F172A] min-w-0">
          {title}
        </h1>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm text-[#94A3B8] font-normal tabular-nums px-2">
          {currentIndex} / {totalIdeas}
        </span>

        <button
          ref={originalContentButtonRef}
          onClick={onOpenOriginalContent}
          className="h-8 px-3 text-sm font-medium text-[#1F2937] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          Original content
        </button>

        {shareUrl ? (
          <button
            onClick={onCopy}
            className="h-8 px-3 text-sm font-medium text-[#1F2937] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        ) : (
          <button
            disabled
            className="h-8 px-3 text-sm font-medium text-[#1F2937] bg-white border border-[#E2E8F0] rounded-lg opacity-50 cursor-not-allowed"
          >
            Share
          </button>
        )}

        {shareUrl ? (
          <button
            onClick={onCopy}
            className="h-8 px-3 text-sm font-medium text-white bg-[#6366F1] rounded-lg hover:bg-[#5558E6] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            {copied ? "Copied!" : "Publish"}
          </button>
        ) : (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="h-8 px-3 text-sm font-medium text-white bg-[#6366F1] rounded-lg hover:bg-[#5558E6] transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        )}
      </div>
    </header>
  );
}
