"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GuideOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const guideId = params.guideId as string;

  useEffect(() => {
    router.replace(`/deck/${guideId}`);
  }, [guideId, router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <p className="text-[#64748B] text-lg">Redirecting...</p>
    </div>
  );
}
