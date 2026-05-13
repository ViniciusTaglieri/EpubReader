# EPUB Reader Hardening and Productization Spec

Data: 2026-05-11

## Contexto

O projeto ja possui uma base funcional para um leitor EPUB desktop local com Tauri v2, Rust, React, TypeScript, SQLite e Tailwind. A implementacao atual cobre biblioteca, importacao, extracao inicial de metadados, renderizacao reflowable, paginacao sintetica, progresso por Locator, colecoes e parte da infraestrutura de bookmarks/highlights no backend.

A auditoria tecnica identificou que o projeto esta em um bom estado de MVP, mas ainda nao esta pronto para uso robusto em producao. Os principais riscos estao em seguranca de EPUB, consumo de memoria no Reader, arquivos React muito grandes, persistencia nao transacional, migrations pouco controladas, UX/acessibilidade incompletas e falta de CI/documentacao operacional.

## Objetivo

Elevar o projeto de MVP para uma base de produto desktop confiavel, segura, performatica e facil de manter, preservando os principios arquiteturais originais:

- Rust controla sistema, arquivos, banco, EPUB, seguranca e persistencia.
- Frontend controla UI, interacao, Synthetic Pagination, Rendition Settings e experiencia de leitura.
- SQLite e a fonte de verdade persistente.
- Locator e a fonte de verdade do progresso.
- Viewport Page e um valor derivado do layout atual.

## Fora de Escopo Inicial

- Sincronizacao em nuvem.
- DRM.
- Loja, conta de usuario ou autenticacao remota.
- Conversao de EPUB para PDF.
- IA, recomendacoes ou resumo automatico.
- Suporte completo a todos os EPUBs malformados existentes no mercado.

## Estado Atual Relevante

### Pontos Fortes

- Stack adequada para app desktop local.
- Separacao inicial entre `src/features`, `src/shared`, `src-tauri/src/commands`, `db`, `epub` e `storage`.
- Testes unitarios existentes para filtros, import paths, reader document, settings, navigation, position e alguns modulos Rust.
- Progresso ja modelado com `ReadingLocator`/`LocatorDto`, evitando salvar somente numero de pagina.
- Exclusao de storage ja possui validacao contra path traversal.
- `npm test`, `cargo test`, `npm run build` e `npm audit --audit-level=moderate` passam.

### Pontos Fracos

- `src/features/library/LibraryPage.tsx` e `src/features/reader/ReaderPage.tsx` concentram responsabilidades demais.
- `get_book_rendition` concatena o livro inteiro e embute imagens em base64, elevando uso de RAM.
- Sanitizacao HTML e baseada em manipulacao manual de strings.
- CSP do Tauri esta desativado.
- Importacao e exclusao nao sao transacionais ponta a ponta.
- Busca pode falhar com indices UTF-8.
- Migrations nao sao versionadas.
- Backend possui comandos para bookmarks/highlights, mas o frontend nao expoe todos nem oferece UI completa.
- Nao ha README, CI, pipeline de lint, clippy obrigatorio, cargo audit ou documentacao de release.

## Requisitos Funcionais

### RF1: Reader por Spine sob demanda

O Reader deve carregar inicialmente apenas o spine/chapter necessario para abrir a posicao atual. Deve suportar:

- Abrir o primeiro spine quando nao houver progresso salvo.
- Abrir o spine salvo pelo Locator quando houver progresso.
- Navegar para spine anterior/proximo.
- Precarregar, quando possivel, spine anterior e proximo.
- Manter Locator como fonte de verdade do progresso.
- Recalcular Viewport Pages apos Reflow sem sobrescrever progresso real.

### RF2: Pipeline de importacao resiliente

A importacao deve:

- Validar extensao e assinatura/estrutura minima do EPUB.
- Calcular hash antes de copiar.
- Detectar duplicidade por hash.
- Copiar para diretorio temporario/staging antes de promover para `books/{book_id}`.
- Extrair metadados, capa e manifest.
- Inserir registro no SQLite dentro de transacao.
- Remover staging em caso de erro.
- Nunca deixar arquivos orfaos sem registro no banco.

### RF3: Exclusao segura e consistente

A exclusao deve:

- Validar existencia do livro.
- Remover registro do banco e storage de forma consistente.
- Evitar path traversal.
- Retornar erro claro quando o livro nao existir.
- Ser preparada para opcao futura `delete_file: bool`, mantendo comportamento atual documentado.

### RF4: Busca segura com Unicode

A busca no livro deve:

- Nao panicar com texto UTF-8.
- Retornar snippets por limites de caracteres validos.
- Ignorar query vazia ou curta demais.
- Limitar quantidade de resultados.
- Futuramente usar `search_index.json` ou FTS5.

### RF5: Bookmarks, highlights e notas no frontend

O frontend deve expor comandos Tauri para:

- Criar/listar/remover bookmarks.
- Criar/listar/editar highlights.
- Criar nota em highlight.
- Navegar ate bookmark/highlight por Locator.

As views devem comecar simples, mas funcionais.

### RF6: Settings persistidos

O Reader deve:

