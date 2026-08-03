import { getCurrentLedgerStore, getCurrentOrigId } from "./persistence/db";
import type { LedgerStore } from "./persistence/ledgerStore/LedgerStore";
import type { OrigId } from "../shared/domain/origins/OrigId";

/** Shared by every entity's RPC handlers (accountHandlers.ts, vendorHandlers.ts, ...): the store and
 * origin to write through for the currently open file, or a thrown error if none is open. */
export function requireCurrentSession(): { store: LedgerStore; origId: OrigId } {
	const store = getCurrentLedgerStore();
	const origId = getCurrentOrigId();
	if (!store || !origId) {
		throw new Error("No file open");
	}
	return { store, origId };
}
