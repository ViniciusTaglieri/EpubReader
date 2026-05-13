# EPUB CFI Progress Implementation

Este documento descreve como salvar e restaurar a posicao de leitura de um EPUB usando EPUB CFI, para reaplicar o mesmo padrao em um projeto maior.

## Ideia central

Nao salve numero de pagina. Paginas mudam quando muda tamanho da janela, fonte, margem, tema, orientacao ou modo de renderizacao. Em EPUB, a posicao estavel deve ser salva como **CFI** (`epubcfi(...)`), que aponta para uma localizacao logica dentro da estrutura do livro.

O fluxo usado foi:

1. Cada livro importado recebe um `id` estavel.
2. A biblioteca persiste um campo `last_cfi` por livro.
3. O leitor abre o EPUB.
4. O `epubjs` emite o evento `relocated` sempre que a posicao renderizada muda.
5. O app pega `location.start.cfi` desse evento.
6. O backend salva esse CFI no registro do livro.
7. Ao abrir o mesmo livro novamente, o app chama `rendition.display(last_cfi)`.

## Modelo de dados

O registro minimo de um livro precisa guardar o caminho do arquivo importado e a ultima posicao CFI:

```ts
type Book = {
  id: string
  title: string
  file_path: string
  last_cfi: string | null
}

type Library = {
  books: Book[]
}
```

No backend Rust, o equivalente usado foi:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub last_cfi: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct Library {
    pub books: Vec<Book>,
}
```

Em um projeto mais completo, esse armazenamento pode ir para SQLite, IndexedDB, um banco remoto ou qualquer camada de repository. O importante e que o `last_cfi` seja associado ao identificador estavel do livro, nao ao caminho temporario ou ao titulo.

## Salvando a posicao

No `epubjs`, a posicao atual aparece no evento `relocated`. O valor salvo deve ser o CFI inicial da localizacao atual:

```ts
rendition.on('relocated', (location: { start?: { cfi?: string } }) => {
  const cfi = location.start?.cfi

  if (cfi) {
    savePosition(book.id, cfi)
  }
})
```

No app Tauri, `savePosition` chama um comando Rust:

```ts
export function savePosition(bookId: string, cfi: string) {
  return invoke<Library>('save_position', { bookId, cfi })
}
```

O backend procura o livro pelo `book_id`, atualiza `last_cfi` e grava a biblioteca:

```rust
pub fn upsert_position(library: &mut Library, book_id: &str, cfi: String) -> Result<(), String> {
    let book = library
        .books
        .iter_mut()
        .find(|book| book.id == book_id)
        .ok_or_else(|| "Book not found".to_string())?;

    book.last_cfi = Some(cfi);
    Ok(())
}
```

O comando Tauri fica como uma camada fina:

```rust
#[tauri::command]
fn save_position(app: tauri::AppHandle, book_id: String, cfi: String) -> Result<Library, String> {
  let mut library = load_store(&store_path(&app)?)?;
  upsert_position(&mut library, &book_id, cfi)?;
  save_store(&store_path(&app)?, &library)?;
  Ok(library)
}
```

Em um app maior, vale debouncing ou throttling para evitar muitas escritas em disco. O comportamento essencial, porem, e salvar sempre que a renderizacao muda para uma nova posicao logica.

## Abrindo o EPUB corretamente

Para arquivo local importado pelo Tauri, o EPUB foi lido no backend como bytes:

```rust
#[tauri::command]
fn read_book(file_path: String) -> Result<Vec<u8>, String> {
  fs::read(file_path).map_err(|error| error.to_string())
}
```

No frontend, esses bytes chegam como `number[]` e sao convertidos para `ArrayBuffer`:

```ts
export function numbersToArrayBuffer(bytes: number[]) {
  return new Uint8Array(bytes).buffer
}
```

O livro e aberto no `epubjs` como binario:

```ts
const bytes = await readBook(book.file_path)
const bookData = numbersToArrayBuffer(bytes)

