import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { resizeImage } from "@/lib/image/resize";
import { createSolidPng, getPixel } from "@/lib/image/testUtils";

describe("resizeImage", () => {
  describe("stretch mode (default)", () => {
    it("resizes to the exact requested dimensions", async () => {
      const input = await createSolidPng(50, 30, { r: 10, g: 20, b: 30, a: 255 });
      const output = await resizeImage(input, 100, 100);
      const metadata = await sharp(output).metadata();

      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it("does not preserve aspect ratio", async () => {
      const input = await createSolidPng(100, 100, { r: 10, g: 20, b: 30, a: 255 });
      const output = await resizeImage(input, 200, 50, "stretch");
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

  describe("proportional mode", () => {
    it("scales down preserving aspect ratio and pads the box exactly", async () => {
      // 100x50 (2:1) into a 60x60 box -> scaled to 60x30, padded top/bottom.
      const input = await createSolidPng(100, 50, { r: 10, g: 20, b: 30, a: 255 });
      const output = await resizeImage(input, 60, 60, "proportional");
      const metadata = await sharp(output).metadata();

      expect(metadata.width).toBe(60);
      expect(metadata.height).toBe(60);

      const center = await getPixel(output, 30, 30);
      expect(center).toEqual({ r: 10, g: 20, b: 30, a: 255 });

      const padding = await getPixel(output, 30, 2);
      expect(padding.a).toBe(0);
    });

    it("scales up preserving aspect ratio when the box is bigger", async () => {
      const input = await createSolidPng(10, 10, { r: 1, g: 2, b: 3, a: 255 });
      const output = await resizeImage(input, 40, 40, "proportional");
      const metadata = await sharp(output).metadata();

      expect(metadata.width).toBe(40);
      expect(metadata.height).toBe(40);
    });
  });

  describe("original mode", () => {
    it("keeps the image at its native size and pads transparently when the box is bigger", async () => {
      const input = await createSolidPng(20, 20, { r: 5, g: 6, b: 7, a: 255 });
      const output = await resizeImage(input, 60, 60, "original");
      const metadata = await sharp(output).metadata();

      expect(metadata.width).toBe(60);
      expect(metadata.height).toBe(60);

      // Centered 20x20 content, unscaled.
      const center = await getPixel(output, 30, 30);
      expect(center).toEqual({ r: 5, g: 6, b: 7, a: 255 });

      const corner = await getPixel(output, 1, 1);
      expect(corner.a).toBe(0);
    });

    it("crops without scaling when the box is smaller than the image", async () => {
      const input = await createSolidPng(100, 100, { r: 9, g: 8, b: 7, a: 255 });
      const output = await resizeImage(input, 40, 40, "original");
      const metadata = await sharp(output).metadata();

      expect(metadata.width).toBe(40);
      expect(metadata.height).toBe(40);

      // Fully covered by the (cropped) original content, no padding.
      const pixel = await getPixel(output, 0, 0);
      expect(pixel).toEqual({ r: 9, g: 8, b: 7, a: 255 });
    });

    it("crops one axis and pads the other when only one dimension overflows", async () => {
      const input = await createSolidPng(100, 10, { r: 0, g: 0, b: 255, a: 255 });
      const output = await resizeImage(input, 40, 40, "original");
      const metadata = await sharp(output).metadata();

      expect(metadata.width).toBe(40);
      expect(metadata.height).toBe(40);

      const center = await getPixel(output, 20, 20);
      expect(center).toEqual({ r: 0, g: 0, b: 255, a: 255 });

      const padding = await getPixel(output, 20, 2);
      expect(padding.a).toBe(0);
    });
  });
});
