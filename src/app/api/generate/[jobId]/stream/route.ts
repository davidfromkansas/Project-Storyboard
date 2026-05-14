import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runPipeline, PipelineProgress } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

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

  // If job already complete or failed, return current state
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

  // Start SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (progress: PipelineProgress) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
          );
          if (progress.step === "complete" || progress.step === "failed") {
            controller.close();
          }
        } catch {
          // Stream may be closed
        }
      };

      // Find user and start pipeline
      prisma.user
        .findUnique({ where: { email: session.user.email } })
        .then((user) => {
          if (!user) {
            send({ step: "failed", error: "User not found" });
            return;
          }
          runPipeline(job.sourceUrl, user.id, jobId, send);
        })
        .catch((err) => {
          send({ step: "failed", error: err.message });
        });
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
