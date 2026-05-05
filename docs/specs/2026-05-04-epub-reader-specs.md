Você é um engenheiro sênior especialista em Tauri v2, Rust, React, TypeScript, SQLite e desenvolvimento de aplicativos desktop.

Quero criar um aplicativo desktop leitor de EPUB, similar ao Kindle, usando:

- Tauri v2
- Rust no backend
- React + TypeScript no frontend
- SQLite para dados internos
- Tailwind CSS para interface
- Armazenamento local no diretório AppData do aplicativo

O objetivo é construir um leitor de EPUB local com biblioteca interna, importação de livros, renderização paginada dinâmica, progresso persistente, ajustes de leitura e recursos de qualidade de vida.

Atenção: EPUB deve ser tratado como conteúdo reflowable, não como PDF. A página exibida ao usuário deve ser uma página visual calculada pela viewport atual, e não uma página fixa do livro.

A arquitetura deve seguir esta ideia:

Rust = sistema, arquivos, banco, EPUB, segurança e persistência
Frontend = UI, renderização, paginação visual, temas e interação
SQLite = estado persistente
Locator = fonte da verdade do progresso
Display page = valor derivado do layout atual

Requisitos principais:

1. Biblioteca interna

Criar uma tela de biblioteca com:

- lista/grid de livros importados
- botão para importar EPUB
- suporte a drag and drop de arquivos EPUB
- busca por título e autor
- ordenação por:
  - título
  - autor
  - último aberto
  - data de importação
  - progresso
- filtros:
  - não lidos
  - lendo
  - finalizados
- exibição de capa
- progresso de leitura
- detecção de duplicados por hash
- opção de excluir livro da biblioteca
- opção de excluir também o arquivo local

2. Importação de EPUB

Ao importar um arquivo .epub:

- validar se é um EPUB válido
- calcular hash do arquivo
- verificar duplicidade
- copiar o arquivo para o diretório AppData do app
- salvar em uma estrutura parecida com:

AppData/
  reader.db
  books/
    {book_id}/
      original.epub
      cover.jpg
      extracted/
      manifest.json
      search_index.json
  cache/
  exports/

- extrair metadados:
  - título
  - subtítulo
  - autor
  - editora
  - idioma
  - descrição
  - identificador
  - capa
- salvar os dados no SQLite

3. Banco de dados SQLite

Criar migrations para as seguintes tabelas:

books
book_progress
reading_settings
bookmarks
highlights
collections
collection_books
reading_sessions

Schema sugerido:

CREATE TABLE books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  publisher TEXT,
  language TEXT,
  description TEXT,
  identifier TEXT,
  file_hash TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  cover_path TEXT,
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_opened_at TEXT,
  reading_status TEXT NOT NULL DEFAULT 'unread',
  total_progression REAL DEFAULT 0
);