const epub = ePub({ replacements: 'base64' })
await epub.open(bookData, 'binary')
```

Esse caminho foi escolhido em vez de criar um `Blob URL`, porque o `epubjs` precisa resolver recursos internos do EPUB. Abrir direto como `ArrayBuffer` segue o padrao dos exemplos de input local do `epubjs` e tende a ser mais confiavel dentro do WebView do Tauri.

`replacements: 'base64'` faz com que recursos internos do EPUB sejam embutidos como data URLs quando necessario, reduzindo problemas de acesso a assets internos.

## Restaurando a posicao

Depois que o livro e aberto e a rendition e criada, a restauracao acontece passando o CFI salvo para `display`:

```ts
const rendition = epub.renderTo(viewerElement, {
  flow: 'paginated',
  width: '100%',
  height: '100%',
})

await rendition.display(book.last_cfi ?? undefined)
```

Se `last_cfi` existir, o `epubjs` abre naquela posicao logica. Se for `null`, `undefined` faz o livro abrir no inicio.

O ponto importante e: o CFI deve ser passado somente depois que o EPUB foi aberto e a `rendition` existe. O fluxo recomendado e:

```ts
const epub = ePub({ replacements: 'base64' })
await epub.open(bookData, 'binary')

const rendition = epub.renderTo(viewerElement, renderOptions)
await rendition.display(savedCfi ?? undefined)
```

## Ciclo de vida no React

No componente do leitor, as referencias de `epub` e `rendition` ficam em `useRef`, para os botoes de navegacao e o cleanup conseguirem acessar a instancia atual:

```ts
const epubRef = useRef<EpubBook | null>(null)
const renditionRef = useRef<Rendition | null>(null)
```

Ao montar ou trocar de livro:

1. Ler bytes do arquivo.
2. Converter para `ArrayBuffer`.
3. Criar `epub`.
4. Abrir com `open(bookData, 'binary')`.
5. Criar `rendition`.
6. Registrar `relocated`.
7. Chamar `display(last_cfi ?? undefined)`.

Ao desmontar:

```ts
renditionRef.current?.destroy()
epubRef.current?.destroy()
renditionRef.current = null
epubRef.current = null
```

Isso evita manter iframes, listeners e dados do livro anterior vivos quando o usuario volta para a biblioteca ou abre outro livro.

## Navegacao e CFI

Os botoes de pagina nao salvam pagina diretamente. Eles apenas pedem para o `epubjs` navegar:

```ts
renditionRef.current?.prev()
renditionRef.current?.next()
```

Depois da navegacao, o proprio `epubjs` emite `relocated`, e esse evento salva o novo CFI. Assim a regra de persistencia fica centralizada em um unico lugar.

## Cuidados importantes

- Nao use numero de pagina como progresso persistente.
- Nao salve porcentagem como fonte principal de verdade; use no maximo como dado auxiliar de UI.
- Salve `location.start.cfi`, nao texto visivel nem scroll offset.
- Associe o CFI a um `book.id` estavel.
- Se o arquivo EPUB for substituido por outra edicao do mesmo livro, o CFI antigo pode nao ser valido.
- Se `rendition.display(savedCfi)` falhar, trate como fallback para `rendition.display()` e limpe ou substitua o CFI invalido.
- Em apps grandes, debouncie `savePosition`, mas nao dependa de eventos de sair da tela para salvar.
- Se houver sincronizacao em nuvem, considere `updated_at` junto do `last_cfi` para resolver conflitos.

## Resumo do contrato

A interface minima entre leitor e persistencia deve ser:

```ts
type ProgressStore = {
  getBook(bookId: string): Promise<Book>
  savePosition(bookId: string, cfi: string): Promise<void>
}
```

O leitor nao precisa saber se isso grava JSON, SQLite ou API remota. Ele so precisa:

1. Receber `book.last_cfi`.
2. Chamar `rendition.display(book.last_cfi ?? undefined)`.
3. Ouvir `relocated`.
4. Persistir `location.start.cfi`.

Esse e o papel inteiro do mecanismo de progresso por posicao.
