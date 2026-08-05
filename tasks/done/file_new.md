# File > New / File > Open for .checquery files

## Context

checquery2 is currently the unmodified Electrobun + SolidJS starter template — no menus, no dialogs, no persistence. This change adds the app's first real feature: a native `File` menu with **New** and **Open**, backed by `.checquery` files, which are plain SQLite databases opened via Bun's built-in `bun:sqlite` in the main (Bun) process. This is greenfield — no existing menu/RPC/DB code to follow, so the plan establishes the patterns (RPC schema location, main-process DB ownership, webview modal) that later features will build on.

Decisions already confirmed with the user (see prior conversation, not re-litigated here):
- New: pick a destination **folder** via the native folder picker, then an **in-app SolidJS modal** (no native text-input dialog exists in Electrobun) asks for a filename; `.checquery` is appended if missing.
- New file schema: one metadata table, key/value shaped: `_checquery_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`, seeded with `file_id` (CUID2, new dep `@paralleldrive/cuid2`) and `created_at` (ISO string).
- Single window, single active DB connection — opening/creating replaces the current one. No multi-window, no dirty-state tracking (out of scope).
- Open validates the file has `_checquery_meta` with a `file_id` row; invalid files are rejected with a native error dialog and the currently-open file is left untouched.
- Window title updates to the file's base name; Open dialog is filtered toward `*.checquery`.

## Verified Electrobun API details

Read directly from `node_modules/electrobun/dist/api/**` (not guessed):

- **RPC schema direction** (`shared/rpc.ts`): a schema block name (`bun` or `webview`) denotes the side that **handles/receives** that entry, for both `requests` and `messages`. So:
  - `Schema.bun.requests` — requests bun handles (webview calls them).
  - `Schema.webview.requests` — requests webview handles (bun calls them). ✅ used for the filename prompt.
  - `Schema.webview.messages` — messages the **webview receives** (bun sends via `rpc.send.X()`). ✅ used for `fileOpened`.
  - `Schema.bun.messages` — messages **bun receives** (webview would send). Not needed for this feature.
- **Bun-side RPC construction**: `BrowserView.defineRPC<AppSchema>({ handlers: { requests: {...}, messages: {...} } })` from `electrobun/bun`, passed as the `rpc` option to `new BrowserWindow({ ..., rpc })`. The returned object exposes `.request.<name>(params)` (calls into webview) and `.send.<name>(payload)` (fires a message to webview).
- **Webview-side RPC construction**: `electrobun/view` exports `Electroview` (default export `{ Electroview }` and a named export). `Electroview.defineRPC<AppSchema>({ handlers: {...} })` builds the rpc object; then `new Electroview({ rpc })` wires it to the actual webview transport.
- **Window title**: `BrowserWindow.setTitle(title: string)` — confirmed at `core/BrowserWindow.ts:270`.
- **Menu click event shape**: `ApplicationMenu.on("application-menu-clicked", handler)` — `handler` receives an `ElectrobunEvent` whose `.data` is `{ id?: number; action: string; data?: unknown }` (confirmed in `events/ApplicationEvents.ts` and the FFI callback in `proc/native.ts` ~line 2689). So read the action as `event.data.action`.
- **Dialogs**: `Utils.openFileDialog({ canChooseFiles, canChooseDirectory, allowsMultipleSelection, allowedFileTypes, startingFolder })` returns `Promise<string[]>`. There is **no native save dialog and no native text-input dialog** — confirmed absent from `core/Utils.ts` and `proc/native.ts`. `Utils.showMessageBox(opts)` is available for error/info dialogs.
- **bun:sqlite**: `new Database(filename, options)` — options default to `{ readwrite: true, create: true }` (confirmed in `bun-types/sqlite.d.ts`). This means **opening must explicitly pass `{ create: false, readwrite: true }`**, otherwise a missing/deleted file would silently create an empty one instead of failing.
- `@types/bun` (already a devDependency) covers `bun:sqlite` — no extra types package needed.

## Files to add/change

### 1. `bun add @paralleldrive/cuid2`
New dependency for `file_id` generation.

### 2. New: `src/shared/rpc.ts` — shared RPC schema
```ts
import type { RPCSchema } from "electrobun/bun";

export type FileOpenedPayload = {
	path: string;
	fileId: string;
	name: string; // base filename, e.g. "MyProject.checquery"
};

export type PromptNewFileNameResult =
	| { cancelled: true }
	| { cancelled: false; name: string };

export type AppSchema = {
	bun: RPCSchema<{}>;
	webview: RPCSchema<{
		requests: {
			promptNewFileName: {
				params: { suggestedFolder: string };
				response: PromptNewFileNameResult;
			};
		};
		messages: {
			fileOpened: FileOpenedPayload;
		};
	}>;
};
```

### 3. New: `src/bun/db.ts` — owns the single DB connection / current-file state
- Module-level `let currentDb: Database | null`, `let currentPath: string | null`.
- `normalizeCheqPath(folder: string, rawName: string): string` — trims name, appends `.checquery` if missing, joins with `node:path`'s `join` (not manual string concatenation).
- `createNewFile(folder, rawName): { ok: true, path, fileId, name } | { ok: false, error }`
  - Reject if `existsSync(path)` (no silent overwrite — matches "leave current file unchanged on failure").
  - `new Database(path, { create: true })`, create `_checquery_meta`, insert `file_id` (via `createId()` from `@paralleldrive/cuid2`) and `created_at` (`new Date().toISOString()`).
  - On success: close any previous connection, set `currentDb`/`currentPath`, return success payload.
  - On failure: close the half-created DB handle if any, return `{ ok: false, error }` without touching `currentDb`/`currentPath`.
