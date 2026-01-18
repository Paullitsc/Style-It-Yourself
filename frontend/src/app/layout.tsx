// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

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
    <html lang="en">
      {/* CHANGED: bg-neutral-50 -> bg-primary-900, text-neutral-900 -> text-neutral-50 */}
      <body className={`${inter.variable} font-sans antialiased bg-primary-900 text-neutral-50`}>
        <AuthProvider>
          <Header />
          <main className="pt-20 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}