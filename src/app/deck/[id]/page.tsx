"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar, KeyIdea } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { OriginalContentDrawer } from "@/components/original-content-drawer";

interface Slide {
  id: string;
  position: number;
  mainIdea: string;
  summary: string;
  supportingIdeas: Array<{ Idea: string; Details: string }>;
  infographicPrompt: string;
  imageUrl: string | null;
  imageStatus: string;
}

interface ExaRaw {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  text: string;
}

interface Deck {
  id: string;
  title: string;
  sourceUrl: string;
  quality: string;
  createdAt: string;
  isPublished: boolean;
  shareId: string | null;
  exaRaw: ExaRaw | null;
  slides: Slide[];
}

export default function DeckViewer() {
  const params = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const originalContentButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    async function fetchDeck() {
      const res = await fetch(`/api/decks/${params.id}`);
      if (!res.ok) {
        setError("Failed to load deck");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDeck(data);
      if (data.isPublished && data.shareId) {
        setShareUrl(`${window.location.origin}/s/${data.shareId}`);
      }
      setLoading(false);
    }
    fetchDeck();
  }, [params.id]);

  async function handlePublish() {
    if (!deck) return;
    setPublishing(true);
    const res = await fetch(`/api/decks/${deck.id}/publish`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const url = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(url);
      setDeck({ ...deck, isPublished: true, shareId: data.shareId });
    }
    setPublishing(false);
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (drawerOpen || sidebarOpen) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentSlide((c) => Math.min(c + 1, (deck?.slides.length || 1) - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentSlide((c) => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [deck, drawerOpen, sidebarOpen]);

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
        <button onClick={() => router.push("/")} className="text-[#6366f1] underline">
          Go home
        </button>
      </div>
    );
  }

  const slide = deck.slides[currentSlide];

  const ideas: KeyIdea[] = deck.slides.map((s, i) => ({
    id: s.id,
    index: i + 1,
    title: s.mainIdea,
    subtitle: s.summary,
  }));

  const exaRaw = deck.exaRaw;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      {/* TopBar — full width, above everything */}
      <TopBar
        title={deck.title}
        currentIndex={currentSlide + 1}
        totalIdeas={deck.slides.length}
        shareUrl={shareUrl}
        publishing={publishing}
        copied={copied}
        onPublish={handlePublish}
        onCopy={handleCopy}
        onOpenOriginalContent={() => setDrawerOpen(true)}
        originalContentButtonRef={originalContentButtonRef}
        onToggleSidebar={() => setSidebarOpen(true)}
      />

      {/* Body: Sidebar + Main content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          ideas={ideas}
          activeIndex={currentSlide}
          onSelect={setCurrentSlide}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main
          className="flex-1 flex flex-col items-center p-2 sm:p-4 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full max-w-4xl my-auto">
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
                    <p className="text-xs text-[#94a3b8]">This image could not be generated after multiple attempts</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#94a3b8]">
                  <div className="text-center space-y-2">
                    <svg className="w-12 h-12 mx-auto opacity-50 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Image generating...</p>
                  </div>
                </div>
              )}

              {/* Navigation arrows */}
              {currentSlide > 0 && (
                <button
                  onClick={() => setCurrentSlide((c) => c - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-all"
                >
                  &#9668;
                </button>
              )}
              {currentSlide < deck.slides.length - 1 && (
                <button
                  onClick={() => setCurrentSlide((c) => c + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-all"
                >
                  &#9658;
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
      </div>

      {/* Original content drawer */}
      <OriginalContentDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sourceUrl={deck.sourceUrl}
        extractedTitle={exaRaw?.title ?? ""}
        extractedBody={exaRaw?.text ?? ""}
        triggerRef={originalContentButtonRef}
      />
    </div>
  );
}
