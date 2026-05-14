import type { ComponentType } from 'react'
import {
  AlignJustify,
  AlignLeft,
  BookOpen,
  Columns2,
  RotateCcw,
  ScrollText,
  Square,
} from 'lucide-react'
import {
  readerShellColors,
  type EpubTocItem,
  type ReaderFlow,
  type ReaderSettings,
  type ReaderSpread,
  type ReaderTextAlign,
  type ReaderTheme,
} from './epubCfiReader'

type ReaderTocItem = EpubTocItem & {
  depth: number
}

type TocPanelProps = {
  items: ReaderTocItem[]
  currentIndex: number
  onSelect: (item: ReaderTocItem, index: number) => void
  onClose: () => void
}

export function TocPanel({
  items,
  currentIndex,
  onSelect,
  onClose,
}: TocPanelProps) {
  return (
    <aside
      className="absolute right-20 top-20 z-30 max-h-[calc(100vh-6rem)] w-96 overflow-hidden rounded-lg border border-white/10 bg-[#1f1d1a] text-sm text-neutral-100 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="false"
      aria-labelledby="toc-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <h2 id="toc-title" className="font-semibold">
          Sumário
        </h2>
      </div>
      <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-2">
        {items.map((item, index) => {
          const isCurrent = index === currentIndex
          return (
            <button
              key={`${item.href}-${index}`}
              type="button"
              onClick={() => onSelect(item, index)}
              aria-current={isCurrent ? 'location' : undefined}
              className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${
                isCurrent
                  ? 'bg-amber-300/15 text-amber-100'
                  : 'text-neutral-300 hover:bg-white/[0.07] hover:text-white'
              }`}
              style={{ paddingLeft: `${12 + item.depth * 16}px` }}
              title={item.label}
            >
              <span className="line-clamp-2">{item.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

type ReaderSettingsPanelProps = {
  settings: ReaderSettings
  onChange: (settings: Partial<ReaderSettings>) => void
  onReset: () => void
  onClose: () => void
}

export function ReaderSettingsPanel({
  settings,
  onChange,
  onReset,
  onClose,
}: ReaderSettingsPanelProps) {
  return (
    <aside
      className="absolute right-5 top-20 z-30 max-h-[calc(100vh-6rem)] w-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="false"
      aria-labelledby="reading-settings-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
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
          <option value="Georgia, serif">Georgia</option>
          <option value="Lora, Georgia, serif">Lora</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="OpenDyslexic, Arial, sans-serif">OpenDyslexic</option>
        </select>
      </label>

      <SettingSlider
        label="Tamanho da fonte"
        value={settings.fontSize}
        min={12}
        max={34}
        step={1}
        suffix="px"
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <SettingSlider
        label="Margem"
        value={settings.margin}
        min={0}
        max={96}
        step={4}
        suffix="px"
        onChange={(margin) => onChange({ margin })}
      />
      <SettingSlider
        label="Espaçamento entre linhas"
        value={settings.lineHeight}
        min={1.1}
        max={2.2}
        step={0.05}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <SettingSlider
        label="Espaçamento de parágrafo"
        value={settings.paragraphSpacing}
        min={0}
        max={2.4}
        step={0.05}
        suffix="em"
        onChange={(paragraphSpacing) => onChange({ paragraphSpacing })}
      />

      <ThemeButtons
        value={settings.theme}
        onChange={(theme) => onChange({ theme })}
      />
      <SegmentedButtons<ReaderTextAlign>
        label="Alinhamento"
        value={settings.textAlign}
        options={[
          ['left', 'Esquerda', AlignLeft],
          ['justify', 'Justificado', AlignJustify],
        ]}
        onChange={(textAlign) => onChange({ textAlign })}
      />
      <SegmentedButtons<ReaderFlow>
        label="Modo de leitura"
        value={settings.flow}
        options={[
          ['paginated', 'Paginado', BookOpen],
          ['continuous', 'Rolagem contínua', ScrollText],
        ]}
        onChange={(flow) => onChange({ flow })}
      />
      <SegmentedButtons<ReaderSpread>
        label="Modo"
        value={settings.spread}
        options={[
          ['single', 'Uma página', Square],
          ['double', 'Duas páginas', Columns2],
        ]}
        disabled={settings.flow === 'continuous'}
        onChange={(spread) => onChange({ spread })}
      />
    </aside>
  )
}

function ThemeButtons({
  value,
  onChange,
}: {
  value: ReaderTheme
  onChange: (theme: ReaderTheme) => void
}) {
  const options: Array<[ReaderTheme, string]> = [
    ['light', 'Claro'],
    ['dark', 'Escuro'],
    ['sepia', 'Sepia'],
    ['oled', 'OLED'],
  ]

  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">Tema</span>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {options.map(([theme, label]) => {
          const colors = readerShellColors(theme)
          const isSelected = value === theme

          return (
            <button
              key={theme}
              type="button"
              onClick={() => onChange(theme)}
              aria-pressed={isSelected}
              className={`rounded-md border p-2 text-center transition ${
                isSelected
                  ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                  : 'border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]'
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
          )
        })}
      </div>
    </div>
  )
}

function SegmentedButtons<TValue extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string
  value: TValue
  options: Array<[TValue, string, ComponentType<{ size?: number }>]>
  disabled?: boolean
  onChange: (value: TValue) => void
}) {
  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">{label}</span>
      <div
        className={`mt-2 grid gap-2 ${
          options.length > 2 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {options.map(([optionValue, optionLabel, Icon]) => {
          const isSelected = value === optionValue
          return (
            <button
              key={optionValue}
              type="button"
              disabled={disabled}
              onClick={() => onChange(optionValue)}
              aria-pressed={isSelected}
              className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isSelected
                  ? 'border-amber-300 bg-amber-300/15 text-amber-100'
                  : 'border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]'
              }`}
            >
              <Icon size={15} />
              {optionLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (value: number) => void
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
  )
}
