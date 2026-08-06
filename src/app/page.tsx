import ImageUploader from "@/components/ImageUploader";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            PNG Any
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Faça upload de 1 a 50 imagens PNG para ajustar.
          </p>
        </div>
        <ImageUploader />
      </main>
    </div>
  );
}
