import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Familjen_Grotesk, IBM_Plex_Mono, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const familjenGrotesk = Familjen_Grotesk({
  variable: "--font-familjen-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Used for small Japanese details. CJK fonts are split into many slices, so load them on demand.
const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Remi Higuchi - Portfolio",
  description: "Portfolio website of Remi Higuchi, a designer and developer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${familjenGrotesk.variable} ${ibmPlexMono.variable} ${notoSerifJp.variable} antialiased`}
      >
        <Navigation />
        <div className="root max-w-7xl mx-auto">{children}</div>
        <Footer />
        {/* <Cursor /> */}
        <Analytics />
      </body>
    </html>
  );
}
