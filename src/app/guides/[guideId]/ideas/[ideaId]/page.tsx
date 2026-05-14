"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar, type Guide } from "@/components/sidebar";

export default function KeyIdeaViewPage() {
  const params = useParams();
  const guideId = params.guideId as string;
  const ideaId = params.ideaId as string;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuide() {
      const res = await fetch(`/api/decks/${guideId}`);
      if (!res.ok) {
        setError("Failed to load guide");
        setLoading(false);
        return;
      }
      const deck = await res.json();
      setGuide({
        id: deck.id,
        title: deck.title,
        ideas: deck.slides
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          .map((slide: { id: string; position: number; mainIdea: string; summary: string }) => ({
            id: slide.id,
            index: slide.position + 1,
            title: slide.mainIdea,
            subtitle: slide.summary,
          })),
      });
      setLoading(false);
    }
    fetchGuide();
  }, [guideId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[#64748B] text-lg">Loading guide...</p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || "Guide not found"}</p>
      </div>
    );
  }

  const activeIdea = guide.ideas.find((idea) => idea.id === ideaId);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar guide={guide} />

      {/* Main content placeholder — implemented in a separate ticket */}
      <main className="flex-1 flex items-center justify-center p-8">
        {activeIdea ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-[#94A3B8]">Key Idea {activeIdea.index}</p>
            <h1 className="text-2xl font-bold text-[#0F172A]">{activeIdea.title}</h1>
            {activeIdea.subtitle && (
              <p className="text-[#1F2937] max-w-lg">{activeIdea.subtitle}</p>
            )}
          </div>
        ) : (
          <p className="text-[#94A3B8]">Idea not found</p>
        )}
      </main>
    </div>
  );
}
