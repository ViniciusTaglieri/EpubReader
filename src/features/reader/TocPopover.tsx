import type { TocItemDto } from "../../shared/types/books";

type TocPopoverProps = {
  toc: TocItemDto[];
  currentHref?: string;
  onNavigate: (item: TocItemDto) => void;
  onClose: () => void;
};

type TocListItem = {
  item: TocItemDto;
  depth: number;
};

export function TocPopover({
  toc,
  currentHref,
  onNavigate,
  onClose,
}: TocPopoverProps) {
  const items = flattenToc(toc);

  return (
    <aside
      className="absolute right-5 top-20 z-30 max-h-[calc(100vh-7rem)] w-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="false"
      aria-labelledby="toc-popover-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="mb-4">
        <h2 id="toc-popover-title" className="font-semibold">
          Sumario
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Navegue pelo TOC do EPUB sem sair do fluxo reflowable.
        </p>
      </div>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map(({ item, depth }) => {
            const isCurrent =
              normalizeHrefForMatch(item.href) ===
              normalizeHrefForMatch(currentHref ?? "");

            return (
              <button
                key={`${item.id}-${item.href}`}
                type="button"
                onClick={() => onNavigate(item)}
                className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${
                  isCurrent
                    ? "bg-amber-300/15 text-amber-100"
                    : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
                }`}
                style={{ paddingLeft: `${12 + depth * 14}px` }}
              >
                <span className="line-clamp-2">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-400">
          Este EPUB nao informou um sumario navegavel.
        </p>
      )}
    </aside>
  );
}

export function normalizeHrefForMatch(href: string) {
  return href.split("#")[0].replace(/^\.\//, "");
}

export function findTocItemByHref(
  items: TocItemDto[],
  href: string | undefined,
): TocItemDto | undefined {
  if (!href) return undefined;
  const normalized = normalizeHrefForMatch(href);
  for (const item of items) {
    if (normalizeHrefForMatch(item.href) === normalized) {
      return item;
    }
    const child = findTocItemByHref(item.children, href);
    if (child) return child;
  }
  return undefined;
}

function flattenToc(items: TocItemDto[], depth = 0): TocListItem[] {
  return items.flatMap((item) => [
    { item, depth },
    ...flattenToc(item.children, depth + 1),
  ]);
}
