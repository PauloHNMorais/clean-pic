export const MIN_IMAGES = 1;
export const MAX_IMAGES = 50;
export const ACCEPTED_MIME_TYPE = "image/png";
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export interface ValidationResult {
  accepted: File[];
  rejected: { file: File; reason: string }[];
  limitExceededCount: number;
}

function formatMaxSize(): string {
  return `${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`;
}

export function validateNewFiles(
  incoming: File[],
  currentCount: number
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
        reason: `arquivo muito grande (máx. ${formatMaxSize()})`,
      });
      continue;
    }
    validFiles.push(file);
  }

  const remainingSlots = Math.max(0, MAX_IMAGES - currentCount);
  const accepted = validFiles.slice(0, remainingSlots);
  const limitExceededCount = validFiles.length - accepted.length;

  return { accepted, rejected, limitExceededCount };
}
