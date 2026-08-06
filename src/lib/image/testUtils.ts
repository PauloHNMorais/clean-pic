import sharp from "sharp";

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export async function createSolidPng(
  width: number,
  height: number,
  color: Rgba
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: color.r, g: color.g, b: color.b, alpha: color.a / 255 },
    },
  })
    .png()
    .toBuffer();
}

// A solid `background` rect with a smaller solid `foreground` square
// centered in it — the standard fixture for trim/recolor/background-removal
// tests that need two distinguishable regions.
export async function createPngWithCenterSquare(
  width: number,
  height: number,
  background: Rgba,
  foreground: Rgba,
  squareSize: number
): Promise<Buffer> {
  const left = Math.floor((width - squareSize) / 2);
  const top = Math.floor((height - squareSize) / 2);
  const square = await createSolidPng(squareSize, squareSize, foreground);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: {
        r: background.r,
        g: background.g,
        b: background.b,
        alpha: background.a / 255,
      },
    },
  })
    .composite([{ input: square, left, top }])
    .png()
    .toBuffer();
}

export async function getPixel(
  buffer: Buffer,
  x: number,
  y: number
): Promise<Rgba> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
    a: data[offset + 3],
  };
}
