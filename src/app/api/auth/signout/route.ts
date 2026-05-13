import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  return NextResponse.redirect(new URL("/login", process.env.AUTH_URL!));
}
