import {
  BookOpen,
  Database,
  Eye,
  FolderOpen,
  Heart,
  Keyboard,
  Library,
  PanelLeftClose,
  Type,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { BookDto, CollectionDto } from '../../shared/types/books'
import type {
  ReaderFlow,
  ReaderSettings,
  ReaderSpread,
  ReaderTextAlign,
} from '../reader/epubCfiReader'
import type { LibraryFilters } from './libraryFilters'
import type { LibraryPreferences } from './libraryPreferences'
import type { LibraryView } from './libraryTypes'

type LibrarySettingsPageProps = {
  books: BookDto[]
  collections: CollectionDto[]
  view: LibraryView
  filters: LibraryFilters
  sidebarCollapsed: boolean
  preferences: LibraryPreferences
  readerSettings: ReaderSettings
  onViewChange: (view: LibraryView) => void
  onSidebarCollapsedChange: (collapsed: boolean) => void
  onPreferencesChange: (preferences: Partial<LibraryPreferences>) => void
  onReaderSettingsChange: (settings: Partial<ReaderSettings>) => void
}

export function LibrarySettingsPage({
  books,
  collections,
  view,
  filters,
  sidebarCollapsed,
  preferences,
  readerSettings,
  onViewChange,
  onSidebarCollapsedChange,
  onPreferencesChange,
  onReaderSettingsChange,
}: LibrarySettingsPageProps) {
  const stats = libraryStats(books, collections)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<Library size={18} />}
          label="Livros"
          value={stats.books}
        />
        <StatCard
          icon={<BookOpen size={18} />}
          label="Em leitura"
          value={stats.reading}
        />
        <StatCard
          icon={<Heart size={18} />}
          label="Favoritos"
          value={stats.favorites}
        />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Coleções"
          value={stats.collections}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SettingsPanel
          icon={<Eye size={18} />}
          title="Aparência da biblioteca"
          description="Preferências visuais usadas para navegar pelos livros."
        >
          <div className="space-y-4">
            <SettingRow
              title="Tema do app"
              description="Escolha a base visual da biblioteca."
            >
              <SegmentedControl
                value={preferences.theme}
                options={[
                  ['dark', 'Escuro'],
                  ['light', 'Claro'],
                  ['system', 'Sistema'],
                ]}
                onChange={(theme) => onPreferencesChange({ theme })}
              />
            </SettingRow>
            <SettingRow
              title="Densidade"
              description="Controle o respiro entre livros."
            >
              <SegmentedControl
                value={preferences.density}
                options={[
                  ['comfortable', 'Confortável'],
                  ['compact', 'Compacta'],
                ]}
                onChange={(density) => onPreferencesChange({ density })}
              />
            </SettingRow>
            <SettingRow
              title="Visualização padrão"
              description="Como a biblioteca aparece ao abrir."
            >
              <SegmentedControl
                value={view}
                options={[
                  ['grid', 'Grade'],
                  ['list', 'Lista'],
                ]}
                onChange={onViewChange}
              />
            </SettingRow>
            <SettingRow
              title="Sidebar recolhida"
              description="Mantenha a navegação lateral compacta."
            >
              <ToggleButton
                active={sidebarCollapsed}
                label={sidebarCollapsed ? 'Ativa' : 'Desativada'}
                icon={<PanelLeftClose size={14} />}
                onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}
              />
            </SettingRow>
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={<Database size={18} />}
          title="Estado da biblioteca"
          description="Dados atuais usados para organização e leitura."
        >
          <div className="grid gap-3">
            <InfoLine
              label="Ordenação atual"
              value={sortLabel(filters.sortBy)}
            />
            <InfoLine label="Tamanho estimado" value={stats.estimatedPages} />
            <InfoLine label="Último livro aberto" value={stats.lastOpened} />
            <InfoLine
              label="Livros concluídos"
              value={String(stats.finished)}
            />
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={<Type size={18} />}
          title="Aparência do texto"
          description="Preferências globais aplicadas ao conteúdo do livro."
        >
          <div className="space-y-4">
            <SettingRow
              title="Fonte"
              description="Família tipográfica usada no leitor."
            >
              <SelectControl
                value={readerSettings.fontFamily}
                options={[
                  ['Georgia, serif', 'Georgia'],
                  ['Lora, Georgia, serif', 'Lora'],
                  ['Arial, sans-serif', 'Arial'],
                  ['Verdana, sans-serif', 'Verdana'],
                  ['OpenDyslexic, Arial, sans-serif', 'OpenDyslexic'],
                ]}
                onChange={(fontFamily) =>
                  onReaderSettingsChange({ fontFamily })
                }
              />
            </SettingRow>
            <SettingRow
              title="Tema de leitura"
              description="Base visual para o conteúdo do livro."
            >
              <SegmentedControl
                value={readerSettings.theme}
                options={[
                  ['sepia', 'Sépia'],
                  ['light', 'Claro'],
                  ['dark', 'Escuro'],
                  ['oled', 'OLED'],
                ]}
                onChange={(theme) => onReaderSettingsChange({ theme })}
              />
            </SettingRow>
            <SettingSlider
              label="Tamanho da fonte"
              value={readerSettings.fontSize}
              min={12}
              max={34}
              suffix="px"
              onChange={(fontSize) => onReaderSettingsChange({ fontSize })}
            />
            <SettingSlider
              label="Margem"
              value={readerSettings.margin}
              min={0}
              max={96}
              step={4}
              suffix="px"
              onChange={(margin) => onReaderSettingsChange({ margin })}
            />
            <SettingSlider
              label="Espaçamento de linha"
              value={readerSettings.lineHeight}
              min={1.1}
              max={2.2}
              step={0.05}
              onChange={(lineHeight) => onReaderSettingsChange({ lineHeight })}
            />
            <SettingSlider
              label="Espaçamento de parágrafo"
              value={readerSettings.paragraphSpacing}
              min={0}
              max={2.4}
              step={0.05}
              suffix="em"
              onChange={(paragraphSpacing) =>
                onReaderSettingsChange({ paragraphSpacing })
              }
            />
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={<Keyboard size={18} />}
          title="Layout e navegação"
          description="Controles disponíveis também no painel do leitor."
        >
          <div className="space-y-4">
            <SettingRow
              title="Alinhamento"
              description="Como o texto ocupa a largura da página."
            >
              <SegmentedControl<ReaderTextAlign>
                value={readerSettings.textAlign}
                options={[
                  ['left', 'Esquerda'],
                  ['justify', 'Justificado'],
                ]}
                onChange={(textAlign) => onReaderSettingsChange({ textAlign })}
              />
            </SettingRow>
            <SettingRow
              title="Modo de leitura"
              description="Paginação lateral ou rolagem contínua."
            >
              <SegmentedControl<ReaderFlow>
                value={readerSettings.flow}
                options={[
                  ['paginated', 'Paginado'],
                  ['continuous', 'Contínuo'],
                ]}
                onChange={(flow) => onReaderSettingsChange({ flow })}
              />
            </SettingRow>
            <SettingRow
              title="Modo de página"
              description="Uma ou duas páginas no modo paginado."
            >
              <SegmentedControl<ReaderSpread>
                value={readerSettings.spread}
                options={[
                  ['single', 'Uma'],
                  ['double', 'Duas'],
                ]}
                disabled={readerSettings.flow === 'continuous'}
                onChange={(spread) => onReaderSettingsChange({ spread })}
              />
            </SettingRow>
            <SettingRow
              title="Scroll vira página"
              description="Use a roda do mouse/trackpad para navegar."
            >
              <ToggleButton
                active={preferences.wheelPageTurn}
                label={preferences.wheelPageTurn ? 'Ativo' : 'Inativo'}
                onClick={() =>
                  onPreferencesChange({
                    wheelPageTurn: !preferences.wheelPageTurn,
                  })
                }
              />
            </SettingRow>
            <div className="grid gap-3">
              <InfoLine label="Seta direita" value="Próxima página" />
              <InfoLine label="Seta esquerda" value="Página anterior" />
            </div>
          </div>
        </SettingsPanel>
      </section>
    </div>
  )
}

function SettingsPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <header className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-amber-300/20 bg-amber-300/10 text-amber-100">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-neutral-400">
            {description}
          </p>
        </div>
      </header>
      {children}
    </section>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-100">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SegmentedControl<TValue extends string>({
  value,
  options,
  disabled = false,
  onChange,
}: {
  value: TValue
  options: Array<[TValue, string]>
  disabled?: boolean
  onChange: (value: TValue) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-white/10 bg-neutral-950">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          disabled={disabled}
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue)}
          className={`h-9 px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            value === optionValue
              ? 'bg-amber-300/15 text-amber-100'
              : 'text-neutral-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SelectControl<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue
  options: Array<[TValue, string]>
  onChange: (value: TValue) => void
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TValue)}
      className="h-9 max-w-56 rounded-md border border-white/10 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 outline-none ring-amber-300/30 transition focus:ring-4"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  )
}

function ToggleButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
        active
          ? 'border-amber-300/40 bg-amber-300/15 text-amber-100'
          : 'border-white/10 text-neutral-300 hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm text-neutral-100">
        <span>{label}</span>
        <span className="text-xs text-neutral-400">
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">{label}</span>
        <span className="text-amber-200">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-neutral-950/40 px-3 py-2">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="truncate text-right text-xs font-medium text-neutral-200">
        {value}
      </span>
    </div>
  )
}

function libraryStats(books: BookDto[], collections: CollectionDto[]) {
  const reading = books.filter(
    (book) => book.readingStatus === 'reading',
  ).length
  const finished = books.filter(
    (book) => book.readingStatus === 'finished',
  ).length
  const favorites = books.filter((book) => book.isFavorite).length
  const estimatedPages = books.reduce(
    (total, book) => total + Math.max(0, Math.round(book.textLength / 1800)),
    0,
  )
  const lastOpenedBook = books
    .filter((book) => book.lastOpenedAt)
    .sort((left, right) =>
      String(right.lastOpenedAt).localeCompare(String(left.lastOpenedAt)),
    )[0]

  return {
    books: books.length,
    reading,
    finished,
    favorites,
    collections: collections.length,
    estimatedPages: estimatedPages
      ? `${estimatedPages} páginas`
      : 'Ainda não calculado',
    lastOpened: lastOpenedBook?.title ?? 'Nenhum livro aberto',
  }
}

function sortLabel(sortBy: LibraryFilters['sortBy']) {
  if (sortBy === 'last_opened') return 'Último aberto'
  if (sortBy === 'published_at') return 'Data de publicação'
  if (sortBy === 'title') return 'Título'
  if (sortBy === 'author') return 'Autor'
  if (sortBy === 'progress') return 'Progresso'
  return 'Tamanho do livro'
}
