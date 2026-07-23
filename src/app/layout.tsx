import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hexaclean.ch"),
  title: {
    default: "HEXA CLEAN | Reinigung, Hauswartung & Kleinreparaturen",
    template: "%s | HEXA CLEAN",
  },
  description:
    "HEXA CLEAN bietet professionelle Reinigung, Hauswartung, Fensterreinigung, Umzugsreinigung und Kleinreparaturen in Pieterlen, Biel/Bienne und Umgebung.",
  keywords: [
    "HEXA CLEAN",
    "Reinigung Pieterlen",
    "Reinigung Biel",
    "Hauswartung Biel",
    "Fensterreinigung",
    "Umzugsreinigung",
    "Kleinreparaturen",
    "Reinigungsfirma Biel",
    "Reinigungsservice Schweiz",
  ],
  authors: [{ name: "Michal Majewski" }],
  creator: "MM Digital Studio",
  publisher: "MM Digital Studio",
  openGraph: {
    title: "HEXA CLEAN | Reinigung, Hauswartung & Kleinreparaturen",
    description:
      "Professionelle Reinigung, Hauswartung, Fensterreinigung, Umzugsreinigung und Kleinreparaturen in Pieterlen, Biel/Bienne und Umgebung.",
    url: "https://hexaclean.ch",
    siteName: "HEXA CLEAN",
    locale: "de_CH",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}