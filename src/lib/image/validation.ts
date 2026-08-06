export const MIN_IMAGES = 1;
export const MAX_IMAGES = 50;
export const ACCEPTED_MIME_TYPE = "image/png";
export const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

// Vercel's serverless functions hard-cap the whole request body at 4.5MB,
// regardless of app-level config. Stay under it with margin for multipart
// overhead (boundaries/headers per part) and the "configs" JSON field.
export const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;

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
  currentTotalBytes: number
): ValidationResult {
  const rejected: { file: File; reason: string }[] = [];
  const validFiles: File[] = [];

  for (const file of incoming) {
    if (file.type !== ACCEPTED_MIME_TYPE) {
      rejected.push({ file, reason: "não é um arquivo PNG" });
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
