import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://clean-pic.vercel.app";
const SITE_DESCRIPTION =
  "Ajuste imagens em lote gratuitamente: corte espaços vazios, redimensione, troque a cor, remova o fundo e converta JPEG, PNG, WebP, GIF, AVIF ou SVG em PNG, SVG ou ICO. Sem instalar nada, direto no navegador.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CleanPic — ajuste e converta imagens em lote",
    template: "%s | CleanPic",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "converter imagem para svg",
    "converter png para ico",
    "remover fundo de imagem",
    "redimensionar imagens em lote",
    "cortar espaço vazio de imagem",
    "editor de imagem online gratuito",
  ],
  authors: [{ name: "CleanPic" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CleanPic — ajuste e converta imagens em lote",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "CleanPic",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanPic — ajuste e converta imagens em lote",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex flex-col min-h-full">{children}</body>
    </html>
  );
}
