import { AdjustmentConfig } from "@/lib/image/config";
import { trimImage } from "@/lib/image/trim";
import { resizeImage } from "@/lib/image/resize";
import { convertToSvg } from "@/lib/image/svg";
import { recolorImage } from "@/lib/image/recolor";

export interface ProcessedImage {
  buffer: Buffer;
  extension: "svg" | "png";
  mimeType: "image/svg+xml" | "image/png";
}

export async function processImage(
  input: Buffer,
  config: AdjustmentConfig
): Promise<ProcessedImage> {
  let working = input;

  if (config.trim) {
    working = await trimImage(working);
  }

  if (config.toSvg) {
    const svg = await convertToSvg(
      working,
      config.resize ?? undefined,
      config.outputColor ?? undefined
    );
    return {
      buffer: Buffer.from(svg, "utf-8"),
      extension: "svg",
      mimeType: "image/svg+xml",
    };
  }

  if (config.outputColor) {
    working = await recolorImage(working, config.outputColor);
  }

  if (config.resize) {
    working = await resizeImage(working, config.resize.width, config.resize.height);
  }

  return { buffer: working, extension: "png", mimeType: "image/png" };
}
