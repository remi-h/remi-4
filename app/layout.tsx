import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { DotGothic16, Familjen_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

const familjenGrotesk = Familjen_Grotesk({
  variable: '--font-familjen-grotesk',
  subsets: ['latin'],
});

// Pixel Japanese for the seal and small section tags.
const dotGothic16 = DotGothic16({
  variable: '--font-dotgothic16',
  weight: '400',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Remi Higuchi - Portfolio',
  description: 'Portfolio website of Remi Higuchi, a designer and developer.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} ${familjenGrotesk.variable} ${dotGothic16.variable} antialiased`}>
        <Navigation />
        <div className="root max-w-7xl mx-auto">{children}</div>
        <Footer />
        {/* <Cursor /> */}
        <Analytics />
      </body>
    </html>
  );
}
