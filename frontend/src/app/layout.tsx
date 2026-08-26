// src/app/layout.tsx
import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Mona_Sans } from "next/font/google";
import "./global.css";
import Header from "@/components/Headers";
import { AuthProvider } from "@/components/AuthProvider";

const monaSans = Mona_Sans({
  subsets: ['latin'],
  variable: '--font-mona-sans',
  display: 'swap',
});
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SIY - Style It Yourself",
  description: "Build perfect outfits from your wardrobe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The next/font variable classes go on <html>, not <body>, so that
    // --font-mona-sans and friends exist on :root. global.css resolves
    // --font-sans from them in a :root rule, and custom properties substitute
    // at the element where they are declared, so if the variables only existed on
    // <body>, that :root declaration would be invalid and every font would fall
    // back to the browser default.
    <html
      lang="en"
      className={`${monaSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased bg-paper text-ink flex flex-col min-h-screen">
        <AuthProvider>
          <Header />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}