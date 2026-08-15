export const MIN_IMAGES = 1;
export const MAX_IMAGES = 300;

// Raster formats sharp can decode in this build, restricted to ones
// browsers can also render natively in an <img> tag (needed for the
// preview thumbnail) — sharp also decodes TIFF, but browsers don't
// display it, so it's left out to avoid a broken-preview UX.
// SVG input is accepted too, but doesn't go through this raster pipeline
// directly: it's sanitized and rasterized to PNG first (see svgInput.ts)
// before hitting trim/resize/recolor, which are built around raster pixel
// data. Rendering it in an <img> preview here is safe even for an
// untrusted file — <img> never executes embedded scripts/event handlers,
// unlike inline <svg> or an <object>/<iframe> embed would.
export const ACCEPTED_MIME_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/avif": [".avif"],
  "image/svg+xml": [".svg"],
};

export const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

// Vercel's serverless functions hard-cap the whole request body at 4.5MB,
// regardless of app-level config. Stay under it with margin for multipart
// overhead (boundaries/headers per part) and the "configs" JSON field.
export const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;

// file.name is attacker-controlled (a direct API call can set it to anything,
// bypassing the browser's file picker) and gets used as a zip entry name in
// route.ts — without stripping path segments, a name like "../../etc/foo"
// would become a Zip Slip: an entry that, on extraction with a tool lacking
// path-traversal protection, writes outside the target directory. Images
// extracted from an imported .zip (see zipInput.ts) carry directory
// structure worth keeping in the output, so instead of collapsing straight
// to the basename, this sanitizes every path segment individually
// (stripping "..", ".", empty segments, and leading dots), which neutralizes
// traversal attempts while letting legitimate nested folders survive. For a
// flat filename (no path separators) it reduces to just that one check.
export function sanitizeRelativePath(path: string): string {
  const segments = path
    .split(/[/\\]/)
    .map((segment) => segment.replace(/^\.+/, ""))
    .filter((segment) => segment !== "");
  return segments.length > 0 ? segments.join("/") : "imagem";
}

// Zip MIME reporting is inconsistent across browsers/OSes (application/zip,
// application/x-zip-compressed, sometimes ""), so zip detection falls back
// to the .zip extension rather than relying on file.type alone.
const ZIP_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/zip-compressed",
];

export function isZipFile(file: File): boolean {
  return (
    ZIP_MIME_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

// react-dropzone's `accept` map, extended with zip so it isn't rejected
// before onDrop ever sees it (the zip itself never becomes an "image" —
// ImageUploader expands it into the images it contains first).
export const DROPZONE_ACCEPTED_TYPES: Record<string, string[]> = {
  ...ACCEPTED_MIME_TYPES,
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
};

// A single compressed .zip upload, capped well above MAX_TOTAL_UPLOAD_BYTES.
// Deflate's compression ratio is bounded (~1032:1 worst case), so this also
// bounds how large a single crafted entry can decompress to in the browser
// before the per-file/per-batch checks in validateNewFiles ever see it.
export const MAX_ZIP_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Reverse of ACCEPTED_MIME_TYPES: extension (no leading dot, lowercase) ->
// MIME type. Zip entries carry no browser-assigned MIME type, so extracted
// images need this to become real File objects the rest of the pipeline
// (validateNewFiles, the ACCEPTED_MIME_TYPES check in route.ts) recognizes.
export const EXTENSION_TO_MIME_TYPE: Record<string, string> = Object.entries(
  ACCEPTED_MIME_TYPES,
).reduce(
  (map, [mime, extensions]) => {
    for (const ext of extensions) {
      map[ext.replace(/^\./, "")] = mime;
    }
    return map;
  },
  {} as Record<string, string>,
);

// Best-effort abuse protection for /api/process, which is public and does
// CPU-bound work (sharp/potrace) per request. Per-IP, in-memory — see
// rateLimit.ts for why this is "best-effort" rather than a hard guarantee.
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 10;

export interface ValidationResult {
  accepted: File[];
  rejected: { file: File; reason: string }[];
  limitExceededCount: number;
  totalSizeExceededCount: number;
}

function formatMaxFileSize(): string {
  return `${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`;
}

export function formatMaxTotalSize(): string {
  return `${MAX_TOTAL_UPLOAD_BYTES / (1024 * 1024)} MB`;
}

export function validateNewFiles(
  incoming: File[],
  currentCount: number,
  currentTotalBytes: number,
): ValidationResult {
  const rejected: { file: File; reason: string }[] = [];
  const validFiles: File[] = [];

  for (const file of incoming) {
    if (!(file.type in ACCEPTED_MIME_TYPES)) {
      rejected.push({ file, reason: "formato de imagem não suportado" });
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      rejected.push({
        file,
        reason: `arquivo muito grande (máx. ${formatMaxFileSize()})`,
      });
      continue;
    }
    validFiles.push(file);
  }

  const accepted: File[] = [];
  let remainingSlots = Math.max(0, MAX_IMAGES - currentCount);
  let remainingBytes = Math.max(0, MAX_TOTAL_UPLOAD_BYTES - currentTotalBytes);
  let countLimitHit = false;
  let sizeLimitHit = false;

  for (const file of validFiles) {
    if (remainingSlots <= 0) {
      countLimitHit = true;
      break;
    }
    if (file.size > remainingBytes) {
      sizeLimitHit = true;
      break;
    }
    accepted.push(file);
    remainingSlots--;
    remainingBytes -= file.size;
  }

  const notAccepted = validFiles.length - accepted.length;

  return {
    accepted,
    rejected,
    limitExceededCount: countLimitHit ? notAccepted : 0,
    totalSizeExceededCount: sizeLimitHit ? notAccepted : 0,
  };
}
