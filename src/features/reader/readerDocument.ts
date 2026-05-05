export function extractReadableMarkup(contents: string): string {
  if (!contents.trim()) return "";

  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(contents, "text/html");
    const body = parsed.body;
    if (body?.innerHTML.trim()) {
      return body.innerHTML.trim();
    }
  }

  const bodyMatch = contents.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (bodyMatch?.[1] ?? contents).trim();
}

export function buildReaderDocument(contents: string) {
  const readableMarkup = extractReadableMarkup(contents);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --reader-background: #f3e2bf;
        --reader-ink: #21170c;
        --reader-margin: 64px;
        --reader-content-width: 680px;
        --reader-content-height: 720px;
        --reader-column-gap: 56px;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: var(--reader-background);
        color: var(--reader-ink);
      }

      body {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 20px;
        line-height: 1.68;
        text-align: left;
      }

      html {
        scrollbar-width: thin;
        scrollbar-color: color-mix(in srgb, var(--reader-ink) 42%, transparent) color-mix(in srgb, var(--reader-background) 84%, var(--reader-ink));
      }

      ::-webkit-scrollbar {
        width: 10px;
      }

      ::-webkit-scrollbar-track {
        background: color-mix(in srgb, var(--reader-background) 84%, var(--reader-ink));
      }

      ::-webkit-scrollbar-thumb {
        min-height: 48px;
        border: 2px solid var(--reader-background);
        border-radius: 999px;
        background: color-mix(in srgb, var(--reader-ink) 42%, transparent);
      }

      ::-webkit-scrollbar-thumb:hover {
        background: color-mix(in srgb, var(--reader-ink) 60%, transparent);
      }

      * {
        box-sizing: border-box;
        max-width: 100%;
      }

      #reader-stage {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        padding: var(--reader-margin);
        background: var(--reader-background);
      }

      #reader-clip {
        width: var(--reader-content-width);
        height: var(--reader-content-height);
        overflow: hidden;
      }

      #reader-root {
        width: var(--reader-content-width);
        height: var(--reader-content-height);
        overflow: visible;
        column-width: var(--reader-content-width);
        column-gap: var(--reader-column-gap);
        column-fill: auto;
        transform: translateX(0);
        transition: transform 160ms ease;
        overflow-wrap: anywhere;
        hyphens: auto;
        font-variant-ligatures: common-ligatures;
      }

      #reader-root .reader-spine-section {
        display: block;
        break-before: column;
        page-break-before: always;
      }

      #reader-root .reader-spine-section:first-child {
        break-before: auto;
        page-break-before: auto;
      }

      #reader-root img,
      #reader-root svg,
      #reader-root video,
      #reader-root table {
        max-width: 100% !important;
        height: auto !important;
        break-inside: avoid;
      }

      #reader-root img {
        display: block;
        object-fit: contain;
      }

      #reader-root pre {
        white-space: pre-wrap;
      }

      #reader-root p {
        margin: 0 0 var(--reader-paragraph-spacing, 1.05em);
      }

      #reader-root h1,
      #reader-root h2,
      #reader-root h3,
      #reader-root h4 {
        line-height: 1.25;
        break-after: avoid;
        margin: 0 0 0.8em;
      }

      #reader-root a {
        color: inherit;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main id="reader-stage">
      <section id="reader-clip">
        <article id="reader-root">${readableMarkup}</article>
      </section>
    </main>
  </body>
</html>`;
}
