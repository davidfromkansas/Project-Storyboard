import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/share/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session_token")?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
