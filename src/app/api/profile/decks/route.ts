import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      slides: {
        where: { position: 0 },
        select: { imageUrl: true, mainIdea: true },
      },
    },
  });

  return NextResponse.json(
    decks.map((d) => ({
      id: d.id,
      title: d.title,
      sourceUrl: d.sourceUrl,
      isPublished: d.isPublished,
      shareId: d.shareId,
      publishedAt: d.publishedAt,
      createdAt: d.createdAt,
      slideCount: 0,
      coverImage: d.slides[0]?.imageUrl || null,
      coverTitle: d.slides[0]?.mainIdea || null,
    }))
  );
}
