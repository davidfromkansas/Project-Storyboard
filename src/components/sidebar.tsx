"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export interface KeyIdea {
  id: string;
  index: number;
  title: string;
  subtitle?: string;
}

export interface Guide {
  id: string;
  title: string;
  ideas: KeyIdea[];
}

interface SidebarProps {
  guide: Guide;
}

export function Sidebar({ guide }: SidebarProps) {
  const params = useParams();
  const activeId = params.ideaId as string | undefined;

  return (
    <nav
      aria-label="Key ideas"
      className="w-[380px] shrink-0 h-screen bg-white border-r border-[#e2e8f0] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 space-y-3">
        <Link
          href={`/guides/${guide.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors"
        >
          ← Back
        </Link>
        <h2
          className="text-[22px] leading-tight font-bold text-[#0F172A] line-clamp-3"
        >
          {guide.title}
        </h2>
      </div>

      {/* Glyph list */}
      <ol className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
        {guide.ideas.map((idea) => {
          const isSelected = idea.id === activeId;

          return (
            <li key={idea.id}>
              <Link
                href={`/guides/${guide.id}/ideas/${idea.id}`}
                aria-current={isSelected ? "page" : undefined}
                className={`flex items-start gap-3 rounded-lg px-3 py-3 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2 ${
                  isSelected
                    ? "bg-[#2563EB] shadow-sm"
                    : "hover:bg-[#F8FAFC]"
                }`}
              >
                {/* Number badge */}
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-[#F8FAFC] text-[#64748B]"
                  }`}
                >
                  {idea.index}
                </span>

                {/* Content */}
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      isSelected ? "text-white" : "text-[#0F172A]"
                    }`}
                  >
                    {idea.title}
                  </p>
                  {idea.subtitle && (
                    <p
                      className={`text-xs leading-relaxed mt-0.5 line-clamp-2 ${
                        isSelected ? "text-white/70" : "text-[#94A3B8]"
                      }`}
                    >
                      {idea.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
