import sharp from "sharp";
import { trace as potraceTrace, type PotraceOptions } from "potrace";
import { ResizeMode } from "@/lib/image/config";

const ALPHA_THRESHOLD = 128;

function toHexColor(r: number, g: number, b: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

interface FlattenedBitmap {
  bitmap: Buffer;
  width: number;
  height: number;
  fillColor: string;
}

async function flattenByAlpha(input: Buffer): Promise<FlattenedBitmap> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const bitmap = Buffer.alloc(width * height);
  let fillColor: string | null = null;

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const alpha = data[offset + 3];
    bitmap[i] = alpha >= ALPHA_THRESHOLD ? 0 : 255;

    if (fillColor === null && alpha >= ALPHA_THRESHOLD) {
      fillColor = toHexColor(data[offset], data[offset + 1], data[offset + 2]);
    }
  }

  if (fillColor === null) {
    throw new Error(
      "Imagem totalmente transparente — não é possível converter para SVG"
    );
  }

  return { bitmap, width, height, fillColor };
}

// Replaces (or adds) attributes on the root <svg> tag. A value of undefined
// removes the attribute instead of setting it.
function setSvgAttrs(
  svg: string,
  attrs: Record<string, string | undefined>
): string {
  return svg.replace(/<svg([^>]*)>/, (_match, existing: string) => {
    let cleaned = existing;
    for (const name of Object.keys(attrs)) {
      cleaned = cleaned.replace(new RegExp(`\\s+${name}="[^"]*"`), "");
    }
    const additions = Object.entries(attrs)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([name, value]) => ` ${name}="${value}"`)
      .join("");
    return `<svg${cleaned}${additions}>`;
  });
}

export async function convertToSvg(
  input: Buffer,
  dimensions?: { width: number; height: number; mode: ResizeMode },
  colorOverride?: string
): Promise<string> {
  const { bitmap, width, height, fillColor } = await flattenByAlpha(input);

  const flattenedPng = await sharp(bitmap, {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  const options: PotraceOptions = {
    threshold: ALPHA_THRESHOLD,
    blackOnWhite: true,
    color: colorOverride ?? fillColor,
  };

  const svg = await new Promise<string>((resolve, reject) => {
    potraceTrace(flattenedPng, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

  if (!dimensions) return svg;

  const { width: targetWidth, height: targetHeight, mode } = dimensions;

  if (mode === "stretch") {
    // Forces the disproportionate width/height to actually distort the
    // content — without this, the SVG spec's default preserveAspectRatio
    // ("xMidYMid meet") would letterbox instead of stretching.
    return setSvgAttrs(svg, {
      width: String(targetWidth),
      height: String(targetHeight),
      preserveAspectRatio: "none",
    });
  }

  if (mode === "proportional") {
    // Default preserveAspectRatio ("xMidYMid meet") already scales the
    // content to fit inside the box preserving aspect ratio and centers
    // it — exactly the padded-on-the-edges behavior this mode wants.
    return setSvgAttrs(svg, {
      width: String(targetWidth),
      height: String(targetHeight),
    });
  }

  // "original": keep native scale (1 viewBox unit = 1px) by shifting the
  // viewBox to a same-size window centered on the original content —
  // content outside it gets clipped (crop), space the content doesn't
  // cover stays empty (pad), and nothing gets resampled.
  const minX = (width - targetWidth) / 2;
  const minY = (height - targetHeight) / 2;
  return setSvgAttrs(svg, {
    width: String(targetWidth),
    height: String(targetHeight),
    viewBox: `${minX} ${minY} ${targetWidth} ${targetHeight}`,
  });
}
