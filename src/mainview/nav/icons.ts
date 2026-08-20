/**
 * Hand-rolled inline SVG stroke-path data, matching the old checquery client's approach (no icon library
 * dependency -- see ../checquery/client/src/nav/stmtNavOptions.ts). All paths assume a 24x24 viewBox.
 */

/** Shared by all four per-account-type list pages (Asset/Liability/Income/Expense Accounts). */
export const accountsIconPath =
	"M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z";

export const vendorsIconPath =
	"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z";

export const balanceSheetIconPath =
	"M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3";

export const incomeStatementIconPath =
	"M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z";

export const registerIconPath =
	"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01";

export const expenseLogIconPath = "M6 6L18 18M18 18H10M18 18v-8";

export const incomeLogIconPath = "M6 18L18 6M18 6H10M18 6v8";

/** New to checquery -- a simple bar-chart glyph for the Budgeting section / Annual Budget page. */
export const budgetIconPath = "M4 20h16M7 20V10m5 10V4m5 16v-7";

/** Printer glyph for the Balance Sheet / Income Statement print buttons -- see PrintButton.tsx. */
export const printIconPath =
	"M6 9V4a1 1 0 011-1h10a1 1 0 011 1v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v7H6v-7z";

/** Document-with-plus glyph for HomePage's "Create a New File" button. */
export const newFileIconPath =
	"M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";

/** Folder glyph for HomePage's "Open an Existing File" button. */
export const openFileIconPath = "M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z";

/** "Sign out of a door" glyph for HomePage's "Exit the Program" button. */
export const exitIconPath =
	"M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1";

/** Circled "i" glyph for HomePage's "File Info" button. */
export const fileInfoIconPath = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";

/** Circled "x" glyph for HomePage's "Close This File" button. */
export const closeFileIconPath = "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z";
