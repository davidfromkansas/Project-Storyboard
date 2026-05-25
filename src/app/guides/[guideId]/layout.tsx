"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar, type Guide } from "@/components/guides/sidebar";

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const guideId = params.guideId as string;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuide() {
      try {
        const res = await fetch(`/api/decks/${guideId}`);
        if (!res.ok) {
          setError("Failed to load guide");
          setLoading(false);
          return;
        }
        const deck = await res.json();
        const mapped: Guide = {
          id: deck.id,
          title: deck.title,
          ideas: (deck.slides || [])
            .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
            .map((slide: { id: string; position: number; mainIdea: string; summary: string }) => ({
              id: slide.id,
              index: slide.position + 1,
              title: slide.mainIdea,
              subtitle: slide.summary,
            })),
        };
        setGuide(mapped);
      } catch {
        setError("Failed to load guide");
      } finally {
        setLoading(false);
      }
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar guide={guide} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
