# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Checquery is a personal finance/accounting application with double-entry bookkeeping. It consists of a SolidJS frontend, a Bun/Hono backend, and a shared library for domain types and route definitions.

## Development Commands

```bash
# Install dependencies (from root)
bun install

# Run the client (port 3000)
cd client && bun run dev

# Run the server (port 3001)
cd server && bun run dev

# Build client for production
cd client && bun run build

# Type check (no emit)
cd client && bunx tsc -b
cd server && bunx tsc --noEmit
```

## Architecture

### Monorepo Structure

- **client/**: SolidJS SPA with Vite, TailwindCSS
- **server/**: Bun runtime with Hono web framework
- **shared/**: Domain types, service interfaces, database repositories, event sourcing, and route definitions used by both client and server

### Path Alias

Both client and server use `$shared/*` to import from `shared/src/*`. This is configured in each workspace's tsconfig.json and in Vite's config.

### Type-Safe API Layer

The project uses Hono's type-safe client (`hc`) to share route types between client and server:

1. **Routes** are defined in `shared/src/routes/` using Hono and Zod validation
2. **Service interfaces** in `shared/src/services/` define the contract (e.g., `IAccountSvc`, split into `IAccountQrySvc` and `IAccountCmdSvc`)
3. **Database repositories** in `shared/src/database/` implement interfaces using PGlite
4. **Event writers** in `server/src/events/` append YAML directives to the log file
5. **WS writers** in `server/src/ws/` broadcast write events to all connected WebSocket clients
6. **Tee services** in `shared/src/services/` fan out writes to multiple implementations (repo + event writer + WS writer)
7. **Client services** in `client/src/clients/` implement read-side interfaces using Hono's typed client

Example flow for account mutations (server-authoritative write path):
- `shared/src/routes/accounts/AccountRoutes.ts` - REST route triggers `AccountTeeSvc`
- `shared/src/services/accounts/AccountTeeSvc.ts` - fans out to all `cmdSvcs`: repo, event writer, WS writer
- `server/src/events/AccountEventWriter.ts` - appends directive to YAML log
- `server/src/ws/AccountWsWriter.ts` - broadcasts directive to all WebSocket clients
- Client's `WsClient` receives the broadcast and applies it to the local PGlite DB via repo methods

### Domain Model

Domain types are in `shared/src/domain/` with Zod schemas for validation:
- **accounts/**: Account, AcctId, AcctType, AcctNumber
- **transactions/**: Transaction, Entry, Entries, TxnId, TxnStatus
- **vendors/**: Vendor, VndrId
- **statements/**: Statement, StmtId
- **register/**: Register
- **balancesheet/**: BalanceSheet
- **incomestatement/**: IncomeStatement
- **core/**: Name, Description, IsoDate, Period, CurrencyAmt, HybridLogicalClock, Branded types

### Event Sourcing Pattern

The server loads data from YAML files at startup via `server/src/events/ChecqueryEventLoader.ts`. YAML files contain action directives (e.g., `{action: 'create-account', payload: {...}}`). At runtime, API mutations are teed to both the database and event writers that append new directives to the YAML log.

Event writers (`server/src/events/`): `AccountEventWriter`, `TransactionEventWriter`, `VendorEventWriter`, `StatementEventWriter` — each implements the corresponding service interface but only for write operations (reads throw "Not implemented"). The YAML file path is set via the `CHECQUERY_LOG_FILE` environment variable.

### Tee Service Pattern

Tee services (e.g., `AccountTeeSvc`) split query and command sides:
- Constructor takes a `qrySvc: IAccountQrySvc` and `cmdSvcs: IAccountCmdSvc[]`
- Read operations delegate to `qrySvc` (the database repo)
- Write operations fan out to **all** `cmdSvcs` in sequence: `[repo, eventWriter, wsWriter]`

The WS writer is the last in the chain so the client only sees writes that have already been persisted to both DB and YAML log.

### Database

- Uses [PGlite](https://pglite.dev/docs/) — Postgres compiled to WASM, running in-process
- `shared/src/database/PgLiteDb.ts` - wrapper with Hybrid Logical Clock (HLC) for distributed timestamps; forces all operations through `transaction()`
- `shared/src/database/CheckqueryPgDdl.ts` - schema definitions with HLC columns for conflict-free merging
- Each entity has a Repo (e.g., `AccountRepo`) that delegates to a TxnRepo (e.g., `AccountTxnRepo`) within a transaction
- `shared/src/database/register/RegisterRepo.ts` - register-specific reads with running balance computation; delegates mutations to `ITransactionSvc`

### WebSocket / Real-Time Updates

The server exposes two endpoints for real-time state synchronization:
- `GET /ws` — WebSocket upgrade; `WsManager` (`server/src/ws/WsManager.ts`) tracks all connected clients and broadcasts per-write directive messages
- `GET /replay` — returns all YAML directives as JSON for bulk state catch-up; flushes the append queue first to guarantee consistency

The client side:
- `WsClient` (`client/src/ws/WsClient.ts`) connects to `/ws` and dispatches incoming `{action, payload}` messages to the local PGlite repos (same Zod schemas used for YAML directives)
- On reconnect, `WsClient` fetches `/replay` to re-apply all directives before re-opening the WebSocket, with exponential backoff (1 s → 30 s)
- `createLiveQuery` (`client/src/queries/createLiveQuery.ts`) wraps PGlite's live extension to drive reactive SolidJS signals — any write applied to the local DB automatically re-fetches the query and updates the UI

The client's local PGlite DB is **write-only via WebSocket**. The client never writes to its own DB directly; all mutations go through the server API → tee → WS broadcast → client dispatch.

### Logging

`server/src/logger.ts` — thin structured JSON logger (`{ts, level, msg, ...data}`) used throughout server startup and WebSocket lifecycle. Output goes to stdout/stderr.

### Validation

Custom Zod validator at `shared/src/routes/validation/zxvalidator.ts` bridges Hono middleware and Zod schemas.

## Workflow

- **Never offer to commit changes.** The user reviews and commits all changes externally in SourceTree.

## Code Style

- **Always use block statements with braces for `if` statements.** Never use single-line `if` statements without braces (e.g., `if (x) return` or `if (x) y = z`). Always wrap the body in `{ }`, even for one-liners.
- **Always use `??` instead of `||` for default values.** `??` only falls back on `null` or `undefined`, whereas `||` also treats `0`, `false`, and `""` as falsy. Use `??` when the intent is "use this value unless it's absent".
