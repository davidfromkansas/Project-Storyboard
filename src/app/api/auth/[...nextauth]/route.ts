import { handlers } from "@/lib/auth";

function fixRequestUrl(request: Request): Request {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    url.host = forwardedHost;
    url.port = "";
  }
  if (forwardedProto) {
    url.protocol = forwardedProto + ":";
  }

  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
  });
}

export async function GET(request: Request) {
  return handlers.GET(fixRequestUrl(request));
}

export async function POST(request: Request) {
  return handlers.POST(fixRequestUrl(request));
}
