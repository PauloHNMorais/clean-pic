import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { convertToIco } from "@/lib/image/ico";
import { createSolidPng } from "@/lib/image/testUtils";

function parseIco(buffer: Buffer) {
  return {
    reserved: buffer.readUInt16LE(0),
    type: buffer.readUInt16LE(2),
    count: buffer.readUInt16LE(4),
    entry: {
      width: buffer.readUInt8(6),
      height: buffer.readUInt8(7),
      colorCount: buffer.readUInt8(8),
      colorPlanes: buffer.readUInt16LE(10),
      bitCount: buffer.readUInt16LE(12),
      dataSize: buffer.readUInt32LE(14),
      dataOffset: buffer.readUInt32LE(18),
    },
  };
}

describe("convertToIco", () => {
  it("wraps a small image without resizing it", async () => {
    const input = await createSolidPng(32, 32, { r: 255, g: 0, b: 0, a: 255 });
    const output = await convertToIco(input);
    const parsed = parseIco(output);

    expect(parsed.reserved).toBe(0);
    expect(parsed.type).toBe(1);
    expect(parsed.count).toBe(1);
    expect(parsed.entry.width).toBe(32);
    expect(parsed.entry.height).toBe(32);
    expect(parsed.entry.colorPlanes).toBe(1);
    expect(parsed.entry.bitCount).toBe(32);
    expect(parsed.entry.dataOffset + parsed.entry.dataSize).toBe(output.length);

    const embeddedPng = output.subarray(
      parsed.entry.dataOffset,
      parsed.entry.dataOffset + parsed.entry.dataSize
    );
    const metadata = await sharp(embeddedPng).metadata();
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(32);
  });

  it("downscales a square image over 256px and encodes 256 as 0", async () => {
    const input = await createSolidPng(512, 512, { r: 0, g: 255, b: 0, a: 255 });
    const output = await convertToIco(input);
    const parsed = parseIco(output);

    // ICONDIRENTRY stores width/height in a single byte each; 0 means 256.
    expect(parsed.entry.width).toBe(0);
    expect(parsed.entry.height).toBe(0);

    const embeddedPng = output.subarray(
      parsed.entry.dataOffset,
      parsed.entry.dataOffset + parsed.entry.dataSize
    );
    const metadata = await sharp(embeddedPng).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it("downscales a non-square oversized image while preserving aspect ratio", async () => {
    const input = await createSolidPng(500, 300, { r: 0, g: 0, b: 255, a: 255 });
    const output = await convertToIco(input);
    const parsed = parseIco(output);

    const embeddedPng = output.subarray(
      parsed.entry.dataOffset,
      parsed.entry.dataOffset + parsed.entry.dataSize
    );
    const metadata = await sharp(embeddedPng).metadata();

    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(154);
  });
});
