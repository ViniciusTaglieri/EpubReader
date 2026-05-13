import {
  BookOpen,
  Database,
  Eye,
  FolderOpen,
  HardDrive,
  Heart,
  Keyboard,
  Library,
  Lock,
  PanelLeftClose,
  RotateCcw,
  ShieldCheck,
  Type,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { BookDto, CollectionDto } from "../../shared/types/books";
import type { ReaderSettings } from "../reader/epubCfiReader";
import type { LibraryFilters } from "./libraryFilters";
import type { LibraryPreferences } from "./libraryPreferences";
import type { LibraryView } from "./libraryTypes";

type SettingsTab = "general" | "reading" | "maintenance" | "security";

type LibrarySettingsPageProps = {
  books: BookDto[];
  collections: CollectionDto[];
  view: LibraryView;
  filters: LibraryFilters;
  sidebarCollapsed: boolean;
  preferences: LibraryPreferences;
  readerSettings: ReaderSettings;
  onViewChange: (view: LibraryView) => void;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  onPreferencesChange: (preferences: Partial<LibraryPreferences>) => void;
  onReaderSettingsChange: (settings: Partial<ReaderSettings>) => void;
};

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const stats = libraryStats(books, collections);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={<Library size={18} />} label="Livros" value={stats.books} />
        <StatCard icon={<BookOpen size={18} />} label="Em leitura" value={stats.reading} />
        <StatCard icon={<Heart size={18} />} label="Favoritos" value={stats.favorites} />
        <StatCard icon={<FolderOpen size={18} />} label="Coleções" value={stats.collections} />
      </section>

      <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
        <TabButton active={activeTab === "general"} onClick={() => setActiveTab("general")}>
          Geral
        </TabButton>
        <TabButton active={activeTab === "reading"} onClick={() => setActiveTab("reading")}>
          Leitura
        </TabButton>
        <TabButton
          active={activeTab === "maintenance"}
          onClick={() => setActiveTab("maintenance")}
        >
          Manutenção
        </TabButton>
        <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")}>
          Segurança
        </TabButton>
      </div>

      {activeTab === "general" ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <SettingsPanel
            icon={<Eye size={18} />}
            title="Aparência da biblioteca"
            description="Preferências visuais usadas para navegar pelos livros."
          >
            <div className="space-y-4">
              <SettingRow title="Tema do app" description="Escolha a base visual da biblioteca.">
                <SegmentedControl
                  value={preferences.theme}
                  options={[
                    ["dark", "Escuro"],
                    ["light", "Claro"],
                    ["system", "Sistema"],
                  ]}
                  onChange={(theme) => onPreferencesChange({ theme })}
                />
              </SettingRow>
              <SettingRow title="Densidade" description="Controle o respiro entre livros.">
                <SegmentedControl
                  value={preferences.density}
                  options={[
                    ["comfortable", "Confortável"],
                    ["compact", "Compacta"],
                  ]}
                  onChange={(density) => onPreferencesChange({ density })}
                />
              </SettingRow>
              <SettingRow title="Visualização padrão" description="Como a biblioteca aparece ao abrir.">
                <SegmentedControl
                  value={view}
                  options={[
                    ["grid", "Grade"],
                    ["list", "Lista"],
                  ]}
                  onChange={onViewChange}
                />
              </SettingRow>
              <SettingRow title="Sidebar recolhida" description="Mantenha a navegação lateral compacta.">
                <ToggleButton
                  active={sidebarCollapsed}
                  label={sidebarCollapsed ? "Ativa" : "Desativada"}
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
              <InfoLine label="Ordenação atual" value={sortLabel(filters.sortBy)} />
              <InfoLine label="Tamanho estimado" value={stats.estimatedPages} />
              <InfoLine label="Último livro aberto" value={stats.lastOpened} />
              <InfoLine label="Livros concluídos" value={String(stats.finished)} />
            </div>
          </SettingsPanel>
        </section>
      ) : null}

      {activeTab === "reading" ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <SettingsPanel
            icon={<Type size={18} />}
            title="Padrões de leitura"
            description="Aplicados como preferência global do leitor."
          >
            <div className="space-y-4">
              <SettingRow title="Tema de leitura" description="Base visual para o conteúdo do livro.">
                <SegmentedControl
                  value={readerSettings.theme}
                  options={[
                    ["sepia", "Sépia"],
                    ["light", "Claro"],
                    ["dark", "Escuro"],
                    ["oled", "OLED"],
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
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={<Keyboard size={18} />}
            title="Navegação e atalhos"
            description="Comportamentos usados no modo paginado."
          >
            <div className="space-y-4">
              <SettingRow title="Scroll vira página" description="Use a roda do mouse/trackpad para navegar.">
                <ToggleButton
                  active={preferences.wheelPageTurn}
                  label={preferences.wheelPageTurn ? "Ativo" : "Inativo"}
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
                <InfoLine label="Esc" value="Fecha painéis e diálogos" />
                <InfoLine label="Progresso" value="Salvo automaticamente" />
              </div>
            </div>
          </SettingsPanel>
        </section>
      ) : null}

      {activeTab === "maintenance" ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <SettingsPanel
            icon={<HardDrive size={18} />}
            title="Manutenção"
            description="Ações que exigem comandos seguros no backend aparecem bloqueadas."
          >
            <div className="grid gap-3">
              <DisabledAction title="Abrir pasta de dados" description="Requer comando Tauri dedicado." />
              <DisabledAction title="Recriar índice de busca" description="Planejado para livros já importados." />
              <DisabledAction title="Limpar cache seguro" description="Só deve remover dados recriáveis." />
              <DisabledAction title="Exportar backup" description="Deve incluir biblioteca, progresso e coleções." />
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={<RotateCcw size={18} />}
            title="Integridade"
            description="Resumo do que pode ser verificado em uma próxima etapa."
          >
            <div className="grid gap-3">
              <InfoLine label="Livros sem capa" value={String(stats.missingCovers)} />
              <InfoLine label="Metadados incompletos" value={String(stats.incompleteMetadata)} />
              <InfoLine label="Armazenamento" value="Local, gerenciado pelo Tauri" />
              <InfoLine label="Versão" value="0.1.0" />
            </div>
          </SettingsPanel>
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <SettingsPanel
            icon={<Lock size={18} />}
            title="Segurança e importação"
            description="Proteções aplicadas ao lidar com arquivos EPUB locais."
          >
            <div className="grid gap-3">
              <InfoLine label="Entrada" value="Somente arquivos .epub" />
              <InfoLine label="ZIP interno" value="Limites contra arquivos abusivos" />
              <InfoLine label="Conteúdo HTML" value="Scripts e links perigosos bloqueados" />
              <InfoLine label="Dados" value="Persistidos localmente no app" />
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={<ShieldCheck size={18} />}
            title="Próximas proteções recomendadas"
            description="Opções úteis quando houver suporte dedicado no leitor."
          >
            <div className="grid gap-3">
              <DisabledAction title="Confirmar links externos" description="Evita saída acidental do app." />
              <DisabledAction title="Bloquear imagens remotas" description="Reduz vazamento de contexto de leitura." />
              <DisabledAction title="Relatório de integridade" description="Lista arquivos ausentes ou corrompidos." />
            </div>
          </SettingsPanel>
        </section>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-amber-300/15 text-amber-100"
          : "text-neutral-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SettingsPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <header className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-amber-300/20 bg-amber-300/10 text-amber-100">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-100">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-white/10 bg-neutral-950">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue)}
          className={`h-9 px-3 text-xs font-semibold transition ${
            value === optionValue
              ? "bg-amber-300/15 text-amber-100"
              : "text-neutral-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ToggleButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
        active
          ? "border-amber-300/40 bg-amber-300/15 text-amber-100"
          : "border-white/10 text-neutral-300 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
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
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">{label}</span>
        <span className="text-amber-200">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-neutral-950/40 px-3 py-2">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="truncate text-right text-xs font-medium text-neutral-200">
        {value}
      </span>
    </div>
  );
}

function DisabledAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-neutral-950/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-200">{title}</p>
        <p className="mt-1 text-[11px] text-neutral-500">{description}</p>
      </div>
      <span className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-500">
        Em breve
      </span>
    </div>
  );
}

function libraryStats(books: BookDto[], collections: CollectionDto[]) {
  const reading = books.filter((book) => book.readingStatus === "reading").length;
  const finished = books.filter((book) => book.readingStatus === "finished").length;
  const favorites = books.filter((book) => book.isFavorite).length;
  const missingCovers = books.filter((book) => !book.coverPath).length;
  const incompleteMetadata = books.filter(
    (book) => !book.author || !book.publisher || !book.publishedAt,
  ).length;
  const estimatedPages = books.reduce(
    (total, book) => total + Math.max(0, Math.round(book.textLength / 1800)),
    0,
  );
  const lastOpenedBook = books
    .filter((book) => book.lastOpenedAt)
    .sort((left, right) =>
      String(right.lastOpenedAt).localeCompare(String(left.lastOpenedAt)),
    )[0];

  return {
    books: books.length,
    reading,
    finished,
    favorites,
    collections: collections.length,
    missingCovers,
    incompleteMetadata,
    estimatedPages: estimatedPages
      ? `${estimatedPages} páginas`
      : "Ainda não calculado",
    lastOpened: lastOpenedBook?.title ?? "Nenhum livro aberto",
  };
}

function sortLabel(sortBy: LibraryFilters["sortBy"]) {
  if (sortBy === "last_opened") return "Último aberto";
  if (sortBy === "published_at") return "Data de publicação";
  if (sortBy === "title") return "Título";
  if (sortBy === "author") return "Autor";
  if (sortBy === "progress") return "Progresso";
  return "Tamanho do livro";
}
