# Recall — documents to Anki decks

Recall turns Word documents, PowerPoint slides, PDFs, and text files into a ready-to-import **Anki Deck Package (`.apkg`)**. It uses DeepSeek to write Basic Front/Back cards, lets you review and edit them, and builds the Anki package entirely in the browser.

There is no account, no cloud library, and no persisted set database. Download the `.apkg`, import it into Anki, and study there.

## Features

- **DeepSeek-powered generation** with `deepseek-flash` and `deepseek-v4-pro`
- **Multiple sources per deck**: `.docx`, `.pptx`, `.pdf`, `.txt`, `.md`
- **Review before export**: edit Front/Back text, include/exclude cards, add cards manually
- **Real `.apkg` export** with the Anki Basic note type, tags, and stable note IDs
- **Client-side packaging**: cards are inserted into a local SQLite Anki collection and zipped in the browser
- **Local-first**: only your API key is stored locally; deck content is never persisted by the app
- **No OCR dependency**: PDFs must contain selectable text

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm install` also copies the SQLite WASM binary and PDF.js worker into `public/`:

- `public/sql-wasm.wasm`
- `public/pdf.worker.min.mjs`

You can rerun that step with:

```bash
node scripts/copy-static-assets.mjs
```

## Connect DeepSeek

1. Create an API key at [platform.deepseek.com](https://platform.deepseek.com/api_keys).
2. Click **Connect DeepSeek** in the app.
3. Paste the key, test the connection, and choose a model.

The key is stored in `localStorage` by default, or in `sessionStorage` if **Remember API key on this device** is turned off. Requests go through a Next.js route so the browser never has to call DeepSeek cross-origin. The server does not log or persist the key.

### Optional environment overrides

Useful for self-hosting or testing against a mock DeepSeek-compatible endpoint:

```bash
DEEPSEEK_BASE_URL=http://127.0.0.1:9099 npm run dev
```

`DEEPSEEK_BASE_URL` defaults to `https://api.deepseek.com`. This is useful for testing against a mock endpoint or routing through your own compatible proxy.

### Requirements

- Node.js 22.12 or newer
- npm

## How the flow works

1. Add one or more documents. Text is extracted in the browser.
2. Choose deck name, tags, card count, and optional guidance.
3. DeepSeek returns structured JSON, which is validated and deduplicated.
4. Review the cards and make any edits.
5. Click **Download `.apkg`**. The app builds an Anki collection with:
   - one deck (subdecks work with `::` in the name),
   - Basic Front/Back notes,
   - your tags plus `recall`,
   - stable SHA-1 note IDs based on deck + Front + Back.
6. In Anki, choose **File → Import**, select the file, and confirm the deck.

Re-importing a deck with the same name and cards can update existing notes; choose **Update notes** in Anki's import dialog when prompted.

## Document limits

- Maximum file size: 20 MB per file
- Maximum files per deck: 10
- Maximum extracted text per file: 50,000 characters
- Maximum combined source text: 80,000 characters
- Maximum PDF pages processed: 250

Files beyond the combined limit are trimmed with a visible warning. Very long documents should be split into separate decks for full coverage.

### PDF caveat

PDF text is extracted with `pdfjs-dist`. Scanned/image-only PDFs have no selectable text and will show a clear error. Run OCR first (for example with OCRmyPDF) if you need those pages.

## Anki package details

- Uses `anki-apkg-export` (tested upstream against Anki 26.09.3).
- Exports the legacy `collection.anki2` package format, which Anki imports and upgrades automatically.
- Uses the Basic note type with `Front` and `Back` fields.
- AI output is treated as plain text: HTML tags are stripped before review, then all field content is HTML-escaped for Anki. Line breaks become `<br>`.
- Tags are normalized so they contain no spaces.
- The downloaded filename is based on the deck name and ends in `-anki.apkg`.

The package structure is a ZIP containing `collection.anki2` and `media`, with a SQLite database containing `col`, `notes`, and `cards` tables.

## Privacy

- Documents are parsed locally.
- Only extracted text is sent to DeepSeek, and only when you click **Generate deck**.
- Card drafts exist only in React state for the current session.
- The API key is stored in browser storage if you choose to remember it.
- The Next.js API route receives the key per request and never writes it to disk.

If you deploy this publicly, note that your server sees API keys transiently while proxying requests. For a multi-user deployment, consider adding rate limiting and a clear privacy policy.

## Scripts

```bash
npm run dev        # development
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Architecture

```
src/app/page.tsx                  Single-page deck builder
src/app/api/deepseek/models       Validate key and list models
src/app/api/deepseek/generate     DeepSeek JSON-mode generation
src/components/deck-builder.tsx   Main flow and review state
src/components/deepseek-settings  API key/model settings dialog
src/components/file-dropzone.tsx  Multi-file upload and parsing UI
src/lib/parse-documents.ts        DOCX/PPTX/PDF/TXT/MD text extraction
src/lib/deepseek-server.ts        DeepSeek request/response handling
src/lib/anki.ts                   .apkg generation and field escaping
scripts/copy-static-assets.mjs    Copies WASM + PDF worker into public/
```

## Limitations

- DeepSeek is the only AI provider.
- Basic Front/Back cards only; no cloze or reversed cards yet.
- No OCR for scanned PDFs.
- No persisted library or export history; download the `.apkg` before leaving the page.
