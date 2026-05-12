# EPUB CFI Reader Contract

Este projeto usa `epubjs` como motor de leitura e EPUB CFI como fonte de verdade da posicao.

## Backend

O backend deve fornecer o arquivo EPUB importado como bytes, sem tentar transformar o livro em HTML paginado.

```ts
readBook(bookId: string): Promise<number[]>
```

O backend tambem persiste e recupera o progresso no registro `book_progress`.

```ts
getProgress(bookId: string): Promise<ReadingLocator | null>
saveProgress(bookId: string, locator: ReadingLocator): Promise<void>
```

O campo obrigatorio para restauracao e `locator.cfi`. Os demais campos existem para biblioteca, estatisticas e compatibilidade com tabelas atuais, mas nao comandam a posicao visual do leitor.

## Frontend

O leitor deve:

1. Chamar `readBook(bookId)`.
2. Converter `number[]` para `ArrayBuffer`.
3. Criar `ePub({ replacements: "base64" })`.
4. Abrir o livro com `epub.open(bookData, "binary")`.
5. Criar a rendition com `epub.renderTo(viewerElement, options)`.
6. Restaurar com `rendition.display(savedLocator?.cfi ?? undefined)`.
7. Ouvir `rendition.on("relocated", handler)`.
8. Salvar `location.start.cfi` via `saveProgress`.

## Regras De Refatoracao

- Nao restaurar posicao por pagina visual, scroll offset, capitulo ou porcentagem.
- Nao renderizar EPUB por HTML sanitizado no reader principal.
- Nao misturar a paginacao sintetica antiga com a rendition do `epubjs`.
- Se um CFI salvo falhar, abrir o inicio do livro com `rendition.display()`.
- Ao sair para a biblioteca, aguardar a fila de `saveProgress` terminar.
