import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { transformImage } from "@/lib/image/transform";
import { createPngWithCenterSquare, getPixel } from "@/lib/image/testUtils";

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };
const RED = { r: 255, g: 0, b: 0, a: 255 };

describe("transformImage", () => {
  it("is a no-op when rotate is 0 and no flip is requested", async () => {
    const input = await createPngWithCenterSquare(20, 10, TRANSPARENT, RED, 4);
    const output = await transformImage(input, 0, false, false);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(10);
  });

  it("swaps width/height on a 90 degree rotation", async () => {
    const input = await createPngWithCenterSquare(20, 10, TRANSPARENT, RED, 4);
    const output = await transformImage(input, 90, false, false);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(10);
    expect(metadata.height).toBe(20);
  });

  it("keeps dimensions on a 180 degree rotation", async () => {
    const input = await createPngWithCenterSquare(20, 10, TRANSPARENT, RED, 4);
    const output = await transformImage(input, 180, false, false);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(10);
  });

  it("mirrors content left-right on flipHorizontal", async () => {
    // Asymmetric fixture: opaque red only in the left half, so a horizontal
    // flip is observable by checking which side is opaque afterwards.
    const input = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 4,
              height: 10,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const output = await transformImage(input, 0, true, false);

    const leftPixel = await getPixel(output, 1, 5);
    const rightPixel = await getPixel(output, 8, 5);
    expect(leftPixel.a).toBe(0);
    expect(rightPixel.a).toBe(255);
  });

  it("mirrors content top-bottom on flipVertical", async () => {
    const input = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 10,
              height: 4,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const output = await transformImage(input, 0, false, true);

    const topPixel = await getPixel(output, 5, 1);
    const bottomPixel = await getPixel(output, 5, 8);
    expect(topPixel.a).toBe(0);
    expect(bottomPixel.a).toBe(255);
  });
});
