import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { rasterizeSvgInput, sanitizeSvgInput } from "@/lib/image/svgInput";

function svgBuffer(inner: string, attrs = 'viewBox="0 0 24 24"'): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`,
    "utf-8"
  );
}

describe("sanitizeSvgInput", () => {
  it("leaves a benign icon SVG untouched in substance", () => {
    const input = svgBuffer('<circle cx="12" cy="12" r="10" fill="red"/>');
    const output = sanitizeSvgInput(input).toString("utf-8");
    expect(output).toContain("<circle");
  });

  it("rejects a document with a DOCTYPE (XXE risk)", () => {
    const input = Buffer.from(
      `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>`,
      "utf-8"
    );
    expect(() => sanitizeSvgInput(input)).toThrow();
  });

  it("strips <script> tags", () => {
    const input = svgBuffer(
      '<script>alert(document.cookie)</script><circle r="1"/>'
    );
    const output = sanitizeSvgInput(input).toString("utf-8");
    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert");
  });

  it("strips <foreignObject> blocks", () => {
    const input = svgBuffer(
      '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">html</div></foreignObject>'
    );
    const output = sanitizeSvgInput(input).toString("utf-8");
    expect(output).not.toContain("foreignObject");
    expect(output).not.toContain("<div");
  });

  it("strips inline event handler attributes", () => {
    const input = svgBuffer(
      '<circle r="1" onload="alert(1)" onclick="alert(2)"/>'
    );
    const output = sanitizeSvgInput(input).toString("utf-8");
    expect(output).not.toContain("onload");
    expect(output).not.toContain("onclick");
  });

  it("strips remote href/xlink:href references", () => {
    const input = svgBuffer(
      '<image href="https://evil.example/track.png" xlink:href="http://evil.example/x"/>'
    );
    const output = sanitizeSvgInput(input).toString("utf-8");
    expect(output).not.toContain("evil.example");
  });

  it("keeps local fragment references used by <use>", () => {
    const input = svgBuffer(
      '<defs><circle id="c" r="1"/></defs><use href="#c"/>'
    );
    const output = sanitizeSvgInput(input).toString("utf-8");
    expect(output).toContain('href="#c"');
  });
});

describe("rasterizeSvgInput", () => {
  it("rasterizes a small icon SVG up to the target dimension", async () => {
    const input = svgBuffer('<circle cx="12" cy="12" r="10" fill="red"/>');
    const output = await rasterizeSvgInput(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1024);
  });

  it("bounds output size to the target even for a large declared viewBox", async () => {
    const input = svgBuffer(
      '<circle cx="12" cy="12" r="10" fill="red"/>',
      'viewBox="0 0 50000 50000"'
    );
    const output = await rasterizeSvgInput(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1024);
  });

  it("rejects a document whose declared size is absurdly out of range", async () => {
    const input = svgBuffer(
      '<circle r="1"/>',
      'viewBox="0 0 999999999 999999999"'
    );
    await expect(rasterizeSvgInput(input)).rejects.toThrow();
  });

  it("preserves fill color through rasterization", async () => {
    const input = svgBuffer(
      '<rect x="0" y="0" width="24" height="24" fill="#00ff00"/>'
    );
    const output = await rasterizeSvgInput(input);
    const { data, info } = await sharp(output)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const center = Math.floor(info.width / 2) * info.channels;
    expect(data[center]).toBeLessThan(50); // r
    expect(data[center + 1]).toBeGreaterThan(200); // g
    expect(data[center + 2]).toBeLessThan(50); // b
  });
});
