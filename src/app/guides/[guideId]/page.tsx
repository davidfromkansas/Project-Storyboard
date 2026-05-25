"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GuideOverview() {
  const params = useParams();
  const router = useRouter();
  const guideId = params.guideId as string;

  useEffect(() => {
    async function redirectToFirstIdea() {
      try {
        const res = await fetch(`/api/decks/${guideId}`);
        if (!res.ok) return;
        const deck = await res.json();
        const slides = (deck.slides || []).sort(
          (a: { position: number }, b: { position: number }) => a.position - b.position
        );
        if (slides.length > 0) {
          router.replace(`/guides/${guideId}/ideas/${slides[0].id}`);
        }
      } catch {
        // stay on page if fetch fails
      }
    }
    redirectToFirstIdea();
  }, [guideId, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[#94A3B8]">Loading...</p>
    </div>
  );
}
