import sharp from "sharp";
import { ResizeMode } from "@/lib/image/config";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export async function resizeImage(
  input: Buffer,
  width: number,
  height: number,
  mode: ResizeMode = "stretch"
): Promise<Buffer> {
  if (mode === "stretch") {
    return sharp(input)
      .resize(width, height, { fit: "fill" })
      .png()
      .toBuffer();
  }

  if (mode === "proportional") {
    return sharp(input)
      .resize(width, height, { fit: "contain", background: TRANSPARENT })
      .png()
      .toBuffer();
  }

  // "original": no scaling at all — place the image at its native size,
  // centered in the box. sharp's composite() errors if the overlay is
  // larger than the canvas, so anything that overflows is cropped first;
  // whatever's left of the canvas after that is transparent padding.
  const metadata = await sharp(input).metadata();
  const inputWidth = metadata.width ?? width;
  const inputHeight = metadata.height ?? height;
  const cropWidth = Math.min(inputWidth, width);
  const cropHeight = Math.min(inputHeight, height);

  let overlay = input;
  if (cropWidth < inputWidth || cropHeight < inputHeight) {
    overlay = await sharp(input)
      .extract({
        left: Math.floor((inputWidth - cropWidth) / 2),
        top: Math.floor((inputHeight - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();
  }

  return sharp({
    create: { width, height, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: overlay, gravity: "centre" }])
    .png()
    .toBuffer();
}
