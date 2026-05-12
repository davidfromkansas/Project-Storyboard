"use client";

import { useState } from "react";

interface LandingPageProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const exampleUrls = [
  {
    label: "Paul Graham on startups",
    url: "https://paulgraham.com/startupideas.html",
  },
  {
    label: "Wait But Why on AI",
    url: "https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html",
  },
  {
    label: "Stripe's engineering blog",
    url: "https://stripe.com/blog/migrating-to-typescript",
  },
];

export function LandingPage({ user }: LandingPageProps) {
  const [url, setUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setIsGenerating(true);
    window.location.href = `/generate?url=${encodeURIComponent(url.trim())}`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="font-semibold text-[#1e293b]">SlideGen</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#64748b]">{user.email}</span>
          <button
            onClick={() => {
              fetch("/api/auth/signout", { method: "POST" }).then(() => {
                window.location.href = "/login";
              });
            }}
            className="text-sm text-[#94a3b8] hover:text-[#64748b] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center space-y-8">
          <div className="space-y-1">
            <span className="inline-block px-3 py-1 text-xs font-medium text-[#6366f1] bg-[#6366f1]/10 rounded-full">
              Powered by GPT-5.5 + gpt-image-2
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-[#1e293b] leading-tight">
            Turn Any Article into
            <br />
            <span className="text-[#6366f1]">Visual Infographics</span>
          </h1>

          <p className="text-lg text-[#64748b] max-w-lg mx-auto">
            Paste a URL and get 10-15 key insights extracted and visualized in
            whiteboard style. AI-powered, instant results.
          </p>

          {/* URL Input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="https://example.com/blog-post"
                className="w-full px-5 py-4 text-lg bg-white border border-[#e2e8f0] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] transition-all text-[#1e293b] placeholder:text-[#cbd5e1]"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!url.trim() || isGenerating}
              className="w-full py-4 bg-[#6366f1] text-white font-semibold rounded-xl hover:bg-[#5558e6] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-lg"
            >
              {isGenerating ? "Starting..." : "Generate Infographics"}
            </button>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-sm text-[#94a3b8]">Try:</span>
            {exampleUrls.map((example) => (
              <button
                key={example.url}
                onClick={() => setUrl(example.url)}
                className="text-sm px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-full text-[#64748b] hover:border-[#6366f1] hover:text-[#6366f1] transition-all"
              >
                {example.label} →
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-[#94a3b8]">
        Made with SlideGen
      </footer>
    </div>
  );
}
