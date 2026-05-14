import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <LandingPage user={session.user} />;
}
