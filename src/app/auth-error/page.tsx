"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 space-y-4">
        <h1 className="text-xl font-bold text-red-600">Authentication Error</h1>
        <div className="space-y-2">
          <p className="text-sm text-[#64748b]">Error code:</p>
          <code className="block bg-[#f1f5f9] p-3 rounded-lg text-sm text-[#1e293b] font-mono">
            {error || "Unknown"}
          </code>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[#64748b]">What this means:</p>
          <ul className="text-sm text-[#1e293b] space-y-1 list-disc list-inside">
            {error === "Configuration" && (
              <>
                <li>The OAuth provider returned an error during token exchange</li>
                <li>Possible: PKCE verification failed (state/code_verifier cookie lost)</li>
                <li>Possible: Client secret is incorrect</li>
                <li>Possible: Database adapter error during user/account creation</li>
              </>
            )}
            {error === "OAuthCallback" && (
              <li>Error during OAuth callback processing</li>
            )}
            {error === "OAuthSignin" && (
              <li>Error constructing the OAuth authorization URL</li>
            )}
          </ul>
        </div>
        <div className="pt-2">
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm hover:bg-[#5558e6]"
          >
            Try again
          </a>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Full URL: {typeof window !== "undefined" ? window.location.href : ""}
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
