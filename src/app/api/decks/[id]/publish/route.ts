import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
  if (deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shareId = deck.shareId || nanoid(10);

  const updated = await prisma.deck.update({
    where: { id },
    data: {
      isPublished: true,
      publishedAt: new Date(),
      shareId,
    },
  });

  return NextResponse.json({
    shareId: updated.shareId,
    shareUrl: `/s/${updated.shareId}`,
  });
}
