"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Slide {
  id: string;
  position: number;
  mainIdea: string;
  summary: string;
  supportingIdeas: Array<{ Idea: string; Details: string }>;
  infographicPrompt: string;
  imageUrl: string | null;
}

interface Deck {
  id: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  slides: Slide[];
  user: { name: string | null };
}

export default function SharePage() {
  const params = useParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    async function fetchDeck() {
      const res = await fetch(`/api/share/${params.id}`);
      if (!res.ok) {
        setError("Deck not found or not published");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDeck(data);
      setLoading(false);
    }
    fetchDeck();
  }, [params.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentSlide((c) => Math.min(c + 1, (deck?.slides.length || 1) - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentSlide((c) => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [deck]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-[#64748b] text-lg">Loading deck...</p>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || "Deck not found"}</p>
      </div>
    );
  }

  const slide = deck.slides[currentSlide];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1e293b]">SlideGen</span>
          </div>
          <span className="text-[#cbd5e1]">|</span>
          <h1 className="text-sm font-medium text-[#475569] truncate max-w-[250px]">
            {deck.title}
          </h1>
        </div>
        <div className="text-sm text-[#94a3b8]">
          {currentSlide + 1} / {deck.slides.length}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Image */}
          <div className="relative bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden aspect-[3/2] mb-4">
            {slide?.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.mainIdea}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#94a3b8]">
                <p className="text-sm">Image not available</p>
              </div>
            )}

            {/* Navigation arrows */}
            {currentSlide > 0 && (
              <button
                onClick={() => setCurrentSlide((c) => c - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-all"
              >
                ◄
              </button>
            )}
            {currentSlide < deck.slides.length - 1 && (
              <button
                onClick={() => setCurrentSlide((c) => c + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-all"
              >
                ►
              </button>
            )}
          </div>

          {/* Text panel */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 space-y-3">
            <h2 className="text-xl font-bold text-[#1e293b]">{slide?.mainIdea}</h2>
            <p className="text-[#475569] leading-relaxed">{slide?.summary}</p>

            {/* Supporting Ideas (collapsible) */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-[#6366f1] hover:underline"
            >
              {showDetails ? "Hide" : "Show"} supporting ideas ({slide?.supportingIdeas?.length || 0})
            </button>

            {showDetails && slide?.supportingIdeas && (
              <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
                {slide.supportingIdeas.map((si, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-semibold text-[#1e293b]">{si.Idea}</p>
                    <p className="text-sm text-[#64748b]">{si.Details}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Infographic Prompt (collapsible) */}
            {slide?.infographicPrompt && (
              <>
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="text-sm text-[#8b5cf6] hover:underline"
                >
                  {showPrompt ? "Hide" : "Show"} infographic prompt
                </button>

                {showPrompt && (
                  <div className="pt-2 border-t border-[#e2e8f0]">
                    <pre className="text-xs text-[#64748b] whitespace-pre-wrap font-mono bg-[#f1f5f9] rounded-lg p-3 max-h-48 overflow-y-auto">
                      {slide.infographicPrompt}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dots navigation */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {deck.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentSlide ? "bg-[#6366f1] scale-125" : "bg-[#cbd5e1] hover:bg-[#94a3b8]"
                }`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-[#e2e8f0]">
        <p className="text-xs text-[#94a3b8]">
          {deck.user?.name && <span>By {deck.user.name} · </span>}
          Made with{" "}
          <Link href="/" className="text-[#6366f1] hover:underline">
            SlideGen
          </Link>
        </p>
      </footer>
    </div>
  );
}
