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

function BackLink({ guideId }: { guideId: string }) {
  return (
    <Link
      href={`/guides/${guideId}`}
      className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
    >
      <span aria-hidden="true">&larr;</span> Back
    </Link>
  );
}

function ArticleTitle({ title }: { title: string }) {
  return (
    <h1
      className="mt-3 text-[22px] leading-tight font-bold text-[#0F172A] line-clamp-3"
    >
      {title}
    </h1>
  );
}

function GlyphListItemNumber({
  num,
  selected,
}: {
  num: number;
  selected: boolean;
}) {
  return (
    <span
      className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold ${
        selected
          ? "bg-white/20 text-white"
          : "bg-[#F1F5F9] text-[#0F172A]"
      }`}
    >
      {num}
    </span>
  );
}

function GlyphListItem({
  idea,
  guideId,
  selected,
}: {
  idea: KeyIdea;
  guideId: string;
  selected: boolean;
}) {
  return (
    <li>
      <Link
        href={`/guides/${guideId}/ideas/${idea.id}`}
        aria-current={selected ? "page" : undefined}
        className={`flex items-start gap-3 rounded-lg px-3 py-3 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
          selected
            ? "bg-[#2563EB] shadow-md"
            : "hover:bg-[#F8FAFC]"
        }`}
      >
        <GlyphListItemNumber num={idea.index} selected={selected} />
        <div className="min-w-0 pt-0.5">
          <p
            className={`text-sm font-semibold leading-snug ${
              selected ? "text-white" : "text-[#0F172A]"
            }`}
          >
            {idea.title}
          </p>
          {idea.subtitle && (
            <p
              className={`mt-0.5 text-sm leading-snug ${
                selected ? "text-white/80" : "text-[#64748B]"
              }`}
            >
              {idea.subtitle}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export function Sidebar({ guide }: { guide: Guide }) {
  const params = useParams();
  const activeId = params.ideaId as string | undefined;

  return (
    <nav
      aria-label="Key ideas"
      className="w-[380px] flex-shrink-0 h-screen sticky top-0 bg-white border-r border-[#E2E8F0] flex flex-col overflow-hidden"
    >
      {/* Sidebar.Header */}
      <div className="px-6 pt-6 pb-4">
        <BackLink guideId={guide.id} />
        <ArticleTitle title={guide.title} />
      </div>

      {/* GlyphList */}
      <ol className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
        {guide.ideas.map((idea) => (
          <GlyphListItem
            key={idea.id}
            idea={idea}
            guideId={guide.id}
            selected={idea.id === activeId}
          />
        ))}
      </ol>
    </nav>
  );
}
