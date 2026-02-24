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
cd client && tsc -b
cd server && tsc --noEmit
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
2. **Service interfaces** in `shared/src/services/` define the contract (e.g., `IAccountSvc`)
3. **Database repositories** in `shared/src/database/` implement interfaces using PGlite
4. **Event writers** in `shared/src/events/` implement the same interfaces to append YAML directives
5. **Tee services** in `shared/src/services/` fan out writes to multiple implementations (e.g., DB + event log)
6. **Client services** in `client/src/clients/` implement the same interfaces using Hono's typed client

Example flow for accounts:
- `shared/src/routes/accounts/AccountRoutes.ts` - defines REST routes with Zod validation
- `shared/src/services/accounts/IAccountSvc.ts` - service interface
- `shared/src/database/accounts/AccountRepo.ts` - PGlite implementation
- `shared/src/events/AccountEventWriter.ts` - YAML event writer
- `shared/src/services/accounts/AccountTeeSvc.ts` - tees writes to both repo and event writer
- `client/src/clients/accounts/AccountClientSvc.ts` - HTTP client using Hono's `hc`

### Domain Model

Domain types are in `shared/src/domain/` with Zod schemas for validation:
- **accounts/**: Account, AcctId, AcctType, AcctNumber
- **transactions/**: Transaction, Entry, TxnId, TxnStatus
- **organizations/**: Organization, OrgId
- **balancesheet/**: BalanceSheet
- **incomestatement/**: IncomeStatement
- **core/**: Name, Summary, IsoDate, Period, CurrencyAmt, Branded types

### Event Sourcing Pattern

The server loads data from YAML files at startup via `shared/src/events/ChecqueryEventLoader.ts`. YAML files contain action directives (e.g., `{action: 'create-account', payload: {...}}`). At runtime, API mutations are teed to both the database and event writers that append new directives to the YAML log.

Event writers (`shared/src/events/`): `AccountEventWriter`, `TransactionEventWriter`, `VendorEventWriter`, `StatementEventWriter` — each implements the corresponding service interface but only for write operations (reads throw "Not implemented").

### Tee Service Pattern

Tee services (e.g., `AccountTeeSvc`) accept an array of `IAccountSvc` implementations. Write operations (create, update, delete) are forwarded to **all** services in sequence. Read operations (find) delegate to only the **first** service (`svcs[0]`), which is the database repo.

### Database

- Uses [PGlite](https://pglite.dev/docs/) — Postgres compiled to WASM, running in-process
- `shared/src/database/PgLiteDb.ts` - wrapper with Hybrid Logical Clock (HLC) for distributed timestamps; forces all operations through `transaction()`
- `shared/src/database/CheckqueryPgDdl.ts` - schema definitions with HLC columns for conflict-free merging
- Each entity has a Repo (e.g., `AccountRepo`) that delegates to a TxnRepo (e.g., `AccountTxnRepo`) within a transaction
- `shared/src/database/register/RegisterRepo.ts` - register-specific reads with running balance computation; delegates mutations to `ITransactionSvc`

### Validation

Custom Zod validator at `shared/src/routes/validation/zxvalidator.ts` bridges Hono middleware and Zod schemas.

## Workflow

- **Never offer to commit changes.** The user reviews and commits all changes externally in SourceTree.

## Code Style

- **Always use block statements with braces for `if` statements.** Never use single-line `if` statements without braces (e.g., `if (x) return` or `if (x) y = z`). Always wrap the body in `{ }`, even for one-liners.
