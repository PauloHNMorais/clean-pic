import { describe, expect, it } from "vitest";
import { removeBackground } from "@/lib/image/removeBackground";
import { createPngWithCenterSquare, createSolidPng, getPixel } from "@/lib/image/testUtils";

describe("removeBackground", () => {
  it("auto-detects the background color from the image corners and clears it", async () => {
    const input = await createPngWithCenterSquare(
      20,
      20,
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 0, g: 0, b: 0, a: 255 },
      8
    );

    const output = await removeBackground(input, { color: null, tolerance: 20 });

    const corner = await getPixel(output, 0, 0);
    const center = await getPixel(output, 10, 10);

    expect(corner.a).toBe(0);
    expect(center.a).toBe(255);
  });

  it("uses an explicit color instead of auto-detecting", async () => {
    // Corners are black, but we tell it the background is white — since
    // black is far from white, nothing should be removed.
    const input = await createPngWithCenterSquare(
      20,
      20,
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      8
    );

    const output = await removeBackground(input, {
      color: "#ffffff",
      tolerance: 20,
    });

    const corner = await getPixel(output, 0, 0);
    expect(corner.a).toBe(255);
  });

  it("preserves existing transparency by multiplying, not overwriting, alpha", async () => {
    const input = await createSolidPng(10, 10, { r: 255, g: 255, b: 255, a: 128 });
    const output = await removeBackground(input, { color: "#ffffff", tolerance: 20 });
    const pixel = await getPixel(output, 5, 5);

    // Fully within the removal color, so removalFactor is 1 and the
    // pre-existing alpha (128) gets multiplied down to 0, not left at 128.
    expect(pixel.a).toBe(0);
  });

  it("applies a soft feather instead of a hard cutoff at the tolerance boundary", async () => {
    // Distance 235 sits between featherStart (0.85 * threshold) and
    // threshold for tolerance=100 (threshold=255, featherStart=216.75),
    // so it should end up partially — not fully — transparent.
    const input = await createSolidPng(4, 4, { r: 20, g: 255, b: 255, a: 255 });
    const output = await removeBackground(input, {
      color: "#ffffff",
      tolerance: 100,
    });
    const pixel = await getPixel(output, 2, 2);

    expect(pixel.a).toBeGreaterThan(0);
    expect(pixel.a).toBeLessThan(255);
  });
});
