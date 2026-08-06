import sharp from "sharp";

export async function resizeImage(
  input: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(input)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
}
