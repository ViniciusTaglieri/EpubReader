import { RotateCcw } from "lucide-react";
import {
  themeColors,
  type ReaderSettings,
  type ReaderTheme,
  type ReadingMode,
  type SpreadMode,
  type TextAlignMode,
} from "./readerSettings";

type ReadingSettingsPopoverProps = {
  settings: ReaderSettings;
  onChange: (settings: Partial<ReaderSettings>) => void;
  onReset: () => void;
  onClose: () => void;
};

export function ReadingSettingsPopover({
  settings,
  onChange,
  onReset,
  onClose,
}: ReadingSettingsPopoverProps) {
  return (
    <aside
      className="absolute right-5 top-20 z-30 max-h-[calc(100vh-6rem)] w-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="false"
      aria-labelledby="reading-settings-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="reading-settings-title" className="font-semibold">
          Configurações de Exibição
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-neutral-300 transition hover:bg-white/10 hover:text-white"
          title="Redefinir ajustes de leitura"
          aria-label="Redefinir ajustes de leitura"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <label className="block">
        <span className="text-xs text-neutral-400">Fonte</span>
        <select
          value={settings.fontFamily}
          onChange={(event) => onChange({ fontFamily: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-900 px-3 outline-none"
        >
          <option value="Georgia, Times New Roman, serif">Georgia</option>
          <option value="Lora, Georgia, serif">Lora</option>
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="Verdana, Geneva, sans-serif">Verdana</option>
          <option value="OpenDyslexic, Arial, sans-serif">OpenDyslexic</option>
        </select>
      </label>

      <SettingSlider
        label="Tamanho da fonte"
        value={settings.fontSize}
        min={14}
        max={32}
        step={1}
        suffix="px"
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <SettingSlider
        label="Margem"
        value={settings.margin}
        min={24}
        max={140}
        step={4}
        suffix="px"
        onChange={(margin) => onChange({ margin })}
      />
      <SettingSlider
        label="Espacamento entre linhas"
        value={settings.lineHeight}
        min={1.2}
        max={2.2}
        step={0.05}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <SettingSlider
        label="Espacamento de paragrafo"
        value={settings.paragraphSpacing}
        min={0.4}
        max={2}
        step={0.05}
        suffix="em"
        onChange={(paragraphSpacing) => onChange({ paragraphSpacing })}
      />

      <ThemeButtons
        value={settings.theme}
        onChange={(theme) => onChange({ theme })}
      />
      <SegmentedButtons<TextAlignMode>
        label="Alinhamento"
        value={settings.textAlign}
        options={[
          ["left", "Esquerda"],
          ["justify", "Justificado"],
        ]}
        onChange={(textAlign) => onChange({ textAlign })}
      />
      <SegmentedButtons<ReadingMode>
        label="Modo de leitura"
        value={settings.readingMode}
        options={[
          ["paginated", "Paginado"],
          ["scroll", "Rolagem continua"],
        ]}
        onChange={(readingMode) => onChange({ readingMode })}
      />
      <SegmentedButtons<SpreadMode>
        label="Modo"
        value={settings.spreadMode}
        options={[
          ["single", "Uma pagina"],
          ["spread", "Duas paginas"],
        ]}
        disabled={settings.readingMode === "scroll"}
        onChange={(spreadMode) => onChange({ spreadMode })}
      />
    </aside>
  );
}

function ThemeButtons({
  value,
  onChange,
}: {
  value: ReaderTheme;
  onChange: (theme: ReaderTheme) => void;
}) {
  const options: Array<[ReaderTheme, string]> = [
    ["light", "Claro"],
    ["dark", "Escuro"],
    ["sepia", "Sepia"],
    ["oled", "OLED"],
  ];

  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">Tema</span>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {options.map(([theme, label]) => {
          const colors = themeColors(theme);
          const isSelected = value === theme;

          return (
            <button
              key={theme}
              type="button"
              onClick={() => onChange(theme)}
              aria-pressed={isSelected}
              className={`rounded-md border p-2 text-center transition ${
                isSelected
                  ? "border-amber-300 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]"
              }`}
              title={label}
            >
              <span
                className="mx-auto block h-7 w-7 rounded-full border border-white/20"
                style={{
                  backgroundColor: colors.background,
                  boxShadow: `inset 0 0 0 8px ${colors.ink}`,
                }}
              />
              <span className="mt-1 block text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedButtons<TValue extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<[TValue, string]>;
  disabled?: boolean;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">{label}</span>
      <div
        className={`mt-2 grid gap-2 ${options.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {options.map(([optionValue, optionLabel]) => {
          const isSelected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              disabled={disabled}
              onClick={() => onChange(optionValue)}
              aria-pressed={isSelected}
              className={`min-h-10 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isSelected
                  ? "border-amber-300 bg-amber-300/15 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]"
              }`}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-200">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-amber-300"
      />
    </label>
  );
}
