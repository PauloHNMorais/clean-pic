import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MAX_DIMENSION,
  MAX_STROKE_WIDTH,
  MAX_TOLERANCE,
  MIN_DIMENSION,
  MIN_STROKE_WIDTH,
  MIN_TOLERANCE,
  getNormalizeOutlineError,
  getOutputColorError,
  getRemoveBackgroundError,
  getResizeError,
  isValidAdjustmentConfig,
  isValidHexColor,
  resolveConfig,
} from "@/lib/image/config";

describe("isValidHexColor", () => {
  it("accepts 6-digit hex with #", () => {
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#FfAaBb")).toBe(true);
  });

  it("rejects non-hex strings and wrong shapes", () => {
    expect(isValidHexColor("000000")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor(123)).toBe(false);
  });
});

describe("resolveConfig", () => {
  it("returns the override when present", () => {
    const override = { ...DEFAULT_CONFIG, trim: true };
    expect(resolveConfig(DEFAULT_CONFIG, override)).toBe(override);
  });

  it("falls back to global when override is null", () => {
    expect(resolveConfig(DEFAULT_CONFIG, null)).toBe(DEFAULT_CONFIG);
  });
});

describe("getResizeError", () => {
  it("accepts dimensions within range", () => {
    expect(getResizeError({ width: MIN_DIMENSION, height: MAX_DIMENSION })).toBeNull();
  });

  it("rejects width below the minimum", () => {
    expect(
      getResizeError({ width: MIN_DIMENSION - 1, height: 100 })
    ).toContain("Largura");
  });

  it("rejects width above the maximum", () => {
    expect(
      getResizeError({ width: MAX_DIMENSION + 1, height: 100 })
    ).toContain("Largura");
  });

  it("rejects non-integer width", () => {
    expect(getResizeError({ width: 10.5, height: 100 })).toContain("Largura");
  });

  it("rejects invalid height independently of a valid width", () => {
    expect(getResizeError({ width: 100, height: 0 })).toContain("Altura");
  });
});

describe("getOutputColorError", () => {
  it("accepts a valid hex color", () => {
    expect(getOutputColorError("#123abc")).toBeNull();
  });

  it("rejects an invalid hex color", () => {
    expect(getOutputColorError("blue")).not.toBeNull();
  });
});

describe("getRemoveBackgroundError", () => {
  it("accepts null color (auto-detect) with valid tolerance", () => {
    expect(getRemoveBackgroundError({ color: null, tolerance: 20 })).toBeNull();
  });

  it("accepts a valid hex color with valid tolerance", () => {
    expect(
      getRemoveBackgroundError({ color: "#ffffff", tolerance: 50 })
    ).toBeNull();
  });

  it("rejects an invalid hex color", () => {
    expect(
      getRemoveBackgroundError({ color: "not-a-color", tolerance: 20 })
    ).not.toBeNull();
  });

  it("rejects tolerance outside [MIN_TOLERANCE, MAX_TOLERANCE]", () => {
    expect(
      getRemoveBackgroundError({ color: null, tolerance: MIN_TOLERANCE - 1 })
    ).not.toBeNull();
    expect(
      getRemoveBackgroundError({ color: null, tolerance: MAX_TOLERANCE + 1 })
    ).not.toBeNull();
  });
});

describe("getNormalizeOutlineError", () => {
  it("accepts a stroke width within range", () => {
    expect(getNormalizeOutlineError({ strokeWidth: MIN_STROKE_WIDTH })).toBeNull();
    expect(getNormalizeOutlineError({ strokeWidth: MAX_STROKE_WIDTH })).toBeNull();
  });

  it("rejects a stroke width outside [MIN_STROKE_WIDTH, MAX_STROKE_WIDTH]", () => {
    expect(
      getNormalizeOutlineError({ strokeWidth: MIN_STROKE_WIDTH - 1 })
    ).not.toBeNull();
    expect(
      getNormalizeOutlineError({ strokeWidth: MAX_STROKE_WIDTH + 1 })
    ).not.toBeNull();
  });
});

describe("isValidAdjustmentConfig", () => {
  it("accepts the default config", () => {
    expect(isValidAdjustmentConfig(DEFAULT_CONFIG)).toBe(true);
  });

  it("accepts a fully populated valid config", () => {
    expect(
      isValidAdjustmentConfig({
        outputFormat: "ico",
        trim: true,
        resize: { width: 100, height: 100 },
        outputColor: "#ff00ff",
        removeBackground: { color: "#ffffff", tolerance: 10 },
        normalizeOutline: { strokeWidth: 4 },
      })
    ).toBe(true);
  });

  it("rejects non-object values", () => {
    expect(isValidAdjustmentConfig(null)).toBe(false);
    expect(isValidAdjustmentConfig("config")).toBe(false);
    expect(isValidAdjustmentConfig(undefined)).toBe(false);
  });

  it("rejects an invalid outputFormat", () => {
    expect(
      isValidAdjustmentConfig({ ...DEFAULT_CONFIG, outputFormat: "gif" })
    ).toBe(false);
  });

  it("rejects a non-boolean trim", () => {
    expect(
      isValidAdjustmentConfig({ ...DEFAULT_CONFIG, trim: "yes" })
    ).toBe(false);
  });

  it("rejects an invalid outputColor", () => {
    expect(
      isValidAdjustmentConfig({ ...DEFAULT_CONFIG, outputColor: "red" })
    ).toBe(false);
  });

  it("rejects a malformed resize shape", () => {
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        resize: { width: "100", height: 100 },
      })
    ).toBe(false);
    expect(
      isValidAdjustmentConfig({ ...DEFAULT_CONFIG, resize: { width: 0, height: 100 } })
    ).toBe(false);
  });

  it("rejects a malformed removeBackground shape", () => {
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        removeBackground: { color: 5, tolerance: 20 },
      })
    ).toBe(false);
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        removeBackground: { color: null, tolerance: 200 },
      })
    ).toBe(false);
  });

  it("rejects a malformed normalizeOutline shape", () => {
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        normalizeOutline: { strokeWidth: "4" },
      })
    ).toBe(false);
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        normalizeOutline: { strokeWidth: MAX_STROKE_WIDTH + 1 },
      })
    ).toBe(false);
  });

  // Regression test: isValidAdjustmentConfig used to early-return on the
  // first null-able field it checked (resize), which skipped validating
  // fields declared after it. Each field must be validated independently.
  it("still validates outputColor and removeBackground when resize is null", () => {
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        resize: null,
        outputColor: "not-a-hex-color",
      })
    ).toBe(false);
    expect(
      isValidAdjustmentConfig({
        ...DEFAULT_CONFIG,
        resize: null,
        removeBackground: { color: null, tolerance: -1 },
      })
    ).toBe(false);
  });
});
