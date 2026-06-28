import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Saira } from "next/font/google";
import "./globals.css";

// Display: an industrial grotesque for headings (instrument-panel energy).
const display = Saira({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Body: clean and legible.
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Data: monospaced numerals for every figure — the instrument-readout signature.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Automotive Assembly Intelligence",
  description:
    "Operations analytics over a 3-year synthetic automotive final-assembly dataset.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
