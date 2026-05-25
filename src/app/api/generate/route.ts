import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // Check spending cap
  const result = await prisma.costLedger.aggregate({
    _sum: { estimatedCost: true },
  });
  const totalSpend = Number(result._sum.estimatedCost ?? 0);
  if (totalSpend >= 100.0) {
    return NextResponse.json(
      { error: "Global spending cap reached ($100). No more generations allowed." },
      { status: 429 }
    );
  }

  // Find or create user in DB
  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
    });
  }

  // Create generation job
  const job = await prisma.generationJob.create({
    data: {
      userId: user.id,
      sourceUrl: url,
      status: "queued",
    },
  });

  return NextResponse.json({ jobId: job.id });
}
