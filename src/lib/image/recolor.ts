import sharp from "sharp";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export async function recolorImage(
  input: Buffer,
  hexColor: string
): Promise<Buffer> {
  const { r, g, b } = hexToRgb(hexColor);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}
