import {
  AdjustmentConfig,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_OUTPUT_COLOR,
  DEFAULT_RESIZE,
  DEFAULT_TOLERANCE,
  MAX_DIMENSION,
  MAX_TOLERANCE,
  MIN_DIMENSION,
  MIN_TOLERANCE,
  getOutputColorError,
  getRemoveBackgroundError,
  getResizeError,
  isValidHexColor,
} from "@/lib/image/config";

interface AdjustmentControlsProps {
  idPrefix: string;
  config: AdjustmentConfig;
  onChange: (config: AdjustmentConfig) => void;
}

export default function AdjustmentControls({
  idPrefix,
  config,
  onChange,
}: AdjustmentControlsProps) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <fieldset className="flex items-center gap-4">
        <legend className="mb-1 w-full text-gray-500 text-xs">
          Formato de saída
        </legend>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name={`${idPrefix}-output-format`}
            checked={config.outputFormat === "png"}
            onChange={() => onChange({ ...config, outputFormat: "png" })}
            className="accent-primary"
          />
          PNG
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name={`${idPrefix}-output-format`}
            checked={config.outputFormat === "svg"}
            onChange={() => onChange({ ...config, outputFormat: "svg" })}
            className="accent-primary"
          />
          SVG
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name={`${idPrefix}-output-format`}
            checked={config.outputFormat === "ico"}
            onChange={() => onChange({ ...config, outputFormat: "ico" })}
            className="accent-primary"
          />
          ICO
        </label>
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="accent-primary"
          checked={config.removeBackground !== null}
          onChange={(e) =>
            onChange({
              ...config,
              removeBackground: e.target.checked
                ? { color: null, tolerance: DEFAULT_TOLERANCE }
                : null,
            })
          }
        />
        Remover fundo
      </label>

      {config.removeBackground && (
        <div className="flex flex-col gap-2 pl-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-primary"
              checked={config.removeBackground.color === null}
              onChange={(e) =>
                onChange({
                  ...config,
                  removeBackground: {
                    ...config.removeBackground!,
                    color: e.target.checked ? null : DEFAULT_BACKGROUND_COLOR,
                  },
                })
              }
            />
            Detectar cor automaticamente
          </label>

          {config.removeBackground.color !== null && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.removeBackground.color}
                onChange={(e) =>
                  onChange({
                    ...config,
                    removeBackground: {
                      ...config.removeBackground!,
                      color: e.target.value,
                    },
                  })
                }
                className="bg-transparent border border-gray-300 dark:border-gray-700 rounded w-12 h-8"
                id={`${idPrefix}-bg-color`}
              />
              <span className="text-gray-500 text-xs">
                {config.removeBackground.color}
              </span>
            </div>
          )}

          <label className="flex items-center gap-2">
            Tolerância
            <input
              type="range"
              min={MIN_TOLERANCE}
              max={MAX_TOLERANCE}
              value={config.removeBackground.tolerance}
              className="accent-primary"
              onChange={(e) =>
                onChange({
                  ...config,
                  removeBackground: {
                    ...config.removeBackground!,
                    tolerance: Number(e.target.value),
                  },
                })
              }
              id={`${idPrefix}-bg-tolerance`}
            />
            <span className="text-gray-500 text-xs">
              {config.removeBackground.tolerance}
            </span>
          </label>

          {getRemoveBackgroundError(config.removeBackground) && (
            <p className="text-error text-xs">
              {getRemoveBackgroundError(config.removeBackground)}
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="accent-primary"
          checked={config.trim}
          onChange={(e) => onChange({ ...config, trim: e.target.checked })}
        />
        Cortar espaços vazios
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="accent-primary"
          checked={config.resize !== null}
          onChange={(e) =>
            onChange({
              ...config,
              resize: e.target.checked ? DEFAULT_RESIZE : null,
            })
          }
        />
        Redimensionar
      </label>

      {config.resize && (
        <div className="flex flex-col gap-1 pl-6">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              Largura
              <input
                type="number"
                min={MIN_DIMENSION}
                max={MAX_DIMENSION}
                value={config.resize.width}
                onChange={(e) =>
                  onChange({
                    ...config,
                    resize: {
                      ...config.resize!,
                      width: Number(e.target.value),
                    },
                  })
                }
                className="bg-transparent px-2 py-1 border border-gray-300 dark:border-gray-700 rounded w-20"
                id={`${idPrefix}-width`}
              />
            </label>
            <label className="flex items-center gap-1">
              Altura
              <input
                type="number"
                min={MIN_DIMENSION}
                max={MAX_DIMENSION}
                value={config.resize.height}
                onChange={(e) =>
                  onChange({
                    ...config,
                    resize: {
                      ...config.resize!,
                      height: Number(e.target.value),
                    },
                  })
                }
                className="bg-transparent px-2 py-1 border border-gray-300 dark:border-gray-700 rounded w-20"
                id={`${idPrefix}-height`}
              />
            </label>
          </div>
          {getResizeError(config.resize) && (
            <p className="text-error text-xs">
              {getResizeError(config.resize)}
            </p>
          )}
          {config.outputFormat === "ico" &&
            (config.resize.width > 256 || config.resize.height > 256) && (
              <p className="text-gray-500 text-xs">
                .ico não suporta mais que 256×256 — será reduzido
                automaticamente mantendo a proporção.
              </p>
            )}
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="accent-primary"
          checked={config.outputColor !== null}
          onChange={(e) =>
            onChange({
              ...config,
              outputColor: e.target.checked ? DEFAULT_OUTPUT_COLOR : null,
            })
          }
        />
        Alterar cor de saída
      </label>

      {config.outputColor !== null && (
        <div className="flex flex-col gap-1 pl-6">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                isValidHexColor(config.outputColor)
                  ? config.outputColor
                  : DEFAULT_OUTPUT_COLOR
              }
              onChange={(e) =>
                onChange({ ...config, outputColor: e.target.value })
              }
              className="bg-transparent border border-gray-300 dark:border-gray-700 rounded w-12 h-8"
              id={`${idPrefix}-output-color`}
            />
            <input
              type="text"
              value={config.outputColor}
              onChange={(e) =>
                onChange({ ...config, outputColor: e.target.value })
              }
              placeholder="#rrggbb"
              className="bg-transparent px-2 py-1 border border-gray-300 dark:border-gray-700 rounded w-24 font-mono text-xs"
              id={`${idPrefix}-output-color-text`}
            />
          </div>
          {getOutputColorError(config.outputColor) && (
            <p className="text-error text-xs">
              {getOutputColorError(config.outputColor)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
