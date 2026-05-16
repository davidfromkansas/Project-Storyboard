"use client";

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
}

export function Sidebar({ ideas, activeIndex, onSelect }: SidebarProps) {
  return (
    <nav
      aria-label="Key ideas"
      className="w-[380px] shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col overflow-hidden"
    >
      <GlyphList ideas={ideas} activeIndex={activeIndex} onSelect={onSelect} />
    </nav>
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
    <ol className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
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
