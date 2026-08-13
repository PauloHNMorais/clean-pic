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

  it("stretch mode overwrites width/height and disables preserveAspectRatio, keeping the viewBox", async () => {
    const input = await makeIcon({ r: 0, g: 0, b: 0 });
    const plain = await convertToSvg(input);
    const resized = await convertToSvg(input, {
      width: 500,
      height: 300,
      mode: "stretch",
    });

    const originalViewBox = plain.match(/viewBox="[^"]*"/)?.[0];

    expect(resized).toContain('width="500"');
    expect(resized).toContain('height="300"');
    expect(resized).toContain('preserveAspectRatio="none"');
    expect(originalViewBox).toBeDefined();
    expect(resized).toContain(originalViewBox as string);
  });

  it("proportional mode overwrites width/height and keeps the viewBox (default preserveAspectRatio letterboxes)", async () => {
    const input = await makeIcon({ r: 0, g: 0, b: 0 });
    const plain = await convertToSvg(input);
    const resized = await convertToSvg(input, {
      width: 500,
      height: 300,
      mode: "proportional",
    });

    const originalViewBox = plain.match(/viewBox="[^"]*"/)?.[0];

    expect(resized).toContain('width="500"');
    expect(resized).toContain('height="300"');
    expect(resized).not.toContain("preserveAspectRatio");
    expect(resized).toContain(originalViewBox as string);
  });

  it("original mode keeps native scale by shifting the viewBox instead of the width/height ratio", async () => {
    // makeIcon produces a 64x64 source.
    const input = await makeIcon({ r: 0, g: 0, b: 0 });
    const resized = await convertToSvg(input, {
      width: 40,
      height: 40,
      mode: "original",
    });

    expect(resized).toContain('width="40"');
    expect(resized).toContain('height="40"');
    // (64-40)/2 = 12 offset on both axes, window stays 40x40 (native scale).
    expect(resized).toContain('viewBox="12 12 40 40"');
  });

  it("rejects a fully transparent image", async () => {
    const input = await createSolidPng(20, 20, { r: 0, g: 0, b: 0, a: 0 });
    await expect(convertToSvg(input)).rejects.toThrow(
      "Imagem totalmente transparente"
    );
  });
});
