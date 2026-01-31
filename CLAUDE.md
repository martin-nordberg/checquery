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
- **server/**: Bun runtime with Hono web framework, in-memory SQLite database
- **shared/**: Domain types, service interfaces, and route definitions used by both client and server

### Path Alias

Both client and server use `$shared/*` to import from `shared/src/*`. This is configured in each workspace's tsconfig.json and in Vite's config.

### Type-Safe API Layer

The project uses Hono's type-safe client (`hc`) to share route types between client and server:

1. **Routes** are defined in `shared/src/routes/` using Hono and Zod validation
2. **Service interfaces** in `shared/src/services/` define the contract (e.g., `IAccountSvc`)
3. **Server implementations** in `server/src/sqlservices/` implement interfaces using SQLite
4. **Client services** in `client/src/clients/` implement the same interfaces using Hono's typed client

Example flow for accounts:
- `shared/src/routes/accounts/AccountRoutes.ts` - defines REST routes with Zod validation
- `shared/src/services/accounts/IAccountSvc.ts` - service interface
- `server/src/sqlservices/accounts/AccountSqlSvc.ts` - SQLite implementation
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

The server loads data from YAML files in a `data/` directory at startup:
- `server/src/eventsources/AcctEvents.ts` - loads account directives
- `server/src/eventsources/TxnEvents.ts` - loads transaction directives
- `server/src/eventsources/OrgEvents.ts` - loads organization directives

YAML files contain action directives (e.g., `{action: 'create', payload: {...}}`).

### Database

- Uses Bun's built-in SQLite with an in-memory database
- `server/src/sqldb/ChecquerySqlDb.ts` - wrapper with prepared statement caching and Zod parsing
- `server/src/sqldb/checqueryDdl.ts` - schema definitions

### Validation

Custom Zod validator at `shared/src/routes/validation/zxvalidator.ts` bridges Hono middleware and Zod schemas.
