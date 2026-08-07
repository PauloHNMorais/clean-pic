import ImageUploader from "@/components/ImageUploader";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "CleanPic",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  url: "https://clean-pic.vercel.app",
  description:
    "Ajuste imagens em lote gratuitamente: corte espaços vazios, redimensione, troque a cor, remova o fundo e converta JPEG, PNG, WebP, GIF ou AVIF em PNG, SVG ou ICO.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-black font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="flex flex-col flex-1 gap-8 px-6 py-16 w-full max-w-5xl">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/logo-name.svg"
            alt="CleanPic Logo"
            width={140}
            height={32}
          />

          <p>
            Remova fundos, corte excessos e converta suas imagens para PNG, SVG
            ou ICO em segundos
          </p>

          <br />

          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Faça upload de 1 a 50 imagens para ajustar e converter em PNG, SVG
            ou ICO.
          </p>
        </div>
        <ImageUploader />
      </main>
      <footer className="flex flex-col items-center gap-1 px-6 py-8 w-full text-zinc-500 dark:text-zinc-500 text-sm text-center">
        <p>CleanPic — processamento de imagens em lote</p>
        <p>
          Desenvolvido por{" "}
          <a
            href="https://github.com/PauloHNMorais"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300 underline"
          >
            Paulo Morais
          </a>
        </p>
      </footer>
    </div>
  );
}
