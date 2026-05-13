# EPUB Reader

<p align="center">
  <strong>Leitor EPUB desktop, local e focado em uma experiência de leitura confortável.</strong>
</p>

<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-24C8DB?style=for-the-badge&logo=tauri&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111111">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-stable-000000?style=for-the-badge&logo=rust&logoColor=white">
</p>

## 📖 Descrição

O **EPUB Reader** é uma aplicação desktop para leitura de arquivos EPUB, construída com **Tauri v2**, **Rust**, **React**, **TypeScript**, **SQLite** e **Tailwind CSS**.

O projeto existe para oferecer um leitor local, rápido e controlado pelo usuário, com recursos como:

- importação e organização de livros EPUB;
- leitura paginada ou contínua;
- ajuste de fonte, margem, tema, alinhamento e espaçamento;
- navegação por sumário;
- progresso persistido localmente;
- armazenamento local com SQLite.

## ✅ Pré-requisitos

Antes de rodar o projeto, instale:

| Ferramenta       | Versão recomendada | Link                                                    |
| ---------------- | ------------------ | ------------------------------------------------------- |
| Node.js          | 22+                | https://nodejs.org                                      |
| npm              | incluso no Node.js | https://www.npmjs.com                                   |
| Rust             | stable             | https://www.rust-lang.org/tools/install                 |
| WebView2 Runtime | atual              | https://developer.microsoft.com/microsoft-edge/webview2 |

> No Windows, o WebView2 normalmente já vem instalado. Caso a janela do app não abra corretamente, instale ou atualize o runtime.

## ⚙️ Instalação

Clone o repositório:

```powershell
git clone https://github.com/ViniciusTaglieri/EpubReader
cd EpubReader
```

Instale as dependências do frontend:

```powershell
npm ci
```

Valide o projeto:

```powershell
npm test
npm run build
```

Opcionalmente, valide a camada Rust/Tauri:

```powershell
cd src-tauri
cargo test
cargo clippy -- -D warnings
```

## 🚀 Uso

Para rodar a aplicação desktop em modo desenvolvimento:

```powershell
npm run tauri dev
```

Depois que a janela abrir:

1. Importe um arquivo `.epub` para a biblioteca.
2. Abra o livro desejado.
3. Use os botões laterais para avançar ou voltar páginas.
4. Use o slider do rodapé para navegar pelo progresso.
5. Abra o sumário no canto superior direito para trocar de capítulo.
6. Abra as configurações de leitura para ajustar fonte, margem, tema, espaçamento e modo de leitura.

## 🧪 Comandos úteis

```powershell
npm run dev       # inicia apenas o Vite
npm run tauri dev # inicia o app desktop com Tauri
npm test          # roda testes do frontend
npm run build     # compila TypeScript e gera build web
```

## 🧱 Stack

- **Tauri v2** para empacotamento desktop.
- **Rust** para filesystem, parsing, persistência e comandos nativos.
- **React + TypeScript** para interface.
- **SQLite** para biblioteca e progresso de leitura.
- **epub.js** para renderização EPUB.
- **Tailwind CSS** para estilos.
