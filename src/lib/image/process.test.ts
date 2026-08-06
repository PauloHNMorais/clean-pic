import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, type AdjustmentConfig } from "@/lib/image/config";

const trimImage = vi.fn(async (buf: Buffer) => Buffer.from(`trim(${buf})`));
const resizeImage = vi.fn(async (buf: Buffer) => Buffer.from(`resize(${buf})`));
const convertToSvg = vi.fn(async (buf: Buffer) => `svg(${buf})`);
const recolorImage = vi.fn(async (buf: Buffer) => Buffer.from(`recolor(${buf})`));
const removeBackground = vi.fn(async (buf: Buffer) =>
  Buffer.from(`removeBg(${buf})`)
);
const convertToIco = vi.fn(async (buf: Buffer) => Buffer.from(`ico(${buf})`));

vi.mock("@/lib/image/trim", () => ({ trimImage }));
vi.mock("@/lib/image/resize", () => ({ resizeImage }));
vi.mock("@/lib/image/svg", () => ({ convertToSvg }));
vi.mock("@/lib/image/recolor", () => ({ recolorImage }));
vi.mock("@/lib/image/removeBackground", () => ({ removeBackground }));
vi.mock("@/lib/image/ico", () => ({ convertToIco }));

const { processImage } = await import("@/lib/image/process");

const INPUT = Buffer.from("input");

beforeEach(() => {
  trimImage.mockClear();
  resizeImage.mockClear();
  convertToSvg.mockClear();
  recolorImage.mockClear();
  removeBackground.mockClear();
  convertToIco.mockClear();
});

describe("processImage", () => {
  it("returns the input untouched for the default (png, no adjustments) config", async () => {
    const result = await processImage(INPUT, DEFAULT_CONFIG);

    expect(result).toEqual({
      buffer: INPUT,
      extension: "png",
      mimeType: "image/png",
    });
    expect(trimImage).not.toHaveBeenCalled();
    expect(resizeImage).not.toHaveBeenCalled();
    expect(recolorImage).not.toHaveBeenCalled();
    expect(removeBackground).not.toHaveBeenCalled();
    expect(convertToSvg).not.toHaveBeenCalled();
    expect(convertToIco).not.toHaveBeenCalled();
  });

  it("runs background removal before trim", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      trim: true,
      removeBackground: { color: "#ffffff", tolerance: 10 },
    };

    await processImage(INPUT, config);

    expect(removeBackground).toHaveBeenCalledWith(INPUT, config.removeBackground);
    expect(trimImage).toHaveBeenCalledWith(await removeBackground.mock.results[0].value);

    const removeBgOrder = removeBackground.mock.invocationCallOrder[0];
    const trimOrder = trimImage.mock.invocationCallOrder[0];
    expect(removeBgOrder).toBeLessThan(trimOrder);
  });

  it("for SVG output, forwards resize/outputColor into convertToSvg instead of calling resizeImage/recolorImage", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      outputFormat: "svg",
      resize: { width: 64, height: 64 },
      outputColor: "#00ff00",
    };

    const result = await processImage(INPUT, config);

    expect(convertToSvg).toHaveBeenCalledWith(INPUT, config.resize, config.outputColor);
    expect(resizeImage).not.toHaveBeenCalled();
    expect(recolorImage).not.toHaveBeenCalled();
    expect(result.extension).toBe("svg");
    expect(result.mimeType).toBe("image/svg+xml");
    expect(result.buffer.toString("utf-8")).toBe(`svg(${INPUT})`);
  });

  it("for PNG/ICO output, recolors before resizing", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      outputColor: "#123456",
      resize: { width: 32, height: 32 },
    };

    await processImage(INPUT, config);

    expect(recolorImage).toHaveBeenCalledWith(INPUT, "#123456");
    const recoloredBuffer = await recolorImage.mock.results[0].value;
    expect(resizeImage).toHaveBeenCalledWith(recoloredBuffer, 32, 32);
  });

  it("converts to ICO using the fully processed working buffer", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      outputFormat: "ico",
      resize: { width: 32, height: 32 },
    };

    const result = await processImage(INPUT, config);
    const resizedBuffer = await resizeImage.mock.results[0].value;

    expect(convertToIco).toHaveBeenCalledWith(resizedBuffer);
    expect(result.extension).toBe("ico");
    expect(result.mimeType).toBe("image/x-icon");
  });

  it("chains removeBackground -> trim -> recolor -> resize -> ico in order", async () => {
    const config: AdjustmentConfig = {
      outputFormat: "ico",
      trim: true,
      resize: { width: 16, height: 16 },
      outputColor: "#abcdef",
      removeBackground: { color: null, tolerance: 5 },
    };

    await processImage(INPUT, config);

    const removeBgOutput = await removeBackground.mock.results[0].value;
    expect(removeBackground).toHaveBeenCalledWith(INPUT, config.removeBackground);

    expect(trimImage).toHaveBeenCalledWith(removeBgOutput);
    const trimOutput = await trimImage.mock.results[0].value;

    expect(recolorImage).toHaveBeenCalledWith(trimOutput, "#abcdef");
    const recolorOutput = await recolorImage.mock.results[0].value;

    expect(resizeImage).toHaveBeenCalledWith(recolorOutput, 16, 16);
    const resizeOutput = await resizeImage.mock.results[0].value;

    expect(convertToIco).toHaveBeenCalledWith(resizeOutput);
  });
});
