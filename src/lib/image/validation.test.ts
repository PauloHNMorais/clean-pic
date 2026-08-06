import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES,
  MAX_TOTAL_UPLOAD_BYTES,
  sanitizeFileName,
  validateNewFiles,
} from "@/lib/image/validation";

function makeFile(name: string, sizeBytes: number, type = "image/png"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("sanitizeFileName", () => {
  it("leaves a normal filename untouched", () => {
    expect(sanitizeFileName("logo.png")).toBe("logo.png");
  });

  it("strips path traversal down to the last segment", () => {
    expect(sanitizeFileName("../../../../etc/passwd")).toBe("passwd");
  });

  it("strips backslash-style path traversal too", () => {
    expect(sanitizeFileName("..\\..\\windows\\system32\\config")).toBe(
      "config"
    );
  });

  it("falls back to a default name when nothing safe is left", () => {
    expect(sanitizeFileName("..")).toBe("imagem");
    expect(sanitizeFileName("")).toBe("imagem");
    expect(sanitizeFileName("../")).toBe("imagem");
  });

  it("strips leading dots from an otherwise normal name", () => {
    expect(sanitizeFileName("...hidden.png")).toBe("hidden.png");
  });
});

describe("validateNewFiles", () => {
  it("accepts a file with a supported type and size", () => {
    const result = validateNewFiles([makeFile("a.png", 100)], 0, 0);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects an unsupported MIME type", () => {
    const result = validateNewFiles(
      [makeFile("a.txt", 100, "text/plain")],
      0,
      0
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain("formato");
  });

  it("rejects a file over the per-file size limit", () => {
    const result = validateNewFiles(
      [makeFile("a.png", MAX_FILE_SIZE_BYTES + 1)],
      0,
      0
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].reason).toContain("grande");
  });

  it("stops accepting once the image count limit is reached", () => {
    const result = validateNewFiles(
      [makeFile("a.png", 10), makeFile("b.png", 10)],
      MAX_IMAGES - 1,
      0
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.limitExceededCount).toBe(1);
  });

  it("stops accepting once the total byte budget is exhausted", () => {
    const almostFull = MAX_TOTAL_UPLOAD_BYTES - 100;
    const result = validateNewFiles(
      [makeFile("a.png", 200), makeFile("b.png", 50)],
      0,
      almostFull
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.totalSizeExceededCount).toBe(2);
  });

  it("does not skip ahead to a smaller file after one exceeds the byte budget", () => {
    const remaining = 150;
    const result = validateNewFiles(
      [makeFile("big.png", 200), makeFile("small.png", 10)],
      0,
      MAX_TOTAL_UPLOAD_BYTES - remaining
    );
    // "big.png" doesn't fit (200 > 150 remaining) — the batch stops there,
    // "small.png" (which would fit) is never reached.
    expect(result.accepted).toHaveLength(0);
    expect(result.totalSizeExceededCount).toBe(2);
  });
});
