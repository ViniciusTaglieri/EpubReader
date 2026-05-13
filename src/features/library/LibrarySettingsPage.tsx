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
} from "lucide-react";
import type { ReactNode } from "react";
import type { BookDto, CollectionDto } from "../../shared/types/books";
import type { LibraryFilters } from "./libraryFilters";
import type { LibraryView } from "./libraryTypes";

type LibrarySettingsPageProps = {
  books: BookDto[];
  collections: CollectionDto[];
  view: LibraryView;
  filters: LibraryFilters;
  sidebarCollapsed: boolean;
  onViewChange: (view: LibraryView) => void;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
};

export function LibrarySettingsPage({
  books,
  collections,
  view,
  filters,
  sidebarCollapsed,
  onViewChange,
  onSidebarCollapsedChange,
}: LibrarySettingsPageProps) {
  const stats = libraryStats(books, collections);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={<Library size={18} />} label="Livros" value={stats.books} />
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SettingsPanel
          icon={<Eye size={18} />}
          title="Biblioteca"
          description="Preferências visuais usadas para navegar pelos livros."
        >
          <div className="space-y-4">
            <SettingRow
              title="Visualização padrão"
              description="Escolha como a biblioteca aparece ao abrir o app."
            >
              <div className="flex overflow-hidden rounded-md border border-white/10 bg-neutral-950">
                <ToggleButton
                  active={view === "grid"}
                  label="Grade"
                  onClick={() => onViewChange("grid")}
                />
                <ToggleButton
                  active={view === "list"}
                  label="Lista"
                  onClick={() => onViewChange("list")}
                />
              </div>
            </SettingRow>
            <SettingRow
              title="Sidebar recolhida"
              description="Mantenha a navegação lateral mais compacta."
            >
              <button
                type="button"
                onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}
                aria-pressed={sidebarCollapsed}
                className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
                  sidebarCollapsed
                    ? "border-amber-300/40 bg-amber-300/15 text-amber-100"
                    : "border-white/10 text-neutral-300 hover:bg-white/10"
                }`}
              >
                <PanelLeftClose size={14} />
                {sidebarCollapsed ? "Ativa" : "Desativada"}
              </button>
            </SettingRow>
            <SettingRow
              title="Ordenação atual"
              description="A biblioteca preserva automaticamente filtro e ordenação."
            >
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-neutral-300">
                {sortLabel(filters.sortBy)}
              </span>
            </SettingRow>
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={<Keyboard size={18} />}
          title="Leitura"
          description="Atalhos e comportamento recomendados para leitura paginada."
        >
          <div className="grid gap-3">
            <InfoLine label="Seta direita" value="Próxima página" />
            <InfoLine label="Seta esquerda" value="Página anterior" />
            <InfoLine label="Scroll no modo paginado" value="Avança ou volta página" />
            <InfoLine label="Progresso" value="Salvo automaticamente" />
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={<Database size={18} />}
          title="Manutenção"
          description="Resumo da biblioteca local e do armazenamento gerenciado pelo app."
        >
          <div className="grid gap-3">
            <InfoLine label="Tamanho estimado" value={stats.estimatedPages} />
            <InfoLine label="Último livro aberto" value={stats.lastOpened} />
            <InfoLine label="Armazenamento" value="Local, gerenciado pelo Tauri" />
            <InfoLine label="Versão" value="0.1.0" />
          </div>
        </SettingsPanel>

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
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 text-amber-200" size={18} />
          <div>
            <h3 className="text-sm font-semibold text-white">
              Ações de manutenção
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              Limpeza de cache, exportação e troca de diretório devem ser
              adicionadas somente quando houver comandos seguros no backend.
            </p>
          </div>
        </div>
      </section>
    </div>
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

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 px-3 text-xs font-semibold transition ${
        active
          ? "bg-amber-300/15 text-amber-100"
          : "text-neutral-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
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

function libraryStats(books: BookDto[], collections: CollectionDto[]) {
  const reading = books.filter((book) => book.readingStatus === "reading").length;
  const favorites = books.filter((book) => book.isFavorite).length;
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
    favorites,
    collections: collections.length,
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
