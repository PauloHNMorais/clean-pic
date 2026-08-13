// "stretch" distorts the image to the exact width/height (aspect ratio
// ignored, current pixel content resampled to fill the box).
// "proportional" scales the whole image down/up preserving aspect ratio,
// then pads with transparent space on the edges that don't fill the box.
// "original" doesn't scale at all — the image's pixels stay at their
// original size, centered in the box; anything that doesn't fit is
// cropped, anything the image doesn't cover is padded transparent.
export type ResizeMode = "stretch" | "proportional" | "original";

export interface ResizeConfig {
  width: number;
  height: number;
  mode: ResizeMode;
}

export interface RemoveBackgroundConfig {
  /** null = detect automatically from the image's own corners */
  color: string | null;
  /** 0-100, how close to the target color a pixel needs to be to get removed */
  tolerance: number;
}

export interface NormalizeOutlineConfig {
  /** target stroke width, in pixels, for the redrawn outline */
  strokeWidth: number;
}

export type OutputFormat = "png" | "svg" | "ico";

export type RotateAngle = 0 | 90 | 180 | 270;

export interface AdjustmentConfig {
  outputFormat: OutputFormat;
  trim: boolean;
  resize: ResizeConfig | null;
  outputColor: string | null;
  removeBackground: RemoveBackgroundConfig | null;
  normalizeOutline: NormalizeOutlineConfig | null;
  rotate: RotateAngle;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export const DEFAULT_RESIZE: ResizeConfig = {
  width: 256,
  height: 256,
  mode: "stretch",
};
export const DEFAULT_OUTPUT_COLOR = "#000000";
export const DEFAULT_BACKGROUND_COLOR = "#ffffff";
export const DEFAULT_TOLERANCE = 20;
export const MIN_TOLERANCE = 0;
export const MAX_TOLERANCE = 100;
export const DEFAULT_STROKE_WIDTH = 4;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 50;

export const DEFAULT_CONFIG: AdjustmentConfig = {
  outputFormat: "png",
  trim: false,
  resize: null,
  outputColor: null,
  removeBackground: null,
  normalizeOutline: null,
  rotate: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export const ROTATE_ANGLES: RotateAngle[] = [0, 90, 180, 270];

export const MIN_DIMENSION = 1;
export const MAX_DIMENSION = 10000;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function resolveConfig(
  global: AdjustmentConfig,
  override: AdjustmentConfig | null
): AdjustmentConfig {
  return override ?? global;
}

export function getResizeError(resize: {
  width: number;
  height: number;
}): string | null {
  if (
    !Number.isInteger(resize.width) ||
    resize.width < MIN_DIMENSION ||
    resize.width > MAX_DIMENSION
  ) {
    return `Largura deve ser um número inteiro entre ${MIN_DIMENSION} e ${MAX_DIMENSION}`;
  }
  if (
    !Number.isInteger(resize.height) ||
    resize.height < MIN_DIMENSION ||
    resize.height > MAX_DIMENSION
  ) {
    return `Altura deve ser um número inteiro entre ${MIN_DIMENSION} e ${MAX_DIMENSION}`;
  }
  return null;
}

export function getOutputColorError(color: string): string | null {
  return isValidHexColor(color) ? null : "Cor inválida — use o formato #rrggbb";
}

export function getRemoveBackgroundError(
  config: RemoveBackgroundConfig
): string | null {
  if (config.color !== null && !isValidHexColor(config.color)) {
    return "Cor de fundo inválida";
  }
  if (
    !Number.isFinite(config.tolerance) ||
    config.tolerance < MIN_TOLERANCE ||
    config.tolerance > MAX_TOLERANCE
  ) {
    return `Tolerância deve ser um número entre ${MIN_TOLERANCE} e ${MAX_TOLERANCE}`;
  }
  return null;
}

export function getNormalizeOutlineError(
  config: NormalizeOutlineConfig
): string | null {
  if (
    !Number.isFinite(config.strokeWidth) ||
    config.strokeWidth < MIN_STROKE_WIDTH ||
    config.strokeWidth > MAX_STROKE_WIDTH
  ) {
    return `Espessura deve ser um número entre ${MIN_STROKE_WIDTH} e ${MAX_STROKE_WIDTH}`;
  }
  return null;
}

function isValidResizeShape(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const resize = value as Record<string, unknown>;
  if (typeof resize.width !== "number" || typeof resize.height !== "number") {
    return false;
  }
  if (
    resize.mode !== "stretch" &&
    resize.mode !== "proportional" &&
    resize.mode !== "original"
  ) {
    return false;
  }
  return getResizeError({ width: resize.width, height: resize.height }) === null;
}

function isValidRemoveBackgroundShape(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  if (config.color !== null && typeof config.color !== "string") return false;
  if (typeof config.tolerance !== "number") return false;
  return (
    getRemoveBackgroundError({
      color: config.color as string | null,
      tolerance: config.tolerance,
    }) === null
  );
}

function isValidNormalizeOutlineShape(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  if (typeof config.strokeWidth !== "number") return false;
  return (
    getNormalizeOutlineError({ strokeWidth: config.strokeWidth }) === null
  );
}

export function isValidAdjustmentConfig(
  value: unknown
): value is AdjustmentConfig {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Record<string, unknown>;

  if (
    config.outputFormat !== "png" &&
    config.outputFormat !== "svg" &&
    config.outputFormat !== "ico"
  ) {
    return false;
  }
  if (typeof config.trim !== "boolean") return false;
  if (config.outputColor !== null && !isValidHexColor(config.outputColor)) {
    return false;
  }
  if (!isValidResizeShape(config.resize)) return false;
  if (!isValidRemoveBackgroundShape(config.removeBackground)) return false;
  if (!isValidNormalizeOutlineShape(config.normalizeOutline)) return false;
  if (!ROTATE_ANGLES.includes(config.rotate as RotateAngle)) return false;
  if (typeof config.flipHorizontal !== "boolean") return false;
  if (typeof config.flipVertical !== "boolean") return false;

  return true;
}