CREATE TABLE book_progress (
  book_id TEXT PRIMARY KEY,
  href TEXT NOT NULL,
  spine_index INTEGER NOT NULL,
  progression REAL NOT NULL,
  total_progression REAL NOT NULL,
  cfi TEXT,
  css_selector TEXT,
  text_snippet TEXT,
  display_page_index INTEGER,
  display_page_count INTEGER,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE reading_settings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_size INTEGER NOT NULL,
  line_height REAL NOT NULL,
  margin INTEGER NOT NULL,
  paragraph_spacing REAL NOT NULL,
  theme TEXT NOT NULL,
  text_align TEXT NOT NULL,
  hyphenation_enabled INTEGER NOT NULL DEFAULT 1,
  ligatures_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  href TEXT NOT NULL,
  spine_index INTEGER NOT NULL,
  progression REAL NOT NULL,
  total_progression REAL NOT NULL,
  label TEXT,
  text_snippet TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE highlights (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  href TEXT NOT NULL,
  spine_index INTEGER NOT NULL,
  progression REAL NOT NULL,
  total_progression REAL NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT NOT NULL,
  note TEXT,
  cfi TEXT,
  css_selector TEXT,
  dom_range_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE collection_books (
  collection_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  PRIMARY KEY(collection_id, book_id),
  FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE reading_sessions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  start_total_progression REAL,
  end_total_progression REAL,
  pages_turned INTEGER DEFAULT 0,
  FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

4. Estrutura de pastas

Criar ou seguir esta estrutura:

src/
  app/
    routes/
    layout/
  features/
    library/
      LibraryPage.tsx
      BookCard.tsx
      ImportButton.tsx
    reader/
      ReaderPage.tsx
      ReaderViewport.tsx
      ReaderControls.tsx
      PaginationEngine.ts
      LocatorEngine.ts
      ThemeEngine.ts
    settings/
      ReadingSettingsPanel.tsx
    annotations/
      HighlightLayer.tsx
      AnnotationPopup.tsx
  shared/
    types/
    hooks/
    tauri/
      commands.ts

src-tauri/
  src/
    lib.rs
    commands/
      books.rs
      import.rs
      reader.rs
      annotations.rs
      settings.rs
    db/
      mod.rs
      migrations.rs
      repositories/
    epub/
      parser.rs
      manifest.rs
      resources.rs
      sanitizer.rs
    storage/
      paths.rs
      files.rs

5. Comandos Tauri

Criar comandos Rust expostos ao frontend:

import_epub(path: String) -> Result<BookDto, AppError>
list_books() -> Result<Vec<BookDto>, AppError>
get_book(book_id: String) -> Result<BookDetailDto, AppError>
delete_book(book_id: String, delete_file: bool) -> Result<(), AppError>

get_book_manifest(book_id: String) -> Result<EpubManifestDto, AppError>
get_spine_resource(book_id: String, href: String) -> Result<ResourceDto, AppError>
get_cover(book_id: String) -> Result<Vec<u8>, AppError>

save_progress(book_id: String, locator: LocatorDto) -> Result<(), AppError>
get_progress(book_id: String) -> Result<Option<LocatorDto>, AppError>

create_bookmark(book_id: String, locator: LocatorDto, label: Option<String>) -> Result<BookmarkDto, AppError>
list_bookmarks(book_id: String) -> Result<Vec<BookmarkDto>, AppError>
delete_bookmark(bookmark_id: String) -> Result<(), AppError>

create_highlight(book_id: String, range: HighlightRangeDto, color: String, note: Option<String>) -> Result<HighlightDto, AppError>
list_highlights(book_id: String) -> Result<Vec<HighlightDto>, AppError>
update_highlight_note(highlight_id: String, note: String) -> Result<(), AppError>

search_in_book(book_id: String, query: String) -> Result<Vec<SearchResultDto>, AppError>
update_reading_settings(settings: ReadingSettingsDto) -> Result<(), AppError>

O frontend não deve acessar o SQLite diretamente. Todo acesso ao banco deve passar por comandos Rust.

6. Tipos TypeScript importantes

Criar tipos equivalentes aos DTOs Rust.

Tipo principal para progresso:

type ReadingLocator = {
  bookId: string;
  href: string;
  spineIndex: number;
  progression: number;
  totalProgression: number;
  cfi?: string;
  cssSelector?: string;
  textSnippet?: string;
  displayPageIndex?: number;
  displayPageCount?: number;
};

Atenção: nunca salvar apenas pageIndex como fonte principal do progresso. O progresso real precisa ser salvo por locator.

7. Reader EPUB

Criar uma tela ReaderPage com:

- topo com botão voltar para biblioteca
- título do livro
- botão de configurações de leitura “Aa”
- botão de sumário
- área central de leitura
- rodapé com:
  - capítulo atual
  - página visual atual
  - total de páginas visuais
  - porcentagem total do livro

A tela deve renderizar o conteúdo XHTML do EPUB em um container seguro ou iframe.

Bloquear scripts do EPUB inicialmente.

Sanitizar HTML e CSS sempre que possível.

8. Paginação dinâmica

Implementar paginação visual baseada na viewport, usando CSS Columns ou estratégia equivalente.

A página exibida deve ser calculada pela largura e altura da área de leitura.

Exemplo conceitual:

.reader-content {
  column-width: var(--page-width);
  column-gap: var(--page-gap);
  height: var(--page-height);
  overflow: hidden;
}

O total de páginas visuais deve ser calculado com base no scrollWidth do conteúdo:

const pageWidth = viewportWidth + columnGap;
const totalPages = Math.ceil(content.scrollWidth / pageWidth);

A navegação entre páginas deve alterar o deslocamento horizontal do conteúdo:

content.style.transform = translateX(-${pageIndex * pageWidth}px);

Quando o usuário alterar font-size, line-height, margem, largura da janela, tema ou família da fonte:

- aplicar debounce de 150ms a 300ms
- recalcular layout
- recalcular total de páginas visuais
- tentar manter o mesmo locator/progressão visível
- atualizar displayPageIndex e displayPageCount
- salvar as configurações

9. Configurações de leitura

Criar painel “Aa” com:

- font-family
- font-size
- line-height
- margin
- paragraph-spacing
- largura máxima do texto
- tema:
  - claro
  - escuro
  - sépia
  - OLED
- alinhamento do texto
- hifenização
- ligatures
- modo de leitura:
  - paginado
  - rolagem contínua
- modo:
  - uma página
  - duas páginas/spread

10. Sumário

Extrair o TOC/Navigation Document do EPUB.

Criar painel lateral de sumário com:

- capítulos
- subcapítulos
- clique para navegar até o href correspondente
- atualização do capítulo atual conforme progresso

11. Bookmarks

Implementar favoritos com:

- criar bookmark na posição atual
- listar bookmarks do livro
- navegar até bookmark
- remover bookmark
- label opcional
- text_snippet opcional

12. Highlights e notas

Implementar base para:

- selecionar texto
- criar highlight
- escolher cor
- adicionar nota
- listar highlights por livro
- navegar até highlight
- editar nota
- remover highlight
- exportar anotações em Markdown

Salvar highlights com:

- selected_text
- color
- note
- cfi ou cssSelector
- dom_range_json
- progression
- totalProgression
- text_snippet

13. Busca

Criar sistema inicial de busca:

- busca no livro atual
- resultado com trecho de contexto
- clique no resultado navega até o trecho
- opcional: gerar search_index.json durante importação

14. Reading sessions e estatísticas

Criar base para salvar sessões de leitura:

- início da sessão
- fim da sessão
- duração
- progresso inicial
- progresso final
- páginas viradas

Exibir futuramente:

- tempo total lido
- livros finalizados
- estimativa de tempo restante
- ritmo médio de leitura

15. Qualidade de vida

Adicionar ou deixar preparado para:

- recent books
- collections
- tags
- importação em lote
- exportação de notas
- backup do SQLite
- restauração de backup
- abrir pasta do livro
- modo foco escondendo controles
- atalhos de teclado
- clicar nas laterais para virar página
- slider de progresso
- preservar posição ao redimensionar janela
- salvar progresso automaticamente
- suporte a fonte para dislexia
- redução de movimento
- maior contraste
- ajuste de espaçamento entre letras
- ajuste de espaçamento entre palavras

16. Pontos críticos

Evitar estes erros:

- não salvar progresso apenas por número de página
- não assumir que o total de páginas do livro é fixo
- não depender do caminho original do arquivo depois da importação
- não executar scripts vindos do EPUB
- não tentar calcular todas as páginas do livro inteiro de forma síncrona no primeiro carregamento
- não misturar página visual com progresso real
- não quebrar a leitura quando o usuário mudar font-size

17. Estratégia de implementação

Implementar por fases.

Fase 1 — Base do projeto:

- configurar Tauri v2 + React + TypeScript
- configurar Tailwind
- criar estrutura de pastas
- configurar SQLite
- criar migrations
- criar AppData paths
- criar camada de erro AppError

Fase 2 — Biblioteca:

- importar EPUB
- copiar para AppData
- extrair metadados
- extrair capa
- salvar no banco
- listar livros
- exibir grid da biblioteca

Fase 3 — Reader básico:

- abrir livro
- carregar spine
- renderizar XHTML
- navegar entre capítulos
- criar layout paginado
- calcular páginas visuais
- avançar/voltar página
- salvar progresso

Fase 4 — Configurações:

- painel Aa
- font-size
- line-height
- margin
- tema
- recalcular páginas dinamicamente
- manter posição após reflow

Fase 5 — Sumário e navegação:

- extrair TOC
- painel lateral
- navegação por capítulo
- slider de progresso

Fase 6 — Bookmarks e highlights:

- criar bookmark
- listar bookmarks
- criar highlight
- criar nota
- exportar Markdown

Fase 7 — Busca e estatísticas:

- busca no livro
- sessões de leitura
- tempo lido
- progresso avançado

18. Resultado esperado agora

Comece implementando a Fase 1 e Fase 2.

Gere código real, organizado e compilável.

Inclua:

- estrutura de arquivos
- migrations SQLite
- comandos Tauri básicos
- tipos TypeScript
- tela de biblioteca inicial
- botão de importação EPUB
- listagem dos livros importados
- tratamento de erros
- comentários apenas onde forem úteis

Não implemente tudo de uma vez. Priorize uma base sólida, extensível e fácil de manter.

Use nomes técnicos consistentes:
- Reading System
- Library
- Bookshelf
- Ingestion Pipeline
- Spine
- Manifest
- TOC
- Reflowable Layout
- Synthetic Pagination
- Viewport Page
- Locator
- Progression
- Rendition Settings
- Reflow
- Repagination
- Reading Session