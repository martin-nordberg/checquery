import type { LedgerStore } from "../persistence/ledgerStore/LedgerStore";
import type { OrigId } from "@checquery/shared/domain/origins/OrigId";

/** What every entity handler (handlers/*Handlers.ts) writes through: the open file's store, and the Origin of
 * the login session making the request. Built per request by the requireUnlockedFile middleware. */
export type HandlerSession = {
	store: LedgerStore;
	origId: OrigId;
};

/** Thrown when a request needs the open file but none is open (mapped to 409 `no-file-open`). */
export class NoFileOpenError extends Error {
	constructor() {
		super("No file is open.");
		this.name = "NoFileOpenError";
	}
}
