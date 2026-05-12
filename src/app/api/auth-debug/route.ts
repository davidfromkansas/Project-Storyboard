import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Show diagnostic info
  const info = {
    env: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET (" + process.env.GOOGLE_CLIENT_ID.substring(0, 10) + "...)" : "MISSING",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ", ends: ..." + process.env.GOOGLE_CLIENT_SECRET.slice(-4) + ")" : "MISSING",
      AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "MISSING",
      AUTH_URL: process.env.AUTH_URL || "NOT SET",
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "NOT SET",
    },
    expectedRedirectUri: (process.env.AUTH_URL || "https://project-storyboard-production.up.railway.app") + "/api/auth/callback/google",
    requestUrl: request.url,
    headers: {
      host: request.headers.get("host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
    },
  };

  // If a code was passed, try to exchange it directly with Google
  if (code) {
    const redirectUri = (process.env.AUTH_URL || "https://project-storyboard-production.up.railway.app") + "/api/auth/callback/google";
    
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();
      
      return NextResponse.json({
        ...info,
        tokenExchange: {
          status: tokenResponse.status,
          redirectUriUsed: redirectUri,
          response: tokenResponse.ok 
            ? { success: true, hasAccessToken: !!tokenData.access_token, hasIdToken: !!tokenData.id_token }
            : tokenData, // Show the error from Google
        },
      });
    } catch (e: unknown) {
      const err = e as Error;
      return NextResponse.json({
        ...info,
        tokenExchange: { error: err.message },
      });
    }
  }

  return NextResponse.json(info);
}
