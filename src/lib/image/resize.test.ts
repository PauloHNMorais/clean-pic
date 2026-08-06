import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { resizeImage } from "@/lib/image/resize";
import { createSolidPng } from "@/lib/image/testUtils";

describe("resizeImage", () => {
  it("resizes to the exact requested dimensions", async () => {
    const input = await createSolidPng(50, 30, { r: 10, g: 20, b: 30, a: 255 });
    const output = await resizeImage(input, 100, 100);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  it("does not preserve aspect ratio (fit: fill)", async () => {
    const input = await createSolidPng(100, 100, { r: 10, g: 20, b: 30, a: 255 });
    const output = await resizeImage(input, 200, 50);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(50);
  });

  it("outputs a PNG regardless of input format", async () => {
    const input = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();

    const output = await resizeImage(input, 20, 20);
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe("png");
  });
});
