/**
 * Shapes from the old checquery client/server's YAML action log (see
 * ../checquery/server/src/events/ChecqueryYamlAppender.ts for the writer, and
 * ../checquery/shared/src/domain/{accounts,vendors,transactions,statements}/*.ts for the fields each action's
 * payload can carry). checquery2 never needs to re-validate these at the field level -- they just get
 * translated and handed to checquery2's own domain schemas, which validate for real (see importState.ts) --
 * so these types are deliberately loose (every field but `id` optional, matching how update/delete payloads
 * only ever carry `id` plus whichever fields changed).
 */

export type OldAction =
	| "create-account"
	| "update-account"
	| "delete-account"
	| "create-vendor"
	| "update-vendor"
	| "delete-vendor"
	| "create-transaction"
	| "update-transaction"
	| "delete-transaction"
	| "create-statement"
	| "update-statement"
	| "delete-statement";

export type OldDirective = {
	action: OldAction;
	payload: Record<string, unknown>;
};

const oldActions: ReadonlySet<string> = new Set<OldAction>([
	"create-account",
	"update-account",
	"delete-account",
	"create-vendor",
	"update-vendor",
	"delete-vendor",
	"create-transaction",
	"update-transaction",
	"delete-transaction",
	"create-statement",
	"update-statement",
	"delete-statement",
]);

/** Minimal structural sanity check on one parsed YAML array element -- not a full validation of every field,
 * just enough to catch "this isn't actually a directive log" before spending an hour replaying it. */
export function isOldDirective(value: unknown): value is OldDirective {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.action === "string" &&
		oldActions.has(record.action) &&
		typeof record.payload === "object" &&
		record.payload !== null
	);
}

export type OldAcctType = "ASSET" | "LIABILITY" | "EQUITY" | "EXPENSE" | "INCOME";

/** create-account/update-account/delete-account payload -- acctType is only ever present on create. */
export type OldAccountPayload = {
	id: string;
	acctType?: OldAcctType;
	name?: string;
	description?: string;
	// acctNumber and isPrimary exist on the old schema but are never read -- see plan §0.
};

/** create-vendor/update-vendor/delete-vendor payload. */
export type OldVendorPayload = {
	id: string;
	name?: string;
	description?: string;
	defaultAccount?: string;
	isActive?: boolean;
};

export type OldEntry = {
	account: string;
	debit?: string;
	credit?: string;
};

/** create-transaction/update-transaction/delete-transaction payload. */
export type OldTransactionPayload = {
	id: string;
	date?: string;
	code?: string;
	vendor?: string;
	description?: string;
	entries?: OldEntry[];
};

export type AccountNameParts = {
	categoryName: string;
	accountName: string;
};

const CATEGORY_SEPARATOR = " : ";

/** Fallback category for a non-EQUITY account name with no " : " separator at all (e.g. a vendor-shaped
 * name like "Ebates" that got created directly as an account) -- real data from at least one real user's
 * log has these, so falling back beats failing the whole import over it. */
const DEFAULT_CATEGORY_NAME = "Other";

/**
 * Splits an old account name like "Banking : Checking" into its category and account parts, at the *first*
 * occurrence of " : " -- verified against all 102 create-account directives in checquery-test-log-2010.yaml:
 * every non-EQUITY name in that file has exactly one separator, so this never needs to decide what a second
 * one would mean, but treats it the safe way (folds into the account name, not a second category level)
 * rather than guessing at multi-level nesting. A name with no separator at all falls back to
 * DEFAULT_CATEGORY_NAME ("Other") rather than being rejected -- getOrCreateCategory's per-acctType caching
 * (see importState.ts) means every account type gets its own independent "Other" category.
 */
export function splitAccountName(fullName: string): AccountNameParts {
	const separatorIndex = fullName.indexOf(CATEGORY_SEPARATOR);
	if (separatorIndex === -1) {
		return { categoryName: DEFAULT_CATEGORY_NAME, accountName: fullName };
	}
	return {
		categoryName: fullName.slice(0, separatorIndex),
		accountName: fullName.slice(separatorIndex + CATEGORY_SEPARATOR.length),
	};
}
