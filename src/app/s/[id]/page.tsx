"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Slide {
  id: string;
  position: number;
  mainIdea: string;
  summary: string;
  supportingIdeas: Array<{ Idea: string; Details: string; "Key Quotes"?: Array<{ text: string; context: string }> }>;
  infographicPrompt: string;
  imageUrl: string | null;
  imageStatus: string;
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current || !deck) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) {
      setCurrentSlide((c) => Math.min(c + 1, deck.slides.length - 1));
    } else {
      setCurrentSlide((c) => Math.max(c - 1, 0));
    }
  }

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
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-white border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1e293b] hidden sm:inline">Glyph</span>
          </div>
          <span className="text-[#cbd5e1] hidden sm:inline">|</span>
          <h1 className="text-xs sm:text-sm font-medium text-[#475569] truncate">
            {deck.title}
          </h1>
        </div>
        <div className="text-xs sm:text-sm text-[#94a3b8] shrink-0">
          {currentSlide + 1} / {deck.slides.length}
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-4xl">
          {/* Image */}
          <div className="relative bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden aspect-[4/3] sm:aspect-[3/2] mb-3 sm:mb-4">
            {slide?.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.mainIdea}
                className="w-full h-full object-contain"
              />
            ) : slide?.imageStatus === "failed" ? (
              <div className="w-full h-full flex items-center justify-center text-[#ef4444]">
                <div className="text-center space-y-2">
                  <svg className="w-12 h-12 mx-auto opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm font-medium">Image generation failed</p>
                </div>
              </div>
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
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-4 sm:p-6 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1e293b]">{slide?.mainIdea}</h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">{slide?.summary}</p>

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
                    {si["Key Quotes"] && si["Key Quotes"].length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {si["Key Quotes"].map((q, qi) => (
                          <blockquote key={qi} className="border-l-2 border-[#6366f1]/30 pl-3 py-0.5">
                            <p className="text-xs text-[#475569] italic">"{q.text}"</p>
                            {q.context && <p className="text-xs text-[#94a3b8] mt-0.5">{q.context}</p>}
                          </blockquote>
                        ))}
                      </div>
                    )}
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
            Glyph
          </Link>
        </p>
      </footer>
    </div>
  );
}
