import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Display serif. Only the weight axis is loaded (the optical-size and SOFT
// axes roughly doubled the font payload for no visible difference at the
// sizes we use). Italic is kept for the gold <em> accents.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FamilyVista — Your Family Albums, Beautifully Organized",
    template: "%s · FamilyVista",
  },
  description:
    "Create family albums, upload photos in bulk, drag to reorder, share with family, and relive your memories in a full-screen slideshow.",
  applicationName: "FamilyVista",
  openGraph: {
    type: "website",
    siteName: "FamilyVista",
    title: "FamilyVista",
    description: "Your family albums, beautifully organized.",
    images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: "FamilyVista" }],
  },
  twitter: { card: "summary_large_image", images: ["/brand/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
