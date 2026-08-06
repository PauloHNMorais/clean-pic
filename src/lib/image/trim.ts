import sharp from "sharp";

export async function trimImage(input: Buffer): Promise<Buffer> {
  return sharp(input).trim().png().toBuffer();
}
