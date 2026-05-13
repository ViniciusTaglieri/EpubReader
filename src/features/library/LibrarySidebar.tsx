import type { ReactNode } from "react";
import {
  BookMarked,
  ChevronDown,
  FolderOpen,
  Library,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import type { CollectionDto } from "../../shared/types/books";
import type { LibrarySection } from "./libraryTypes";

type LibrarySidebarProps = {
  collapsed: boolean;
  collectionsExpanded: boolean;
  collections: CollectionDto[];
  activeSection: LibrarySection;
  selectedCollectionId: string | null;
  onToggleCollapsed: () => void;
  onOpenLibrary: () => void;
  onToggleCollections: () => void;
  onOpenCollection: (collectionId: string) => void;
  onOpenSettings: () => void;
};

export function LibrarySidebar({
  collapsed,
  collectionsExpanded,
  collections,
  activeSection,
  selectedCollectionId,
  onToggleCollapsed,
  onOpenLibrary,
  onToggleCollections,
  onOpenCollection,
  onOpenSettings,
}: LibrarySidebarProps) {
  return (
    <aside
      className={`h-screen shrink-0 overflow-y-auto border-r border-white/10 bg-black/25 p-4 transition-[width] ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <nav className="space-y-2" aria-label="Navegacao da biblioteca">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BookMarked className="text-amber-300" size={28} />
            {collapsed ? null : (
              <h1 className="truncate text-xl font-bold">Leitor EPUB</h1>
            )}
          </div>
        </div>
        <SideItem
          icon={<PanelLeftOpen size={22} />}
          label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          collapsed={collapsed}
          onClick={onToggleCollapsed}
        />
        <SideItem
          icon={<Library size={22} />}
          label="Biblioteca"
          collapsed={collapsed}
          active={activeSection === "library"}
          onClick={onOpenLibrary}
        />
        <SideItem
          icon={<FolderOpen size={22} />}
          label="Colecoes"
          collapsed={collapsed}
          active={activeSection === "collections" && !selectedCollectionId}
          trailingIcon={
            collapsed ? null : (
              <ChevronDown
                size={16}
                className={`transition ${collectionsExpanded ? "" : "-rotate-90"}`}
              />
            )
          }
          ariaExpanded={collectionsExpanded}
          onClick={onToggleCollections}
        />
        {!collapsed && collectionsExpanded
          ? collections.map((collection) => (
              <SideItem
                key={collection.id}
                icon={<span className="h-2 w-2 rounded-full bg-amber-300" />}
                label={`${collection.name} (${collection.bookIds.length})`}
                collapsed={collapsed}
                active={
                  activeSection === "collections" &&
                  selectedCollectionId === collection.id
                }
                inset
                onClick={() => onOpenCollection(collection.id)}
              />
            ))
          : null}
        <SideItem
          icon={<Settings size={22} />}
          label="Configuracoes"
          collapsed={collapsed}
          active={activeSection === "settings"}
          onClick={onOpenSettings}
        />
      </nav>
    </aside>
  );
}

function SideItem({
  icon,
  label,
  trailingIcon,
  active = false,
  inset = false,
  collapsed = false,
  ariaExpanded,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailingIcon?: ReactNode;
  active?: boolean;
  inset?: boolean;
  collapsed?: boolean;
  ariaExpanded?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      onClick={onClick}
      aria-expanded={ariaExpanded}
      className={`group flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
        active
          ? "bg-white/10 font-semibold text-amber-200"
          : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
      } ${inset ? "py-2 pl-8 text-xs" : ""} ${collapsed ? "justify-center px-0" : ""}`}
    >
      {icon}
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {trailingIcon ? (
            <span className="grid h-6 w-6 shrink-0 place-items-center text-neutral-400 opacity-0 transition group-hover:text-amber-100 group-hover:opacity-100 group-focus-visible:text-amber-100 group-focus-visible:opacity-100">
              {trailingIcon}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}
