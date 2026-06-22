import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manufacturing Intelligence Pipeline",
  description:
    "Executive analytics over a 3-year multi-station manufacturing dataset.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