- Carregar Rendition Settings do SQLite ao abrir.
- Salvar alteracoes com debounce.
- Manter defaults em codigo quando nao houver registro salvo.
- Validar valores no backend antes de persistir.

## Requisitos Nao Funcionais

### Segurança

- Definir CSP em `tauri.conf.json`.
- Remover `csp: null`.
- Bloquear scripts de EPUB.
- Bloquear iframes, object/embed e recursos remotos por padrao.
- Tratar URLs perigosas como `javascript:` e `data:` indevidas.
- Sanitizar HTML com parser/biblioteca robusta, nao apenas regex/string scanning.
- Validar todos os payloads de comandos IPC.
- Nao expor paths internos desnecessarios ao frontend quando bytes/URLs controladas forem suficientes.

### Performance

- Evitar montar livro inteiro em uma unica string.
- Evitar base64 de todas as imagens do livro de uma vez.
- Usar cache LRU de recursos do spine.
- Revogar object URLs de capas ao desmontar/atualizar biblioteca.
- Evitar repaginacao repetitiva sem debounce real.
- Manter bundle inicial pequeno; code splitting pode esperar ate haver rotas maiores.

### Banco de Dados

- Adotar migrations versionadas com `PRAGMA user_version` ou tabela `schema_migrations`.
- Criar indices para:
  - `books(last_opened_at)`
  - `books(imported_at)`
  - `books(reading_status, is_favorite)`
  - `collection_books(book_id)`
  - `reading_sessions(book_id, started_at)`
- Usar transacoes para operacoes que alteram multiplas tabelas.
- Adicionar testes de upgrade de schema.

### Acessibilidade

- Evitar `article role="button"` com botoes internos.
- Usar `button` ou link real para a acao principal do card.
- Adicionar focus trap em dialog/popovers.
- Adicionar `aria-modal` nos dialogs.
- Garantir labels em botoes de icone.
- Garantir estados de foco visiveis.
- Revisar contraste dos tons neutros e amber.

### Observabilidade e DevOps

- Adicionar README com setup, scripts, stack e troubleshooting.
- Adicionar CI com `npm test`, `npm run build`, `cargo test`, `cargo fmt --check`, `cargo clippy -- -D warnings`.
- Adicionar `cargo audit` quando disponivel no ambiente de CI.
- Adicionar logging estruturado no backend.
- Planejar crash recovery e backup/restore de SQLite.

## Arquitetura Alvo

### Frontend

Arquivos grandes devem ser quebrados por responsabilidade:

- `LibraryPage.tsx`: composicao da tela.
- `useLibraryBooks.ts`: carregamento, importacao, exclusao e capas.
- `useLibraryCollections.ts`: colecoes.
- `LibrarySidebar.tsx`: navegacao lateral.
- `LibraryToolbar.tsx`: busca, filtros e sort.
- `CollectionDialog.tsx`: criacao/edicao de colecoes.
- `ReaderPage.tsx`: composicao da tela.
- `useReaderBook.ts`: manifest, spine atual e recursos.
- `useReaderPagination.ts`: Synthetic Pagination e Reflow.
- `useReaderProgress.ts`: Locator e persistencia.
- `ReaderFrame.tsx`: iframe/container seguro.
- `TocPopover.tsx`, `ReadingSettingsPopover.tsx`, `BookmarksPanel.tsx`, `AnnotationsPanel.tsx`.

### Backend Rust

- `commands`: camada IPC fina, com validacao de entrada.
- `db/repositories`: SQL e transacoes.
- `epub/parser`: OPF, spine, TOC, metadata.
- `epub/sanitizer`: sanitizacao robusta.
- `epub/resources`: leitura segura de ZIP e recursos.
- `storage`: paths, staging, promocao, cleanup.
- `models`: DTOs, idealmente com tipos de dominio mais restritos no futuro.

## Criterios de Aceite

- `npm test` passa.
- `npm run build` passa.
- `cargo test` passa.
- `cargo fmt --check` passa.
- `cargo clippy -- -D warnings` passa.
- EPUB grande abre sem carregar todo o livro em uma unica string.
- EPUB com scripts/event handlers/iframes nao executa codigo.
- Busca com caracteres acentuados nao panica.
- Importacao com falha nao deixa pasta final orfa.
- Exclusao remove banco e storage de forma consistente.
- Reader restaura posicao por Locator apos reabrir livro.
- UI de biblioteca e reader continuam usaveis por teclado.

## Prioridades

### Critico

- CSP e sanitizacao robusta.
- Reader por spine sob demanda.
- Busca Unicode segura.
- Importacao/exclusao consistentes.
- Clippy limpo.

### Alto Impacto

- Refatorar `LibraryPage.tsx`, `ReaderPage.tsx` e `BookCard.tsx`.
- Migrations versionadas.
- Validacao centralizada de comandos Tauri.
- Settings persistidos no carregamento.
- UI minima de bookmarks/highlights.

### Medio Impacto

- Cache de capas e revogacao de object URLs.
- TOC hierarquico.
- Acessibilidade de dialogs, popovers e cards.
- README e CI.

### Baixa Prioridade

- Docker.
- Auto-update.
- Crash reporting completo.
- Marketing/copy de conversao.
- Estatisticas avancadas de leitura.

