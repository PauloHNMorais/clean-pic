import { AdjustmentConfig } from "@/lib/image/config";
import { trimImage } from "@/lib/image/trim";
import { resizeImage } from "@/lib/image/resize";
import { convertToSvg } from "@/lib/image/svg";
import { recolorImage } from "@/lib/image/recolor";
import { removeBackground } from "@/lib/image/removeBackground";
import { normalizeOutline } from "@/lib/image/normalizeOutline";
import { transformImage } from "@/lib/image/transform";
import { convertToIco } from "@/lib/image/ico";

export interface ProcessedImage {
  buffer: Buffer;
  extension: "svg" | "png" | "ico";
  mimeType: "image/svg+xml" | "image/png" | "image/x-icon";
}

export async function processImage(
  input: Buffer,
  config: AdjustmentConfig
): Promise<ProcessedImage> {
  let working = input;

  if (config.removeBackground) {
    working = await removeBackground(working, config.removeBackground);
  }

  if (config.normalizeOutline) {
    working = await normalizeOutline(
      working,
      config.normalizeOutline.strokeWidth
    );
  }

  if (config.rotate !== 0 || config.flipHorizontal || config.flipVertical) {
    working = await transformImage(
      working,
      config.rotate,
      config.flipHorizontal,
      config.flipVertical
    );
  }

  if (config.trim) {
    working = await trimImage(working);
  }

  if (config.outputFormat === "svg") {
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
    working = await resizeImage(
      working,
      config.resize.width,
      config.resize.height,
      config.resize.mode
    );
  }

  if (config.outputFormat === "ico") {
    const ico = await convertToIco(working);
    return { buffer: ico, extension: "ico", mimeType: "image/x-icon" };
  }

  return { buffer: working, extension: "png", mimeType: "image/png" };
}
