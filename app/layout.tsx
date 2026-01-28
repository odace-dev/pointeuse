import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import FloatingFaces from "@/components/FloatingFaces";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dr!!!ng",
  description: "Gestion du temps de travail",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${lexend.variable} antialiased bg-white`}>
        <FloatingFaces />
        {children}
      </body>
    </html>
  );
}
