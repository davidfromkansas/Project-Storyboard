import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getGoogleUserInfo, createSessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[auth] Google returned error:", error);
    return NextResponse.redirect(new URL("/login?error=google_denied", process.env.AUTH_URL!));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_params", process.env.AUTH_URL!));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  if (!savedState || savedState !== state) {
    console.error("[auth] State mismatch:", { savedState: savedState?.slice(0, 8), state: state.slice(0, 8) });
    return NextResponse.redirect(new URL("/login?error=state_mismatch", process.env.AUTH_URL!));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    const sessionToken = await createSessionToken({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture || null,
    });

    cookieStore.delete("oauth_state");
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.redirect(new URL("/", process.env.AUTH_URL!));
  } catch (err) {
    console.error("[auth] Token exchange error:", err);
    return NextResponse.redirect(new URL("/login?error=token_exchange", process.env.AUTH_URL!));
  }
}
