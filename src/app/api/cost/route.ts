import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GLOBAL_SPENDING_CAP = 10.0; // $10 USD

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.costLedger.aggregate({
    _sum: {
      estimatedCost: true,
    },
  });

  const totalSpend = Number(result._sum.estimatedCost ?? 0);
  const remaining = Math.max(0, GLOBAL_SPENDING_CAP - totalSpend);
  const capReached = totalSpend >= GLOBAL_SPENDING_CAP;

  return NextResponse.json({
    totalSpend: Math.round(totalSpend * 100) / 100,
    cap: GLOBAL_SPENDING_CAP,
    remaining: Math.round(remaining * 100) / 100,
    capReached,
  });
}
