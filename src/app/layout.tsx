import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl =
  process.env.AUTH_URL || "https://glyph-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Glyph — Turn Articles into Visual Infographics",
  description:
    "Paste a URL and get AI-generated whiteboard-style infographic slides in seconds. Powered by GPT-5.5 + gpt-image-2.",
  openGraph: {
    title: "Glyph — Turn Articles into Visual Infographics",
    description:
      "Paste a URL and get AI-generated whiteboard-style infographic slides in seconds. Powered by GPT-5.5 + gpt-image-2.",
    type: "website",
    siteName: "Glyph",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Glyph — Turn Articles into Visual Infographics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Glyph — Turn Articles into Visual Infographics",
    description:
      "Paste a URL and get AI-generated whiteboard-style infographic slides in seconds. Powered by GPT-5.5 + gpt-image-2.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
