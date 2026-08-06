import { describe, expect, it } from "vitest";
import { convertToSvg } from "@/lib/image/svg";
import { createPngWithCenterSquare, createSolidPng } from "@/lib/image/testUtils";

async function makeIcon(fill: { r: number; g: number; b: number }) {
  return createPngWithCenterSquare(
    64,
    64,
    { r: 0, g: 0, b: 0, a: 0 },
    { ...fill, a: 255 },
    32
  );
}

describe("convertToSvg", () => {
  it("produces an SVG using the auto-detected fill color", async () => {
    const input = await makeIcon({ r: 18, g: 52, b: 86 }); // #123456
    const svg = await convertToSvg(input);

    expect(svg).toContain("<svg");
    expect(svg.toLowerCase()).toContain("#123456");
  });

  it("uses colorOverride instead of the auto-detected color", async () => {
    const input = await makeIcon({ r: 18, g: 52, b: 86 });
    const svg = await convertToSvg(input, undefined, "#ff00ff");

    expect(svg.toLowerCase()).toContain("#ff00ff");
    expect(svg.toLowerCase()).not.toContain("#123456");
  });

  it("overwrites width/height when dimensions are given, keeping the viewBox", async () => {
    const input = await makeIcon({ r: 0, g: 0, b: 0 });
    const plain = await convertToSvg(input);
    const resized = await convertToSvg(input, { width: 500, height: 300 });

    const originalViewBox = plain.match(/viewBox="[^"]*"/)?.[0];

    expect(resized).toContain('width="500"');
    expect(resized).toContain('height="300"');
    expect(originalViewBox).toBeDefined();
    expect(resized).toContain(originalViewBox as string);
  });

  it("rejects a fully transparent image", async () => {
    const input = await createSolidPng(20, 20, { r: 0, g: 0, b: 0, a: 0 });
    await expect(convertToSvg(input)).rejects.toThrow(
      "Imagem totalmente transparente"
    );
  });
});