- `openExistingFile(path): { ok: true, path, fileId, name } | { ok: false, error }`
  - `new Database(path, { create: false, readwrite: true })` — throws if missing; catch and return error.
  - Query `SELECT value FROM _checquery_meta WHERE key = 'file_id'`; if missing/throws (e.g. table doesn't exist), close the connection and return an error — **do not** touch `currentDb`/`currentPath`.
  - On success: close previous connection, set new state, return success payload.

### 4. New: `src/bun/menu.ts` — File menu + handlers
- `setupApplicationMenu(window: BrowserWindow<any>, rpc)` where `rpc` is typed structurally as `{ request: { promptNewFileName(...): Promise<PromptNewFileNameResult> }, send: { fileOpened(payload): void } }` (avoids re-deriving the generic `BrowserView.defineRPC` return type).
- `ApplicationMenu.setApplicationMenu([{ label: "File", submenu: [ {label:"New...", action:"file:new", accelerator:"CmdOrCtrl+N"}, {label:"Open...", action:"file:open", accelerator:"CmdOrCtrl+O"} ] }])`.
- `ApplicationMenu.on("application-menu-clicked", (event) => { const action = (event as any)?.data?.action; ... })` dispatching to `handleNewFile` / `handleOpenFile`.
- `handleNewFile`: folder dialog (`canChooseFiles:false, canChooseDirectory:true, allowsMultipleSelection:false`) → if cancelled, return → `rpc.request.promptNewFileName({ suggestedFolder: folder })` → if cancelled, return → `db.createNewFile(folder, name)` → on error, `Utils.showMessageBox({type:"error", title:"Cannot Create File", message: error})`; on success, `window.setTitle(name)` + `rpc.send.fileOpened(payload)`.
- `handleOpenFile`: file dialog (`canChooseFiles:true, canChooseDirectory:false, allowsMultipleSelection:false, allowedFileTypes:"checquery"`) → if cancelled, return → `db.openExistingFile(path)` → on error, error message box; on success, `window.setTitle(name)` + `rpc.send.fileOpened(payload)`.
- Note: the exact string format `allowedFileTypes` expects at the native layer on Windows is unverified from source alone — verify empirically in testing; if `"checquery"` doesn't filter as expected, fall back to `"*"` plus a post-selection `.toLowerCase().endsWith(".checquery")` check before calling `openExistingFile`.

### 5. Edit: `src/bun/index.ts`
- Build `rpc = BrowserView.defineRPC<AppSchema>({ handlers: { requests: {}, messages: {} } })` (bun handles nothing from webview yet).
- Pass `rpc` into `new BrowserWindow({ ..., rpc })`.
- Call `setupApplicationMenu(mainWindow, rpc)` after window creation.
- Leave the existing dev-server URL resolution logic untouched.

### 6. New: `src/mainview/rpc.ts` — webview-side RPC + reactive state
- `export const [currentFile, setCurrentFile] = createSignal<FileOpenedPayload | null>(null)`.
- `export const [pendingPrompt, setPendingPrompt] = createSignal<{ suggestedFolder: string; resolve: (r: PromptNewFileNameResult) => void } | null>(null)`.
- `const rpc = Electroview.defineRPC<AppSchema>({ handlers: { requests: { promptNewFileName: (params) => new Promise((resolve) => setPendingPrompt({ suggestedFolder: params.suggestedFolder, resolve })) }, messages: { fileOpened: (payload) => setCurrentFile(payload) } } })`.
- `new Electroview({ rpc })` to wire the transport.

### 7. New: `src/mainview/NewFileModal.tsx`
- Tailwind-styled modal, visible via `<Show when={pendingPrompt()}>`, with a text input for the filename.
- Submit → `pendingPrompt()!.resolve({ cancelled: false, name: trimmedName })`, clear signal.
- Cancel/escape → `pendingPrompt()!.resolve({ cancelled: true })`, clear signal.
- No extension handling here — `db.ts`'s `normalizeCheqPath` owns that.

### 8. Edit: `src/mainview/App.tsx`
- Import `"./rpc"` (side-effect: sets up Electroview + RPC) and `currentFile` from it; mount `<NewFileModal />`.
- Minimal visible proof the feature works: replace the subtitle text with `currentFile() ? "Open: " + name + " (id: " + fileId + ")" : "No file open — use File > New or File > Open"`. Leave the rest of the placeholder content untouched.

No changes needed to `electrobun.config.ts`, `vite.config.ts`, or `tsconfig.json` — `bun:sqlite`/`node:fs`/`node:path` are Bun built-ins, and `src/shared/` is already covered by `tsconfig.json`'s `include: ["src"]`.

## Verification

1. `bun run dev:hmr` — window opens, subtitle shows "No file open".
2. File > New (menu or `Ctrl+N`): pick a folder → modal appears → type a name without extension → Create.
   - Title bar updates to `<name>.checquery`; subtitle shows the file id.
   - On disk, confirm via a throwaway script (`bun -e 'import {Database} from "bun:sqlite"; console.log(new Database("<path>").query("SELECT * FROM _checquery_meta").all())'`) that both `file_id` and `created_at` rows exist.
3. Repeat File > New with the same folder/name → native error dialog ("already exists"); title/subtitle unchanged.
4. File > Open → pick the file from step 2 → title/subtitle update, same `file_id`, no error dialog.
5. File > Open on a non-`.checquery` SQLite file (or any file lacking `_checquery_meta`) → native error dialog ("not a valid .checquery file"); previously-open file/title unchanged.
6. Note whether the `allowedFileTypes: "checquery"` filter actually restricts the OS picker on Windows; adjust per the fallback noted in step 4 of the file list above if not.
