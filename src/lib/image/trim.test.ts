import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { trimImage } from "@/lib/image/trim";
import { createPngWithCenterSquare, createSolidPng } from "@/lib/image/testUtils";

describe("trimImage", () => {
  it("crops away a transparent border around opaque content", async () => {
    const input = await createPngWithCenterSquare(
      40,
      40,
      { r: 0, g: 0, b: 0, a: 0 },
      { r: 255, g: 0, b: 0, a: 255 },
      20
    );

    const output = await trimImage(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(20);
  });

  it("is a no-op on a fully transparent image", async () => {
    const input = await createSolidPng(30, 30, { r: 0, g: 0, b: 0, a: 0 });
    const output = await trimImage(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(30);
    expect(metadata.height).toBe(30);
  });

  it("is a no-op on a fully opaque, uniformly colored image", async () => {
    const input = await createSolidPng(30, 30, { r: 128, g: 64, b: 200, a: 255 });
    const output = await trimImage(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(30);
    expect(metadata.height).toBe(30);
  });
});
