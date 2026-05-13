export const ERROR_COPY: Record<string, string> = {
  invalid_file_type: "Selecione um arquivo EPUB válido.",
  invalid_file: "Selecione um arquivo EPUB válido.",
  invalid_epub: "Este arquivo não parece ser um EPUB válido.",
  invalid_epub_size: "O arquivo EPUB está vazio ou é grande demais.",
  epub_zip_error:
    "Não foi possível abrir este EPUB. O arquivo pode estar corrompido ou protegido.",
  epub_xml_error: "Não foi possível ler a estrutura deste EPUB.",
  epub_too_many_files:
    "O EPUB contém arquivos demais e não pode ser importado com segurança.",
  epub_entry_too_large: "Um arquivo interno do EPUB é grande demais.",
  epub_expanded_too_large: "O EPUB expande para um tamanho grande demais.",
  database_error: "Não foi possível salvar os dados agora. Tente novamente.",
  book_not_found: "Este livro não está mais disponível na biblioteca.",
  locator_mismatch: "Não foi possível salvar o progresso deste livro.",
  missing_cfi: "Não foi possível identificar a posição atual de leitura.",
};

export const GENERIC_ERROR_COPY =
  "Não foi possível concluir a operação. Tente novamente.";
