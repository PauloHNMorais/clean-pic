import sharp from "sharp";
import { trace as potraceTrace, type PotraceOptions } from "potrace";

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

function setSvgDimensions(svg: string, width: number, height: number): string {
  return svg.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/, "")
      .replace(/\s+height="[^"]*"/, "");
    return `<svg${cleaned} width="${width}" height="${height}">`;
  });
}

export async function convertToSvg(
  input: Buffer,
  dimensions?: { width: number; height: number },
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

  return dimensions
    ? setSvgDimensions(svg, dimensions.width, dimensions.height)
    : svg;
}
