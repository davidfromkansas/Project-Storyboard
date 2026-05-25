import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deck = await prisma.deck.findFirst({
    where: {
      shareId: id,
      isPublished: true,
    },
    include: {
      slides: {
        orderBy: { position: "asc" },
      },
      user: {
        select: { name: true, image: true },
      },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: "Deck not found or not published" }, { status: 404 });
  }

  return NextResponse.json({
    id: deck.id,
    title: deck.title,
    sourceUrl: deck.sourceUrl,
    createdAt: deck.createdAt,
    publishedAt: deck.publishedAt,
    user: deck.user,
    slides: deck.slides.map((s) => ({
      id: s.id,
      position: s.position,
      mainIdea: s.mainIdea,
      summary: s.summary,
      supportingIdeas: s.supportingIdeas,
      infographicPrompt: s.infographicPrompt,
      imageUrl: s.imageUrl,
      imageStatus: s.imageStatus,
    })),
  });
}
