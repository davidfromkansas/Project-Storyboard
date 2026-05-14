import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleAuthUrl, generateState } from "@/lib/auth";

export async function GET() {
  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = getGoogleAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
