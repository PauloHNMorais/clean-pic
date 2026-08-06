import sharp from "sharp";
import type { RemoveBackgroundConfig } from "@/lib/image/config";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

function detectBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): Rgb {
  const cornerOffsets = [
    0,
    (width - 1) * channels,
    (height - 1) * width * channels,
    ((height - 1) * width + width - 1) * channels,
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  for (const offset of cornerOffsets) {
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
  }

  return {
    r: Math.round(r / cornerOffsets.length),
    g: Math.round(g / cornerOffsets.length),
    b: Math.round(b / cornerOffsets.length),
  };
}

export async function removeBackground(
  input: Buffer,
  config: RemoveBackgroundConfig
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const target = config.color
    ? hexToRgb(config.color)
    : detectBackgroundColor(data, width, height, channels);

  // Hard cutoff below featherStart, unchanged above threshold, linear
  // ramp in between — avoids jagged edges around the removed area.
  const threshold = (config.tolerance / 100) * 255;
  const featherStart = threshold * 0.85;
  const featherRange = Math.max(1, threshold - featherStart);

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const distance = colorDistance(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      target.r,
      target.g,
      target.b
    );

    let removalFactor: number;
    if (distance <= featherStart) {
      removalFactor = 1;
    } else if (distance >= threshold) {
      removalFactor = 0;
    } else {
      removalFactor = 1 - (distance - featherStart) / featherRange;
    }

    data[offset + 3] = Math.round(data[offset + 3] * (1 - removalFactor));
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}
