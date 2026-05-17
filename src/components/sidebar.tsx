"use client";

import { useEffect, useCallback } from "react";

export interface KeyIdea {
  id: string;
  index: number;
  title: string;
  subtitle?: string;
}

interface SidebarProps {
  ideas: KeyIdea[];
  activeIndex: number;
  onSelect: (index: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ ideas, activeIndex, onSelect, mobileOpen, onMobileClose }: SidebarProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen && onMobileClose) {
        onMobileClose();
      }
    },
    [mobileOpen, onMobileClose]
  );

  useEffect(() => {
    if (mobileOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, handleKeyDown]);

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Key ideas"
        className={`
          bg-white border-r border-[#E2E8F0] flex flex-col overflow-hidden
          md:w-[380px] md:shrink-0 md:relative md:z-auto md:translate-x-0
          fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[380px]
          transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:transition-none
        `}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] md:hidden">
          <span className="text-sm font-semibold text-[#0F172A]">Key Ideas</span>
          <button
            onClick={onMobileClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <GlyphList
          ideas={ideas}
          activeIndex={activeIndex}
          onSelect={(i) => {
            onSelect(i);
            onMobileClose?.();
          }}
        />
      </nav>
    </>
  );
}

function GlyphList({
  ideas,
  activeIndex,
  onSelect,
}: {
  ideas: KeyIdea[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="flex-1 overflow-y-auto px-3 pt-3 pb-6 space-y-1 overscroll-contain">
      {ideas.map((idea, i) => (
        <GlyphListItem
          key={idea.id}
          idea={idea}
          isSelected={i === activeIndex}
          onSelect={() => onSelect(i)}
        />
      ))}
    </ol>
  );
}

function GlyphListItem({
  idea,
  isSelected,
  onSelect,
}: {
  idea: KeyIdea;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={isSelected ? "page" : undefined}
        className={`
          w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg transition-colors
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]
          ${
            isSelected
              ? "bg-[#2563EB] shadow-sm"
              : "hover:bg-[#F8FAFC]"
          }
        `}
      >
        <span
          className={`
            flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold shrink-0
            ${
              isSelected
                ? "bg-white/20 text-white"
                : "bg-[#F8FAFC] text-[#64748B]"
            }
          `}
        >
          {idea.index}
        </span>
        <span className="flex flex-col min-w-0 pt-1">
          <span
            className={`text-[15px] font-semibold leading-snug truncate ${
              isSelected ? "text-white" : "text-[#0F172A]"
            }`}
          >
            {idea.title}
          </span>
          {idea.subtitle && (
            <span
              className={`text-sm leading-snug truncate mt-0.5 ${
                isSelected ? "text-white/80" : "text-[#64748B]"
              }`}
            >
              {idea.subtitle}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
