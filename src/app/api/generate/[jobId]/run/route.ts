import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Atomically claim the job — only one invocation can proceed
  const updated = await prisma.generationJob.updateMany({
    where: { id: jobId, status: "queued" },
    data: { status: "starting" },
  });

  if (updated.count === 0) {
    return new Response("Job already started or not found", { status: 409 });
  }

  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: job.userId },
  });

  if (!user) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", error: "User not found" },
    });
    return new Response("User not found", { status: 404 });
  }

  // Run pipeline — progress is persisted to DB by the pipeline itself
  await runPipeline(job.sourceUrl, user.id, jobId, () => {});

  return new Response("OK", { status: 200 });
}
