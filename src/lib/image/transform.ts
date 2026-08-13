import sharp from "sharp";
import { RotateAngle } from "@/lib/image/config";

// Rotation is restricted to right angles (config.ts), so sharp never needs
// to pad the canvas with a background color — that's only a concern for
// arbitrary angles.
export async function transformImage(
  input: Buffer,
  rotate: RotateAngle,
  flipHorizontal: boolean,
  flipVertical: boolean
): Promise<Buffer> {
  let pipeline = sharp(input);

  if (rotate !== 0) {
    pipeline = pipeline.rotate(rotate);
  }
  // sharp's flip() mirrors top-bottom, flop() mirrors left-right — names
  // are easy to swap, hence the explicit horizontal/vertical mapping here.
  if (flipHorizontal) {
    pipeline = pipeline.flop();
  }
  if (flipVertical) {
    pipeline = pipeline.flip();
  }

  return pipeline.png().toBuffer();
}
