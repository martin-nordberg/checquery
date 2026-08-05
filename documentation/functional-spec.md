# Checquery — Functional Specification

> This document describes what Checquery does and how it behaves, independent of any particular technology choice. Technology-specific details (languages, frameworks, libraries) are confined to the Appendix. This specification is intended to be sufficient for a complete reimplementation.

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Core Concepts](#2-core-concepts)
3. [Data Model](#3-data-model)
   - 3.1 [Accounts](#31-accounts)
   - 3.2 [Vendors](#32-vendors)
   - 3.3 [Transactions & Entries](#33-transactions--entries)
   - 3.4 [Statements](#34-statements)
   - 3.5 [Value Types](#35-value-types)
4. [Feature: Account Management](#4-feature-account-management)
5. [Feature: Vendor Management](#5-feature-vendor-management)
6. [Feature: Transaction Entry](#6-feature-transaction-entry)
7. [Feature: Register View](#7-feature-register-view)
8. [Feature: Balance Sheet](#8-feature-balance-sheet)
9. [Feature: Income Statement](#9-feature-income-statement)
10. [Feature: Expense & Income Logs](#10-feature-expense--income-logs)
11. [Feature: Reconciliation](#11-feature-reconciliation)
12. [Feature: Home Dashboard](#12-feature-home-dashboard)
13. [Business Rules & Validation](#13-business-rules--validation)
14. [Audit Log & Replay](#14-audit-log--replay)
15. [Real-Time Synchronisation](#15-real-time-synchronisation)
16. [Identifier Scheme](#16-identifier-scheme)
17. [Appendix A — Technology Stack](#appendix-a--technology-stack)
18. [Appendix B — Currency Encoding](#appendix-b--currency-encoding)
19. [Appendix C — Distributed Timestamp Scheme](#appendix-c--distributed-timestamp-scheme)

---

## 1. Purpose & Scope

Checquery is a single-user personal finance application based on **double-entry bookkeeping**. It provides:

- A chart of accounts organised by account type.
- Transaction entry with an arbitrary number of posting lines (entries) per transaction, subject to the constraint that debits equal credits.
- A running-balance register per account.
- Standard financial reports: balance sheet and income statement.
- Drill-down logs for individual expense and income accounts.
- Bank-statement reconciliation.
- A vendor (payee/payor) master list to speed up data entry.
- A durable, human-readable audit log that can be replayed from scratch to reconstruct the full database state.
- Real-time synchronisation across multiple open browser sessions.

The system is designed for one user operating over a local network. There is no concept of multiple users, roles, or permissions.

---

## 2. Core Concepts

### Double-Entry Bookkeeping

Every financial event is recorded as a **transaction** containing two or more **entries**. Each entry posts an amount as either a debit or a credit to a named account. The sum of all debits across a transaction must exactly equal the sum of all credits. This rule is enforced unconditionally.

### Account Types

Every account belongs to exactly one of five types:

| Type | Normal Balance | Appears In |
|---|---|---|
| Asset | Debit | Balance Sheet |
| Liability | Credit | Balance Sheet |
| Equity | Credit | Balance Sheet |
| Expense | Debit | Income Statement |
| Income | Credit | Income Statement |

"Normal balance" determines how increases to that account are recorded (e.g., an asset increases with a debit).

### Account Naming

Account names may use a colon-space-colon (` : `) separator to convey a logical hierarchy (e.g., `Assets : Checking`). This separator is a display convention only; the system treats the name as a single flat string. No tree structure is enforced.

### Periods

Financial reports are scoped to a **period**. Three period granularities are supported:

- **Annual**: a calendar year, e.g. `2025`
- **Monthly**: a calendar month, e.g. `2025-11`
- **Quarterly**: a calendar quarter, e.g. `2025-Q3`

A period always resolves to an inclusive start date and an inclusive end date.

---

## 3. Data Model

### 3.1 Accounts

An **account** is the fundamental unit of the chart of accounts.

| Field | Required | Constraints |
|---|---|---|
| id | system-generated | Unique, immutable once assigned |
| name | yes | Unique across all accounts; max 200 characters; no newlines |
| account type | yes | One of: Asset, Liability, Equity, Expense, Income |
| account number | no | Max 50 characters; alphanumeric, hyphens, and dollar signs only |
| description | no | Max 200 characters; no newlines |
| is primary | no | Boolean; default false |

**is primary** is a UI hint. Primary accounts are surfaced prominently on the home dashboard.

Accounts support **soft deletion**: a deleted account is hidden from normal use but its data is retained so that historical transactions remain valid.

### 3.2 Vendors

A **vendor** represents a payee or payor. Vendors simplify transaction entry by pre-filling the default account.

| Field | Required | Constraints |
|---|---|---|
| id | system-generated | Unique, immutable |
| name | yes | Unique across all vendors; max 200 characters; no newlines |
| description | no | Max 200 characters; no newlines |
| default account | no | Name of an existing account |
| is active | no | Boolean; default true |

Inactive vendors are hidden from normal lists but can be shown on demand. A vendor cannot be deleted if it is referenced by any transaction; it should be deactivated instead.

### 3.3 Transactions & Entries

A **transaction** records a single financial event.

| Field | Required | Constraints |
|---|---|---|
| id | system-generated | Unique, immutable |
| date | yes | ISO calendar date (YYYY-MM-DD) |
| vendor | no | Name of a known vendor; max 200 characters |
| description | no | Free text; max 200 characters; no newlines |
| code | no | Check number or reference code; max 50 characters |
| entries | yes | Two or more entries; debits must equal credits |

Either **vendor** or **description** (or both) must be provided; a transaction with neither is invalid.

Each **entry** within a transaction:

| Field | Required | Constraints |
|---|---|---|
| account | yes | Name of an existing account; max 200 characters |
| debit | yes | Currency amount ≥ $0.00 |
| credit | yes | Currency amount ≥ $0.00 |
| comment | no | Free text; max 200 characters |
| status | no | One of: _(blank)_, Pending, Reconciled |

Exactly one of debit or credit must be non-zero on any given entry. Both zero and both non-zero are invalid.

### 3.4 Statements

A **statement** represents a bank or financial-institution statement for one account, covering a date range.

| Field | Required | Constraints |
|---|---|---|
| id | system-generated | Unique, immutable |
| account | yes | Name of an existing account |
| begin date | yes | ISO date |
| end date | yes | ISO date; unique per (account, end date) among non-deleted statements |
| beginning balance | yes | Currency amount; default $0.00 |
| ending balance | yes | Currency amount; default $0.00 |
| is reconciled | no | Boolean; default false |
| transactions | no | List of transaction IDs included in this statement period |

Only one active statement may exist for a given (account, end date) pair.

### 3.5 Value Types

#### Currency Amount

Amounts are displayed as `$#,###.##` with comma grouping. Negative amounts are displayed as `($#,###.##)`. Internally, amounts are stored as integer cents to avoid floating-point error.

#### ISO Date

Dates are represented as `YYYY-MM-DD` strings. Valid dates span from 2000-01-01 through any date in the 2000s.

#### Period

A period string takes one of three forms:

- `YYYY` — resolves to January 1–December 31 of that year
- `YYYY-MM` — resolves to the first and last day of that month
- `YYYY-Q1`, `YYYY-Q2`, `YYYY-Q3`, `YYYY-Q4` — resolves to the first and last day of that calendar quarter

---

## 4. Feature: Account Management

### List View

The Accounts page shows all non-deleted accounts in a searchable list. Each row displays: name, account type, account number, description, and is-primary flag.

Search filters rows by name or account number (case-insensitive substring match).

### Creating an Account

A blank creation row is always visible at the top of the list. The user fills in name, account type, and optionally account number, description, and is-primary. Submitting creates the account immediately (inline; no separate form page).

### Editing an Account

Any field of an existing account can be edited inline. The user clicks a row to enter edit mode, modifies fields, and saves. Each field update is sent as a partial update (only changed fields).

### Deleting an Account

An account can only be deleted if it is not referenced by any transaction entry or as the default account for any vendor. The delete action is confirmed before execution. If the account is in use, deletion is blocked and the user is notified.

---

## 5. Feature: Vendor Management

### List View

The Vendors page shows vendors in a searchable list with a status filter (Active / Inactive / All). Each row displays: name, default account, description, and is-active flag.

### Creating, Editing, Deleting

Same inline-edit pattern as accounts. Vendor deletion is blocked if the vendor is referenced by any transaction; the user should mark the vendor inactive instead.

---

## 6. Feature: Transaction Entry

Transactions are created and edited from within the **Register** view (see §7). The entry form supports:

- **Date**: defaults to the date used in the immediately preceding new transaction (sticky date).
- **Vendor**: chosen from the vendor list via autocomplete. Selecting a vendor pre-fills the default account into the second entry line.
- **Description**: free text, used when no vendor applies or as supplemental detail.
- **Code**: optional check/reference number.
- **Entries**: one or more entry lines. Each line captures account, amount (debit or credit), and optional comment. The form begins with two entry lines and allows adding more for split transactions.
- **Inline calculator**: the amount field supports arithmetic expressions (e.g. `12.50 + 8.75`) that are evaluated before submission.

A transaction can be edited inline on the register. All fields including individual entry lines are editable. Changes to entries replace the entire set of entries for that transaction.

A transaction can be deleted from the register row. Deletion removes it from all registers and reports.

The system recycles the most recent transaction for a given vendor and account pair as a template when entering a new transaction with the same vendor, to minimise repetitive data entry.

---

## 7. Feature: Register View

The register shows all transactions that touch a specific account, in date order (earliest at the bottom, most recent at the top). Each row represents one entry of a transaction, showing:

| Column | Notes |
|---|---|
| Date | Transaction date |
| Code | Check number or reference, if any |
| Status | Blank, Pending, or Reconciled (shown as symbol) |
| Vendor | Vendor name, if any |
| Description | Transaction description, if any |
| Offset Account | The other account(s) in the transaction (multi-entry transactions show a summary) |
| Debit | Amount debited to this account |
| Credit | Amount credited to this account |
| Running Balance | Cumulative balance as of this transaction |

The register supports **search** across vendor, description, and date (case-insensitive substring on text fields, prefix match on date).

The register also supports **reconciliation mode** (see §11).

---

## 8. Feature: Balance Sheet

The balance sheet report is an as-of-date snapshot of Assets, Liabilities, and Equity.

### As-Of Date Selection

A dropdown offers:
- Today
- The last day of each of the 12 preceding calendar months

### Display

Each account type (Asset, Liability, Equity) is shown as a section with one line per account and a section total. The report also displays a grand-total check: Total Assets should equal Total Liabilities + Total Equity.

### Navigation

From the balance sheet for a given month-end date, the user can navigate directly to the income statement for the same month period.

---

## 9. Feature: Income Statement

The income statement report shows income and expenses for a chosen period.

### Period Selection

A dropdown offers:
- The current year, each of the 12 preceding months, each quarter of the current year and the prior year.

### Views

**Summary view**: one line per account, grouped into Expenses and Income sections, with section totals and a Net Income line (Total Income minus Total Expenses).

**Details view**: each account expands to show the individual transactions that make up its total, including date, vendor, description, and amount.

### Navigation

From the income statement, the user can navigate to the balance sheet as of the last day of the same period.

---

## 10. Feature: Expense & Income Logs

An **Expense Log** or **Income Log** is a register-style view scoped to a single expense or income account. It shows every transaction that posts to that account, with the same columns as the register (§7), including running balance.

These views are accessible from the home dashboard for accounts flagged as primary.

---

## 11. Feature: Reconciliation

Reconciliation matches the transactions in the system against a bank or financial-institution statement.

### Process

1. The user opens a register and activates reconciliation mode.
2. The user selects transactions that appear on the statement by checking them.
3. The system shows the running total of checked transactions.
4. When the checked total matches the statement's ending balance, the user can finalise reconciliation, which marks all checked entries as **Reconciled** and creates a Statement record.

### Entry Status Values

| Status | Meaning |
|---|---|
| _(blank)_ | Unreviewed; not associated with any statement |
| Pending | The user has noted this transaction as in-flight (e.g. a cheque not yet cleared) |
| Reconciled | This entry has been matched to a bank statement |

Status is per entry, not per transaction, because a split transaction may have one leg reconciled while another is pending.

---

## 12. Feature: Home Dashboard

The home dashboard provides a summary view and navigation hub. It shows:

- A list of **primary accounts** grouped by account type (Asset, Liability, Equity, Expense, Income).
- Each primary account links to its register (for asset/liability/equity accounts) or its expense/income log (for expense/income accounts).
- Navigation links to: Accounts, Vendors, Balance Sheet, Income Statement.

---

## 13. Business Rules & Validation

### Universal Rules

1. **Balanced transactions**: the sum of all debit amounts across a transaction's entries must equal the sum of all credit amounts.
2. **Entry exclusivity**: each entry must have exactly one non-zero side (debit xor credit).
3. **Transaction narrative**: at least one of vendor or description must be non-empty.
4. **Name uniqueness**: account names are globally unique. Vendor names are globally unique.
5. **Referential integrity**: an account in use (by entries or as a vendor default) cannot be deleted. A vendor in use (by transactions) cannot be deleted.
6. **Statement uniqueness**: only one non-deleted statement may exist for a given (account, end date) pair.
7. **Currency precision**: all amounts are stored and computed with two decimal places.

### Field-Level Constraints

| Field | Max Length | Other |
|---|---|---|
| Account name | 200 | No newlines; unique |
| Account number | 50 | Alphanumeric, hyphens, dollar signs only |
| Account description | 200 | No newlines |
| Vendor name | 200 | No newlines; unique |
| Vendor description | 200 | No newlines |
| Transaction vendor (text) | 200 | No newlines |
| Transaction description | 200 | No newlines |
| Transaction code | 50 | — |
| Entry account (text) | 200 | No newlines |
| Entry comment | 200 | — |

---

## 14. Audit Log & Replay

### Purpose

Every mutation is written to a durable, human-readable **event log** in addition to the operational database. The log is the system of record. The database is a materialised view that can be discarded and rebuilt at any time by replaying the log from the beginning.

### Log Format

The log is an ordered sequence of **directives**. Each directive has an **action** (a string identifier) and a **payload** (the data for that action). Directives are appended only; no directive is ever modified or deleted.

### Action Types

| Action | Description |
|---|---|
| `create-account` | Create a new account with all fields |
| `update-account` | Patch one or more fields of an existing account |
| `delete-account` | Soft-delete an account |
| `create-vendor` | Create a new vendor with all fields |
| `update-vendor` | Patch one or more fields of an existing vendor |
| `delete-vendor` | Soft-delete a vendor |
| `create-transaction` | Create a transaction with its full entry set |
| `update-transaction` | Replace one or more fields of a transaction, including its full entry set |
| `delete-transaction` | Soft-delete a transaction |
| `create-statement` | Create a statement with beginning/ending balances and transaction list |
| `update-statement` | Patch one or more fields of a statement |
| `delete-statement` | Soft-delete a statement |

### Replay Semantics

Replaying the log from the first directive produces the identical database state as the live system. During replay, each directive is validated and applied in order. A replay failure (e.g., a directive whose payload fails schema validation) halts the process with an error indicating the offending directive.

### Mutation Tee

On a live write, the system writes to both the event log and the operational database in sequence. If the database write succeeds but the log write fails (or vice versa), the system is considered to be in an inconsistent state and should surface an error.

---

## 15. Real-Time Synchronisation

The system supports multiple simultaneous browser sessions against the same server. All connected sessions see mutations immediately without requiring a manual refresh.

### Mechanism

1. When a client connects, the server sends a **full replay** of the event log to bring the client's in-memory state up to date.
2. While the replay is in progress, any concurrent mutations are queued.
3. Once replay completes, the queued mutations are delivered in order.
4. Thereafter, every mutation (whether originating from that client or another) is broadcast to all connected clients.
5. Each client applies received mutations to its local in-memory state, causing the UI to update reactively.

### Effect on UX

A user submitting a form sees their change reflected immediately in any other open tabs or devices on the same local network, without a page reload.

---

## 16. Identifier Scheme

Every entity is assigned a **globally unique, collision-resistant ID** at the time of creation. IDs are:

- Generated by the creating client before submission (client-side ID generation).
- Immutable after assignment.
- Prefixed by entity type to make them human-distinguishable at a glance:

| Entity | Prefix | Total Length |
|---|---|---|
| Account | `acct` | 28 characters |
| Transaction | `trxn` | 28 characters |
| Vendor | `vndr` | 28 characters |
| Statement | `stmt` | 28 characters |

The ID is treated as an opaque string by everything except the generation function.

---

## Appendix A — Technology Stack

This appendix records the technologies used in the current implementation. Nothing in the main specification depends on these choices.

### Runtime & Language

- **TypeScript** (strict mode) throughout client, server, and shared library.
- **Bun** runtime for the server (compatible with Node.js APIs).

### Frontend

- **SolidJS** reactive UI framework.
- **Vite** dev server and build tool.
- **TailwindCSS** utility-first CSS framework.

### Backend

- **Hono** web framework for routing and middleware.
- **Zod** schema library for payload validation (custom middleware bridges Hono and Zod).

### Database

- **PGlite** — PostgreSQL compiled to WebAssembly, running in-process on the server.
- A **Hybrid Logical Clock (HLC)** column accompanies every mutable field, enabling CRDT-style conflict resolution for future distributed use. See Appendix C.

### API Layer

- **REST** endpoints (POST / PATCH / DELETE) using Hono's type-safe client (`hc`) to share route types between server and client without code duplication.

### Audit Log

- **YAML** files on the server filesystem. Each directive is a YAML mapping with `action` and `payload` keys. The log file path is configured via the `CHECQUERY_LOG_FILE` environment variable.

### Real-Time Sync

- **WebSocket** (native browser API on the client, Hono's `upgradeWebSocket` on the server). The server maintains one connection per browser tab; a `WsManager` handles per-client queuing and replay.

### Monorepo Structure

```
/
├── client/      # SolidJS SPA
├── server/      # Bun/Hono API server
└── shared/      # Domain types, service interfaces, DB repos, route definitions
```

The `$shared/*` path alias (configured in each workspace's `tsconfig.json` and Vite config) resolves to `shared/src/*`.

---

## Appendix B — Currency Encoding

Currency amounts have two representations:

| Context | Format | Example |
|---|---|---|
| Display / user input | `$#,###.##` or `($#,###.##)` for negatives | `$1,234.56` / `($12.00)` |
| Storage | Integer cents (no decimal point) | `123456` / `-1200` |

Conversion:
- **To storage**: strip `$`, commas, and parentheses; parse as float; multiply by 100; round to nearest integer.
- **To display**: divide by 100; format with two decimal places; add `$` and comma grouping; wrap in parentheses if negative.

The regex used to validate display-format input:

```
^((\$\d{1,3}(,\d{3})*\.\d{2})|(\(\$\d{1,3}(,\d{3})*\.\d{2}\)))$
```

---

## Appendix C — Distributed Timestamp Scheme

Every mutable column in the database has a corresponding **Hybrid Logical Clock (HLC)** column. HLCs are 16-character uppercase hex strings encoding:

| Bits | Meaning |
|---|---|
| 10 hex digits | Wall-clock milliseconds |
| 3 hex digits | Monotonic counter (within same millisecond) |
| 3 hex digits | Node identifier |

HLCs are used to implement last-write-wins CRDT semantics: when the same field is set by two concurrent writers, the write with the higher HLC value wins, regardless of which arrived at the database first.

In the current single-user implementation this mechanism is not exercised, but the schema is designed to support future peer-to-peer or multi-device sync without a migration.
