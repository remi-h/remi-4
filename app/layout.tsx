import type { Metadata } from "next";
import { Bitcount_Single, Noto_Serif_JP, Space_Grotesk, DotGothic16 } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigatin";
import { Footer } from "@/components/Footer";

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
});

const bitcountSingle = Bitcount_Single({
  variable: "--font-bitcount-single",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const dotGothic16 = DotGothic16({
  variable: "--font-dot-gothic-16",
  subsets: ["latin"],
  weight: "400"
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
        className={`${notoSerifJp.variable} ${bitcountSingle.variable} ${spaceGrotesk.variable} ${dotGothic16.variable} antialiased`}
      >
        <div className="root max-w-7xl mx-auto">
          {children}
          <Footer />
        </div>
        <Navigation />
        {/* <Cursor /> */}
      </body>
    </html>
  );
}
