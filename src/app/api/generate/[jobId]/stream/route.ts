import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PipelineProgress } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLL_INTERVAL_MS = 1500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { jobId } = await params;

  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  // If job is queued, trigger the pipeline run via internal API
  if (job.status === "queued") {
    const baseUrl = getBaseUrl(request);
    triggerPipelineRun(baseUrl, jobId);
  }

  // If job already complete or failed, return current state immediately
  if (job.status === "complete" || job.status === "failed") {
    const encoder = new TextEncoder();
    const body = encoder.encode(
      `data: ${JSON.stringify({
        step: job.status,
        details: job.status === "complete" ? job.deckId : job.error,
        error: job.error,
      })}\n\n`
    );
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Poll DB for progress updates and stream them as SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastProgressJson = "";
      let closed = false;

      const poll = async () => {
        if (closed) return;

        try {
          const currentJob = await prisma.generationJob.findUnique({
            where: { id: jobId },
          });

          if (!currentJob) {
            sendEvent(controller, encoder, { step: "failed", error: "Job not found" });
            controller.close();
            closed = true;
            return;
          }

          // Build progress from DB state
          const progress: PipelineProgress = (currentJob.progress as unknown as PipelineProgress) || {
            step: currentJob.status as PipelineProgress["step"],
            error: currentJob.error ?? undefined,
            details: currentJob.status === "complete" ? currentJob.deckId ?? undefined : undefined,
          };

          const progressJson = JSON.stringify(progress);

          // Only send if progress has changed
          if (progressJson !== lastProgressJson) {
            lastProgressJson = progressJson;
            sendEvent(controller, encoder, progress);
          }

          // Check if terminal state
          if (currentJob.status === "complete" || currentJob.status === "failed") {
            // Send final state if not already sent
            const finalProgress: PipelineProgress = {
              step: currentJob.status as "complete" | "failed",
              details: currentJob.status === "complete" ? (currentJob.deckId ?? undefined) : undefined,
              error: currentJob.error ?? undefined,
            };
            const finalJson = JSON.stringify(finalProgress);
            if (finalJson !== lastProgressJson) {
              sendEvent(controller, encoder, finalProgress);
            }
            controller.close();
            closed = true;
            return;
          }

          // Send keep-alive comment to prevent connection timeout
          try {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          } catch {
            closed = true;
            return;
          }

          // Schedule next poll
          setTimeout(poll, POLL_INTERVAL_MS);
        } catch {
          if (!closed) {
            try {
              controller.close();
            } catch {
              // Already closed
            }
            closed = true;
          }
        }
      };

      // Start polling
      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  progress: PipelineProgress
) {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  } catch {
    // Stream may be closed
  }
}

function getBaseUrl(request: NextRequest): string {
  // Use the request's origin for the internal API call
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

function triggerPipelineRun(baseUrl: string, jobId: string) {
  // Fire-and-forget: trigger the pipeline run endpoint
  // This creates a separate serverless function invocation on Vercel
  fetch(`${baseUrl}/api/generate/${jobId}/run`, {
    method: "POST",
  }).catch((err) => {
    console.error("[stream] Failed to trigger pipeline run:", err);
  });
}
