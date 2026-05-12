import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

function fixRequestUrl(request: NextRequest): NextRequest {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (!forwardedHost) return request;

  const url = request.nextUrl.clone();
  url.host = forwardedHost;
  url.port = "";
  if (forwardedProto) {
    url.protocol = forwardedProto + ":";
  }

  return new NextRequest(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}

export async function GET(request: NextRequest) {
  return handlers.GET(fixRequestUrl(request));
}

export async function POST(request: NextRequest) {
  return handlers.POST(fixRequestUrl(request));
}
