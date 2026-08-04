# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Workflow

Work items live under `tasks/`, in three subfolders that double as a status pipeline:

- **`tasks/todo/`** — one `.md` file per unit of work not yet started, written by the user.
- **`tasks/planned/`** — implementation plans, one per task, not yet implemented.
- **`tasks/done/`** — implementation plans for work that has been implemented.

Process for a task file found in `tasks/todo/`:

1. Read it, and ask clarifying questions as needed. Write a real implementation plan as a new `.md` file in
   `tasks/planned/`, then delete the source file from `tasks/todo/`.
2. Implement the plan, then move its file from `tasks/planned/` to `tasks/done/` (its content may also be
   updated at this point to reflect what was actually built, if it diverged from the plan).

These two steps do not need to happen in the same session, and tasks do not need to be worked one at a
time — `tasks/todo/` and `tasks/planned/` may each hold multiple files awaiting their next step at once.

## Project state

This repository currently contains the unmodified **Electrobun + SolidJS** starter template (`electrobun-solid`). It is a desktop app scaffold — a Bun-powered native shell (Electrobun) hosting a SolidJS UI, built with Vite. There is no application-specific logic yet.

## Domain Model Notes

- **The Net Worth account (`acctIdNetWorth`, the singleton `EQUITY` account) is a bookkeeping device, not a
  reportable account.** It exists only so opening balances and arbitrary asset revaluations (e.g. updating a
  home's value from a Zillow estimate) have something to debit/credit against — it is never shown in the UI
  as an account, never linked to, and has no register/detail page. Nothing in this app ever performs a
  periodic "closing the books" entry that would move net income into it (unlike a corporation's books), so
  its own running balance does **not** track actual net worth over time — it only reflects opening-balance
  and revaluation postings, not the accumulated effect of income/expense activity.
- **Net Worth for reporting purposes is always computed as `Assets − Liabilities`, as of whatever date is in
  scope — never by summing the Net Worth account's own entries.** This is deliberate, not a simplification:
  because there's no periodic closing entry, the two would silently diverge over time as income/expense
  transactions change Asset balances with no corresponding entry against Net Worth. `Assets − Liabilities` is
  the only value that actually equals net worth at any point in time; treat it as the source of truth
  anywhere net worth needs to be displayed (balance sheet, and any future report that needs it).

## Commands

Package manager is **Bun** (`bun.lock` present) — use `bun run <script>`, not npm/yarn.

- `bun run start` — build the Vite frontend once, then launch the Electrobun app (no HMR).
- `bun run dev` — run Electrobun in watch mode against the last build.
- `bun run dev:hmr` — full dev loop: runs the Vite dev server (`bun run hmr`) and `bun run start` concurrently, giving hot module replacement in the desktop shell.
- `bun run hmr` — Vite dev server alone, on a fixed port (5173).
- `bun run build:canary` — production build via `vite build` followed by `electrobun build --env=canary`.

There are no test or lint scripts configured in `package.json`, and no ESLint/Prettier/Biome config exists in the repo.

## Architecture

Two separate runtime targets share one TypeScript project, compiled independently:

- **`src/bun/index.ts`** — the Electrobun main process (runs under Bun). Creates the native `BrowserWindow`. Contains dev-vs-production URL resolution logic: it probes `http://localhost:5173` (the Vite dev server) and uses it when available (channel `"dev"`), otherwise falls back to the bundled `views://mainview/index.html`. This is the one place that bridges the Electrobun shell and the Vite-built frontend.
- **`src/mainview/`** — the SolidJS frontend (runs in the Electrobun webview), built by Vite. Entry point is `main.tsx` → renders `App.tsx` into `#app` in `index.html`. Vite's `root` is `src/mainview` (see `vite.config.ts`); build output goes to `dist/` at the repo root.

**Build/copy flow** (`electrobun.config.ts`): Vite builds `src/mainview` → `dist/`, then Electrobun's `build.copy` maps `dist/index.html` and `dist/assets` into `views/mainview/...` inside the packaged app (`build/`). Always run the Vite build before an Electrobun build/dev step that needs fresh frontend assets — `bun run start` does this automatically; `bun run dev` does not.

`tsconfig.json` targets `src/` only, with SolidJS's `jsxImportSource` configured for the `preserve` JSX transform — required for `.tsx` files under `src/mainview` to compile correctly.

**Styling**: Tailwind CSS v4 is wired in via the `@tailwindcss/vite` plugin in `vite.config.ts` (no separate `tailwind.config.js`/PostCSS config needed for v4). `src/mainview/app.css` starts with `@import "tailwindcss";` followed by the app's existing hand-written CSS.
