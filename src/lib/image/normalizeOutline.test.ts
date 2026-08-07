import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeOutline } from "@/lib/image/normalizeOutline";
import { createSolidPng, getPixel } from "@/lib/image/testUtils";

async function createHorizontalBar(
  width: number,
  height: number,
  barTop: number,
  barHeight: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  const bar = await createSolidPng(width, barHeight, { ...color, a: 255 });
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: bar, left: 0, top: barTop }])
    .png()
    .toBuffer();
}

async function opaqueColumnHeight(
  buffer: Buffer,
  x: number,
  height: number
): Promise<number> {
  let count = 0;
  for (let y = 0; y < height; y++) {
    const pixel = await getPixel(buffer, x, y);
    if (pixel.a > 0) count++;
  }
  return count;
}

describe("normalizeOutline", () => {
  it("redraws a thick bar at roughly the requested stroke width", async () => {
    const input = await createHorizontalBar(40, 40, 15, 10, {
      r: 10,
      g: 20,
      b: 30,
    });

    const output = await normalizeOutline(input, 4);
    const thickness = await opaqueColumnHeight(output, 20, 40);

    expect(thickness).toBeGreaterThanOrEqual(2);
    expect(thickness).toBeLessThan(10);
  });

  it("produces a thicker result for a larger stroke width", async () => {
    const input = await createHorizontalBar(40, 40, 15, 10, {
      r: 10,
      g: 20,
      b: 30,
    });

    const thin = await normalizeOutline(input, 2);
    const thick = await normalizeOutline(input, 12);

    const thinThickness = await opaqueColumnHeight(thin, 20, 40);
    const thickThickness = await opaqueColumnHeight(thick, 20, 40);

    expect(thickThickness).toBeGreaterThan(thinThickness);
  });

  it("preserves the original fill color", async () => {
    const input = await createHorizontalBar(40, 40, 15, 10, {
      r: 200,
      g: 50,
      b: 90,
    });
    const output = await normalizeOutline(input, 4);

    const pixel = await getPixel(output, 20, 20);
    expect(pixel.a).toBeGreaterThan(0);
    expect(pixel.r).toBe(200);
    expect(pixel.g).toBe(50);
    expect(pixel.b).toBe(90);
  });

  it("leaves pixels far from the shape fully transparent", async () => {
    const input = await createHorizontalBar(40, 40, 15, 10, {
      r: 0,
      g: 0,
      b: 0,
    });
    const output = await normalizeOutline(input, 4);

    const corner = await getPixel(output, 0, 0);
    expect(corner.a).toBe(0);
  });

  it("is a no-op on a fully transparent image", async () => {
    const input = await createSolidPng(10, 10, { r: 0, g: 0, b: 0, a: 0 });
    const output = await normalizeOutline(input, 4);

    const pixel = await getPixel(output, 5, 5);
    expect(pixel.a).toBe(0);
  });
});
