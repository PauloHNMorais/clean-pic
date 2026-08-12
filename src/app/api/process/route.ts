import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import { AdjustmentConfig, isValidAdjustmentConfig } from "@/lib/image/config";
import { processImage } from "@/lib/image/process";
import { rasterizeSvgInput } from "@/lib/image/svgInput";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES,
  MAX_TOTAL_UPLOAD_BYTES,
  MIN_IMAGES,
  formatMaxTotalSize,
  sanitizeFileName,
} from "@/lib/image/validation";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ProcessingError {
  filename: string;
  message: string;
}

function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? filename : filename.slice(0, lastDot);
}

function uniqueName(
  baseName: string,
  extension: string,
  usedNames: Set<string>,
): string {
  let candidate = `${baseName}.${extension}`;
  let suffix = 1;
  while (usedNames.has(candidate)) {
    candidate = `${baseName}-${suffix}.${extension}`;
    suffix++;
  }
  usedNames.add(candidate);
  return candidate;
}

async function buildZip(
  files: { name: string; buffer: Buffer }[],
): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });

  archive.pipe(stream);
  for (const file of files) {
    archive.append(file.buffer, { name: file.name });
  }
  await archive.finalize();
  return done;
}

export async function POST(request: Request): Promise<Response> {
  if (isRateLimited(getClientIp(request))) {
    return Response.json(
      { error: "Muitas requisições. Aguarde um minuto e tente novamente." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);
  const configsRaw = formData.get("configs");

  if (typeof configsRaw !== "string") {
    return Response.json(
      { error: "Campo 'configs' ausente ou inválido" },
      { status: 400 },
    );
  }

  if (files.length < MIN_IMAGES || files.length > MAX_IMAGES) {
    return Response.json(
      {
        error: `Envie entre ${MIN_IMAGES} e ${MAX_IMAGES} imagens (recebido: ${files.length})`,
      },
      { status: 400 },
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return Response.json(
      {
        error: `Tamanho total dos arquivos excede o limite de ${formatMaxTotalSize()}`,
      },
      { status: 400 },
    );
  }

  let configs: unknown;
  try {
    configs = JSON.parse(configsRaw);
  } catch {
    return Response.json(
      { error: "Campo 'configs' não é um JSON válido" },
      { status: 400 },
    );
  }

  if (!Array.isArray(configs) || configs.length !== files.length) {
    return Response.json(
      { error: "'configs' deve ser um array com o mesmo tamanho de 'images'" },
      { status: 400 },
    );
  }

  if (!configs.every(isValidAdjustmentConfig)) {
    return Response.json(
      { error: "Um ou mais itens de 'configs' têm formato inválido" },
      { status: 400 },
    );
  }

  const validConfigs = configs as AdjustmentConfig[];
  const results: { name: string; buffer: Buffer }[] = [];
  const errors: ProcessingError[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const config = validConfigs[i];

    if (!(file.type in ACCEPTED_MIME_TYPES)) {
      errors.push({
        filename: file.name,
        message: "formato de imagem não suportado",
      });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push({
        filename: file.name,
        message: `arquivo muito grande (máx. ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB)`,
      });
      continue;
    }

    try {
      let inputBuffer: Buffer = Buffer.from(await file.arrayBuffer());
      if (file.type === "image/svg+xml") {
        inputBuffer = await rasterizeSvgInput(inputBuffer);
      }
      const processed = await processImage(inputBuffer, config);
      const name = uniqueName(
        stripExtension(sanitizeFileName(file.name)),
        processed.extension,
        usedNames,
      );

      results.push({ name, buffer: processed.buffer });
    } catch (error) {
      errors.push({
        filename: file.name,
        message: error instanceof Error ? error.message : "falha desconhecida",
      });
    }
  }

  if (results.length === 0) {
    return Response.json(
      { error: "Nenhuma imagem pôde ser processada", details: errors },
      { status: 422 },
    );
  }

  const zipBuffer = await buildZip(results);

  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="png-any.zip"',
      "X-Processing-Errors": encodeURIComponent(JSON.stringify(errors)),
    },
  });
}
