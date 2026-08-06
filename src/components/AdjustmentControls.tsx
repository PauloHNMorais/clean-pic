import {
  AdjustmentConfig,
  DEFAULT_OUTPUT_COLOR,
  DEFAULT_RESIZE,
  MAX_DIMENSION,
  MIN_DIMENSION,
  getResizeError,
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
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.toSvg}
          onChange={(e) => onChange({ ...config, toSvg: e.target.checked })}
        />
        Transformar em SVG
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.trim}
          onChange={(e) => onChange({ ...config, trim: e.target.checked })}
        />
        Cortar espaços vazios
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
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
                className="w-20 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1"
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
                className="w-20 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1"
                id={`${idPrefix}-height`}
              />
            </label>
          </div>
          {getResizeError(config.resize) && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {getResizeError(config.resize)}
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
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
        <div className="flex items-center gap-2 pl-6">
          <input
            type="color"
            value={config.outputColor}
            onChange={(e) =>
              onChange({ ...config, outputColor: e.target.value })
            }
            className="h-8 w-12 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
            id={`${idPrefix}-output-color`}
          />
          <span className="text-xs text-gray-500">
            {config.outputColor}
          </span>
        </div>
      )}
    </div>
  );
}
