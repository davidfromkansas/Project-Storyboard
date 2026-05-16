"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DeckSummary {
  id: string;
  title: string;
  sourceUrl: string;
  isPublished: boolean;
  shareId: string | null;
  publishedAt: string | null;
  createdAt: string;
  coverImage: string | null;
  coverTitle: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDecks() {
      const res = await fetch("/api/profile/decks");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
      setLoading(false);
    }
    fetchDecks();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-[#64748b]">Loading your decks...</p>
      </div>
    );
  }

  const publishedDecks = decks.filter((d) => d.isPublished);
  const draftDecks = decks.filter((d) => !d.isPublished);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-[#64748b] hover:text-[#1e293b] transition-colors text-sm sm:text-base"
            >
              ← Back
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-[#1e293b]">My Decks</h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-3 sm:px-4 py-2 bg-[#6366f1] text-white text-sm rounded-lg hover:bg-[#5558e6] transition-all font-medium"
          >
            + New Deck
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {decks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#94a3b8] text-lg mb-4">No decks yet</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-[#6366f1] text-white rounded-xl hover:bg-[#5558e6] transition-all font-medium"
            >
              Create your first deck
            </button>
          </div>
        ) : (
          <>
            {/* Published section */}
            {publishedDecks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[#1e293b] mb-4">
                  Published ({publishedDecks.length})
                </h2>
                <DeckGrid decks={publishedDecks} router={router} />
              </section>
            )}

            {/* Drafts section */}
            {draftDecks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[#1e293b] mb-4">
                  Drafts ({draftDecks.length})
                </h2>
                <DeckGrid decks={draftDecks} router={router} />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function DeckGrid({
  decks,
  router,
}: {
  decks: DeckSummary[];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {decks.map((deck) => (
        <button
          key={deck.id}
          onClick={() => router.push(`/deck/${deck.id}`)}
          className="text-left bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden hover:shadow-md hover:border-[#6366f1]/30 transition-all group"
        >
          {/* Cover image */}
          <div className="aspect-[3/2] bg-[#f1f5f9] overflow-hidden">
            {deck.coverImage ? (
              <img
                src={deck.coverImage}
                alt={deck.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-10 h-10 text-[#cbd5e1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#1e293b] line-clamp-2">
              {deck.title}
            </h3>
            <div className="flex items-center gap-2">
              {deck.isPublished && (
                <span className="text-xs px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] rounded-full font-medium">
                  Published
                </span>
              )}
              <span className="text-xs text-[#94a3b8]">
                {new Date(deck.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
