export interface ResizeConfig {
  width: number;
  height: number;
}

export interface RemoveBackgroundConfig {
  /** null = detect automatically from the image's own corners */
  color: string | null;
  /** 0-100, how close to the target color a pixel needs to be to get removed */
  tolerance: number;
}

export interface AdjustmentConfig {
  toSvg: boolean;
  trim: boolean;
  resize: ResizeConfig | null;
  outputColor: string | null;
  removeBackground: RemoveBackgroundConfig | null;
}

export const DEFAULT_RESIZE: ResizeConfig = { width: 256, height: 256 };
export const DEFAULT_OUTPUT_COLOR = "#000000";
export const DEFAULT_BACKGROUND_COLOR = "#ffffff";
export const DEFAULT_TOLERANCE = 20;
export const MIN_TOLERANCE = 0;
export const MAX_TOLERANCE = 100;

export const DEFAULT_CONFIG: AdjustmentConfig = {
  toSvg: false,
  trim: false,
  resize: null,
  outputColor: null,
  removeBackground: null,
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

function isValidResizeShape(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const resize = value as Record<string, unknown>;
  if (typeof resize.width !== "number" || typeof resize.height !== "number") {
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
  if (!isValidResizeShape(config.resize)) return false;
  if (!isValidRemoveBackgroundShape(config.removeBackground)) return false;

  return true;
}
