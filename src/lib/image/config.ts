export interface ResizeConfig {
  width: number;
  height: number;
}

export interface AdjustmentConfig {
  toSvg: boolean;
  trim: boolean;
  resize: ResizeConfig | null;
  outputColor: string | null;
}

export const DEFAULT_RESIZE: ResizeConfig = { width: 256, height: 256 };
export const DEFAULT_OUTPUT_COLOR = "#000000";

export const DEFAULT_CONFIG: AdjustmentConfig = {
  toSvg: false,
  trim: false,
  resize: null,
  outputColor: null,
};

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

export function getResizeError(resize: ResizeConfig): string | null {
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

export function isValidAdjustmentConfig(
  value: unknown
): value is AdjustmentConfig {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Record<string, unknown>;
  if (typeof config.toSvg !== "boolean") return false;
  if (typeof config.trim !== "boolean") return false;

  if (config.outputColor !== null && !isValidHexColor(config.outputColor)) {
    return false;
  }

  if (config.resize === null) return true;
  if (typeof config.resize !== "object" || config.resize === null) return false;

  const resize = config.resize as Record<string, unknown>;
  if (typeof resize.width !== "number" || typeof resize.height !== "number") {
    return false;
  }

  return (
    getResizeError({ width: resize.width, height: resize.height }) === null
  );
}
