"use client";

import { useCallback, useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { MAX_IMAGES, validateNewFiles } from "@/lib/image/validation";
import {
  AdjustmentConfig,
  DEFAULT_CONFIG,
  getResizeError,
  resolveConfig,
} from "@/lib/image/config";
import AdjustmentControls from "@/components/AdjustmentControls";
import { uploadWithProgress } from "@/lib/uploadWithProgress";

interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  override: AdjustmentConfig | null;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function ImageUploader() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [globalConfig, setGlobalConfig] =
    useState<AdjustmentConfig>(DEFAULT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [awaitingServer, setAwaitingServer] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [processingErrors, setProcessingErrors] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      for (const image of images) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [images]);

  const onDrop = useCallback(
    (acceptedFiles: File[], dropzoneRejections: FileRejection[]) => {
      const { accepted, rejected, limitExceededCount } = validateNewFiles(
        acceptedFiles,
        images.length
      );

      const newImages: UploadedImage[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        override: null,
      }));

      const newErrors: string[] = [];
      for (const { file } of dropzoneRejections) {
        newErrors.push(`${file.name}: não é um arquivo PNG`);
      }
      for (const { file, reason } of rejected) {
        newErrors.push(`${file.name}: ${reason}`);
      }
      if (limitExceededCount > 0) {
        newErrors.push(
          `Limite de ${MAX_IMAGES} imagens atingido — ${limitExceededCount} arquivo(s) não foram adicionados`
        );
      }

      setImages((prev) => [...prev, ...newImages]);
      setErrors(newErrors);
    },
    [images.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
    disabled: images.length >= MAX_IMAGES,
  });

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((image) => image.id !== id);
    });
  }

  function clearAll() {
    for (const image of images) {
      URL.revokeObjectURL(image.previewUrl);
    }
    setImages([]);
    setErrors([]);
  }

  function setOverride(id: string, config: AdjustmentConfig | null) {
    setImages((prev) =>
      prev.map((image) => (image.id === id ? { ...image, override: config } : image))
    );
  }

  function toggleIndividual(id: string, current: UploadedImage) {
    setOverride(
      id,
      current.override === null ? { ...globalConfig } : null
    );
  }

  const hasInvalidConfig = images.some((image) => {
    const resize = resolveConfig(globalConfig, image.override).resize;
    return resize !== null && getResizeError(resize) !== null;
  });

  async function handleProcessAndDownload() {
    setProcessError(null);
    setProcessingErrors([]);
    setUploadProgress(0);
    setAwaitingServer(false);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      for (const image of images) {
        formData.append("images", image.file, image.file.name);
      }
      const configs = images.map((image) =>
        resolveConfig(globalConfig, image.override)
      );
      formData.append("configs", JSON.stringify(configs));

      const xhr = await uploadWithProgress(
        "/api/process",
        formData,
        (percent) => {
          setUploadProgress(percent);
          if (percent >= 100) setAwaitingServer(true);
        }
      );

      if (xhr.status < 200 || xhr.status >= 300) {
        const text = await (xhr.response as Blob).text();
        let message = `Erro ao processar (HTTP ${xhr.status})`;
        try {
          const body = JSON.parse(text);
          message = body?.error ?? message;
        } catch {
          // corpo não é JSON, mantém a mensagem padrão
        }
        setProcessError(message);
        return;
      }

      const errorsHeader = xhr.getResponseHeader("X-Processing-Errors");
      if (errorsHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(errorsHeader)) as {
            filename: string;
            message: string;
          }[];
          setProcessingErrors(
            parsed.map((e) => `${e.filename}: ${e.message}`)
          );
        } catch {
          // header malformado, ignora
        }
      }

      const blob = xhr.response as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "png-any.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setProcessError(
        error instanceof Error ? error.message : "Falha desconhecida ao processar"
      );
    } finally {
      setIsProcessing(false);
      setAwaitingServer(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-gray-300 dark:border-gray-700"
        } ${images.length >= MAX_IMAGES ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {images.length >= MAX_IMAGES
            ? `Limite de ${MAX_IMAGES} imagens atingido`
            : isDragActive
              ? "Solte os arquivos PNG aqui"
              : "Arraste imagens PNG aqui ou clique para selecionar (1 a 50 imagens)"}
        </p>
      </div>

      {errors.length > 0 && (
        <ul className="text-sm text-red-600 dark:text-red-400 list-disc pl-5">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="border rounded-lg p-4 border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-medium mb-2">
              Ajustes globais (aplicados a imagens sem ajuste individual)
            </h2>
            <AdjustmentControls
              idPrefix="global"
              config={globalConfig}
              onChange={setGlobalConfig}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {images.length} / {MAX_IMAGES} imagens
            </span>
            <button
              onClick={clearAll}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Remover todas
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div>
              <button
                onClick={handleProcessAndDownload}
                disabled={isProcessing || images.length === 0 || hasInvalidConfig}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processando..." : "Processar e baixar (.zip)"}
              </button>
            </div>

            {isProcessing && (
              <div className="flex flex-col gap-1 max-w-sm">
                <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full bg-blue-600 transition-all ${
                      awaitingServer ? "animate-pulse" : ""
                    }`}
                    style={{
                      width: `${awaitingServer ? 100 : uploadProgress}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {awaitingServer
                    ? "Processando no servidor..."
                    : `Enviando imagens... ${uploadProgress}%`}
                </p>
              </div>
            )}
          </div>

          {hasInvalidConfig && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Corrija as dimensões de redimensionamento inválidas antes de processar.
            </p>
          )}

          {processError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {processError}
            </p>
          )}

          {processingErrors.length > 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400">
              <p>Algumas imagens não puderam ser processadas:</p>
              <ul className="list-disc pl-5">
                {processingErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative border rounded-lg p-2 flex flex-col gap-2 border-gray-200 dark:border-gray-800"
              >
                <button
                  onClick={() => removeImage(image.id)}
                  aria-label={`Remover ${image.file.name}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                >
                  ×
                </button>
                <div className="aspect-square flex items-center justify-center bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-size-[16px_16px] rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt={image.file.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="text-xs truncate" title={image.file.name}>
                  {image.file.name}
                </div>
                <div className="text-xs text-gray-500">
                  {formatSize(image.file.size)}
                </div>

                <label className="flex items-center gap-2 text-xs pt-2 border-t border-gray-200 dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={image.override !== null}
                    onChange={() => toggleIndividual(image.id, image)}
                  />
                  Ajuste individual
                </label>

                {image.override !== null ? (
                  <AdjustmentControls
                    idPrefix={image.id}
                    config={resolveConfig(globalConfig, image.override)}
                    onChange={(config) => setOverride(image.id, config)}
                  />
                ) : (
                  <p className="text-xs text-gray-500">
                    Usando ajustes globais
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
