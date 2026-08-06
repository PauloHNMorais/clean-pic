import ImageUploader from "@/components/ImageUploader";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-stone-950 font-sans">
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
    </div>
  );
}
