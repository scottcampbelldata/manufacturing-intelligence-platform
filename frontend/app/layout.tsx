import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://factory.scottcampbell.io"),
  title: "Automotive Assembly Operations Dashboard | Manufacturing Intelligence Platform",
  description:
    "Automotive assembly operations dashboard over 35M rows of synthetic final assembly data: OEE, first pass yield, defects, equipment faults and replacement priorities from a star schema warehouse.",
  applicationName: "Automotive Assembly Intelligence",
  authors: [{ name: "Scott Campbell", url: "https://scottcampbell.io/" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Automotive Assembly Intelligence",
    title: "Automotive Assembly Operations Dashboard | Manufacturing Intelligence Platform",
    description: "Automotive assembly operations dashboard over 35M rows of synthetic final assembly data: OEE, first pass yield, defects, equipment faults and replacement priorities from a star schema warehouse.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Automotive Assembly Intelligence dashboard showing OEE, yield and defect metrics" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Automotive Assembly Operations Dashboard | Manufacturing Intelligence Platform",
    description: "Automotive assembly operations dashboard over 35M rows of synthetic final assembly data: OEE, first pass yield, defects, equipment faults and replacement priorities from a star schema warehouse.",
    images: ["/og-image.png"],
  },
};

// Structured data for search engines.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Automotive Assembly Intelligence",
  "url": "https://factory.scottcampbell.io/",
  "description": "Automotive assembly operations dashboard over 35M rows of synthetic final assembly data: OEE, first pass yield, defects, equipment faults and replacement priorities from a star schema warehouse.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Any (web browser)",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Person",
    "name": "Scott Campbell",
    "url": "https://scottcampbell.io/"
  },
  "subjectOf": {
    "@type": "CreativeWork",
    "name": "Automotive Assembly Intelligence case study",
    "url": "https://scottcampbell.io/projects/manufacturing-intelligence-platform/"
  },
  "sameAs": [
    "https://github.com/scottcampbelldata/manufacturing-intelligence-platform"
  ]
};

// Set the theme before first paint so there is no light/dark flash. Default is
// light; a stored preference (set by the toggle) wins on return visits.
const themeInit = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <link rel="preload" href="/fonts/source-serif-4-text.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/libertinus-serif-display-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
