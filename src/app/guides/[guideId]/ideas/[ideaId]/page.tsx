"use client";

import { useParams } from "next/navigation";

export default function KeyIdeaPage() {
  const params = useParams();
  const ideaId = params.ideaId as string;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-[#94A3B8] text-lg">
        Key Idea: {ideaId}
      </p>
    </div>
  );
}
