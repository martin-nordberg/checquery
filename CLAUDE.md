# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository currently contains the unmodified **Electrobun + SolidJS** starter template (`electrobun-solid`). It is a desktop app scaffold — a Bun-powered native shell (Electrobun) hosting a SolidJS UI, built with Vite. There is no application-specific logic yet.

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
