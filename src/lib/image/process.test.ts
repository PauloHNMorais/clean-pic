import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, type AdjustmentConfig } from "@/lib/image/config";

const trimImage = vi.fn(async (buf: Buffer) => Buffer.from(`trim(${buf})`));
const resizeImage = vi.fn(async (buf: Buffer) => Buffer.from(`resize(${buf})`));
const convertToSvg = vi.fn(async (buf: Buffer) => `svg(${buf})`);
const recolorImage = vi.fn(async (buf: Buffer) => Buffer.from(`recolor(${buf})`));
const removeBackground = vi.fn(async (buf: Buffer) =>
  Buffer.from(`removeBg(${buf})`)
);
const normalizeOutline = vi.fn(async (buf: Buffer) =>
  Buffer.from(`normalizeOutline(${buf})`)
);
const transformImage = vi.fn(async (buf: Buffer) =>
  Buffer.from(`transform(${buf})`)
);
const convertToIco = vi.fn(async (buf: Buffer) => Buffer.from(`ico(${buf})`));

vi.mock("@/lib/image/trim", () => ({ trimImage }));
vi.mock("@/lib/image/resize", () => ({ resizeImage }));
vi.mock("@/lib/image/svg", () => ({ convertToSvg }));
vi.mock("@/lib/image/recolor", () => ({ recolorImage }));
vi.mock("@/lib/image/removeBackground", () => ({ removeBackground }));
vi.mock("@/lib/image/normalizeOutline", () => ({ normalizeOutline }));
vi.mock("@/lib/image/transform", () => ({ transformImage }));
vi.mock("@/lib/image/ico", () => ({ convertToIco }));

const { processImage } = await import("@/lib/image/process");

const INPUT = Buffer.from("input");

beforeEach(() => {
  trimImage.mockClear();
  resizeImage.mockClear();
  convertToSvg.mockClear();
  recolorImage.mockClear();
  removeBackground.mockClear();
  normalizeOutline.mockClear();
  transformImage.mockClear();
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
    expect(normalizeOutline).not.toHaveBeenCalled();
    expect(transformImage).not.toHaveBeenCalled();
    expect(convertToSvg).not.toHaveBeenCalled();
    expect(convertToIco).not.toHaveBeenCalled();
  });

  it("runs the transform step after normalizeOutline and before trim", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      trim: true,
      normalizeOutline: { strokeWidth: 5 },
      rotate: 90,
      flipHorizontal: true,
      flipVertical: false,
    };

    await processImage(INPUT, config);

    const normalizedOutput = await normalizeOutline.mock.results[0].value;
    expect(transformImage).toHaveBeenCalledWith(normalizedOutput, 90, true, false);
    expect(trimImage).toHaveBeenCalledWith(await transformImage.mock.results[0].value);

    const normalizeOrder = normalizeOutline.mock.invocationCallOrder[0];
    const transformOrder = transformImage.mock.invocationCallOrder[0];
    const trimOrder = trimImage.mock.invocationCallOrder[0];
    expect(normalizeOrder).toBeLessThan(transformOrder);
    expect(transformOrder).toBeLessThan(trimOrder);
  });

  it("skips the transform step when rotate is 0 and no flip is requested", async () => {
    await processImage(INPUT, { ...DEFAULT_CONFIG, trim: true });
    expect(transformImage).not.toHaveBeenCalled();
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

  it("runs normalizeOutline after background removal and before trim", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      trim: true,
      removeBackground: { color: "#ffffff", tolerance: 10 },
      normalizeOutline: { strokeWidth: 5 },
    };

    await processImage(INPUT, config);

    const removeBgOutput = await removeBackground.mock.results[0].value;
    expect(normalizeOutline).toHaveBeenCalledWith(removeBgOutput, 5);
    expect(trimImage).toHaveBeenCalledWith(await normalizeOutline.mock.results[0].value);

    const removeBgOrder = removeBackground.mock.invocationCallOrder[0];
    const normalizeOrder = normalizeOutline.mock.invocationCallOrder[0];
    const trimOrder = trimImage.mock.invocationCallOrder[0];
    expect(removeBgOrder).toBeLessThan(normalizeOrder);
    expect(normalizeOrder).toBeLessThan(trimOrder);
  });

  it("feeds the normalized buffer into SVG conversion", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      outputFormat: "svg",
      normalizeOutline: { strokeWidth: 3 },
    };

    await processImage(INPUT, config);

    const normalizedOutput = await normalizeOutline.mock.results[0].value;
    expect(convertToSvg).toHaveBeenCalledWith(
      normalizedOutput,
      undefined,
      undefined
    );
  });

  it("for SVG output, forwards resize/outputColor into convertToSvg instead of calling resizeImage/recolorImage", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      outputFormat: "svg",
      resize: { width: 64, height: 64, mode: "proportional" },
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
      resize: { width: 32, height: 32, mode: "stretch" },
    };

    await processImage(INPUT, config);

    expect(recolorImage).toHaveBeenCalledWith(INPUT, "#123456");
    const recoloredBuffer = await recolorImage.mock.results[0].value;
    expect(resizeImage).toHaveBeenCalledWith(recoloredBuffer, 32, 32, "stretch");
  });

  it("converts to ICO using the fully processed working buffer", async () => {
    const config: AdjustmentConfig = {
      ...DEFAULT_CONFIG,
      outputFormat: "ico",
      resize: { width: 32, height: 32, mode: "original" },
    };

    const result = await processImage(INPUT, config);
    const resizedBuffer = await resizeImage.mock.results[0].value;

    expect(convertToIco).toHaveBeenCalledWith(resizedBuffer);
    expect(result.extension).toBe("ico");
    expect(result.mimeType).toBe("image/x-icon");
  });

  it("chains removeBackground -> normalizeOutline -> transform -> trim -> recolor -> resize -> ico in order", async () => {
    const config: AdjustmentConfig = {
      outputFormat: "ico",
      trim: true,
      resize: { width: 16, height: 16, mode: "stretch" },
      outputColor: "#abcdef",
      removeBackground: { color: null, tolerance: 5 },
      normalizeOutline: { strokeWidth: 6 },
      rotate: 180,
      flipHorizontal: false,
      flipVertical: true,
    };

    await processImage(INPUT, config);

    const removeBgOutput = await removeBackground.mock.results[0].value;
    expect(removeBackground).toHaveBeenCalledWith(INPUT, config.removeBackground);

    expect(normalizeOutline).toHaveBeenCalledWith(removeBgOutput, 6);
    const normalizeOutput = await normalizeOutline.mock.results[0].value;

    expect(transformImage).toHaveBeenCalledWith(normalizeOutput, 180, false, true);
    const transformOutput = await transformImage.mock.results[0].value;

    expect(trimImage).toHaveBeenCalledWith(transformOutput);
    const trimOutput = await trimImage.mock.results[0].value;

    expect(recolorImage).toHaveBeenCalledWith(trimOutput, "#abcdef");
    const recolorOutput = await recolorImage.mock.results[0].value;

    expect(resizeImage).toHaveBeenCalledWith(recolorOutput, 16, 16, "stretch");
    const resizeOutput = await resizeImage.mock.results[0].value;

    expect(convertToIco).toHaveBeenCalledWith(resizeOutput);
  });
});
