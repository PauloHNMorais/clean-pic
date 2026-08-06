import { describe, expect, it } from "vitest";
import { recolorImage } from "@/lib/image/recolor";
import { createSolidPng, getPixel } from "@/lib/image/testUtils";

describe("recolorImage", () => {
  it("replaces the RGB of every pixel with the target color", async () => {
    const input = await createSolidPng(10, 10, { r: 200, g: 10, b: 10, a: 255 });
    const output = await recolorImage(input, "#00ff00");
    const pixel = await getPixel(output, 5, 5);

    expect(pixel.r).toBe(0);
    expect(pixel.g).toBe(255);
    expect(pixel.b).toBe(0);
  });

  it("preserves the original per-pixel alpha", async () => {
    const input = await createSolidPng(10, 10, { r: 10, g: 10, b: 10, a: 128 });
    const output = await recolorImage(input, "#0000ff");
    const pixel = await getPixel(output, 5, 5);

    expect(pixel.a).toBe(128);
  });
});
