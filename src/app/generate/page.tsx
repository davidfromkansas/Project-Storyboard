"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Progress {
  step: "extracting" | "analyzing" | "generating_images" | "complete" | "failed";
  current?: number;
  total?: number;
  details?: string;
  error?: string;
}

const STEP_LABELS: Record<string, string> = {
  extracting: "Extracting content...",
  analyzing: "Analyzing key insights...",
  generating_images: "Generating infographics...",
  complete: "Done!",
  failed: "Generation failed",
};

const FUN_MESSAGES_EXTRACTING = [
  "Reading the article carefully...",
  "Highlighting the good parts...",
  "Skimming for insights...",
  "Digesting the content...",
];

const FUN_MESSAGES_ANALYZING = [
  "Finding the aha moments...",
  "Connecting the dots...",
  "Distilling wisdom...",
  "Thinking like a professor...",
  "Identifying key patterns...",
  "Synthesizing the big ideas...",
];

const FUN_MESSAGES_GENERATING = [
  "Teaching the AI to draw...",
  "Sketching on the whiteboard...",
  "Adding stick figures...",
  "Drawing arrows and diagrams...",
  "Picking the perfect colors...",
  "Making abstract ideas visual...",
  "Doodling supporting ideas...",
  "Adding the finishing touches...",
  "Creating visual metaphors...",
  "Whiteboarding the concepts...",
];

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc] flex items-center justify-center"><p className="text-[#64748b]">Loading...</p></div>}>
      <GeneratePageInner />
    </Suspense>
  );
}

function GeneratePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");
  const force = searchParams.get("force") === "true";
  const [progress, setProgress] = useState<Progress>({ step: "extracting" });
  const [messageIndex, setMessageIndex] = useState(0);
  const started = useRef(false);

  function getMessagesForStep(step: string) {
    switch (step) {
      case "extracting": return FUN_MESSAGES_EXTRACTING;
      case "analyzing": return FUN_MESSAGES_ANALYZING;
      case "generating_images": return FUN_MESSAGES_GENERATING;
      default: return [];
    }
  }

  const messages = getMessagesForStep(progress.step);
  const funMessage = messages.length > 0 ? messages[messageIndex % messages.length] : "";

  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => i + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [progress.step, messages.length]);

  useEffect(() => {
    if (!url || started.current) return;
    started.current = true;

    let evtSource: EventSource | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 2000;

    function connectToStream(jobId: string) {
      evtSource = new EventSource(`/api/generate/${jobId}/stream`);

      evtSource.onmessage = (event) => {
        retryCount = 0; // Reset on successful message
        const data: Progress = JSON.parse(event.data);
        setProgress(data);

        if (data.step === "complete" && data.details) {
          evtSource?.close();
          setTimeout(() => router.push(`/deck/${data.details}`), 1000);
        }

        if (data.step === "failed") {
          evtSource?.close();
        }
      };

      evtSource.onerror = () => {
        evtSource?.close();
        setProgress((currentProgress) => {
          if (currentProgress.step === "complete" || currentProgress.step === "failed") {
            return currentProgress;
          }
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => connectToStream(jobId), RETRY_DELAY_MS);
            return currentProgress; // Keep showing current step while reconnecting
          }
          return { step: "failed", error: "Connection lost. Please try again." };
        });
      };
    }

    async function generate() {
      // Step 1: Create job
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        setProgress({ step: "failed", error: data.error || "Failed to start generation" });
        return;
      }

      const { jobId } = await res.json();

      // Step 2: Connect to SSE stream with auto-reconnect
      connectToStream(jobId);
    }

    generate();

    return () => {
      evtSource?.close();
    };
  }, [url, router]);

  const stepIndex = ["extracting", "analyzing", "generating_images", "complete"].indexOf(progress.step);
  const progressPercent =
    progress.step === "generating_images" && progress.total
      ? 40 + (progress.current! / progress.total) * 50
      : progress.step === "complete"
      ? 100
      : stepIndex >= 0
      ? stepIndex * 30 + 10
      : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#1e293b]">Glyph</span>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1e293b]">
            {progress.step === "failed" ? "Something went wrong" : "Creating your deck"}
          </h2>

          {progress.step !== "failed" && (
            <>
              {/* Progress bar */}
              <div className="w-full bg-[#e2e8f0] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] h-3 rounded-full transition-all duration-700 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              {/* Step indicator */}
              <p className="text-[#1e293b] text-lg font-medium">
                {progress.step === "generating_images" && progress.current && progress.total
                  ? `Generating infographic ${progress.current} of ${progress.total}`
                  : STEP_LABELS[progress.step] || "Processing..."}
              </p>

              {/* Fun rotating message */}
              {funMessage && (
                <p className="text-[#64748b] text-sm italic transition-opacity duration-500">
                  {funMessage}
                </p>
              )}

              {/* Steps list */}
              <div className="mt-6 text-left space-y-3">
                {["extracting", "analyzing", "generating_images"].map((step, i) => {
                  const isActive = progress.step === step;
                  const isDone = stepIndex > i;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone
                            ? "bg-[#6366f1] text-white"
                            : isActive
                            ? "bg-[#6366f1]/20 text-[#6366f1] border-2 border-[#6366f1]"
                            : "bg-[#e2e8f0] text-[#94a3b8]"
                        }`}
                      >
                        {isDone ? "✓" : i + 1}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone || isActive ? "text-[#1e293b] font-medium" : "text-[#94a3b8]"
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {progress.step === "failed" && (
            <div className="space-y-4">
              <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
                {progress.error || "An unknown error occurred"}
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-[#6366f1] text-white rounded-xl hover:bg-[#5558e6] transition-all font-medium"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* URL being processed */}
        {url && progress.step !== "failed" && (
          <p className="text-xs text-[#94a3b8] truncate max-w-full">
            Processing: {url}
          </p>
        )}
      </div>
    </div>
  );
}
