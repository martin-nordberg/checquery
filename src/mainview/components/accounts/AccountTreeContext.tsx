import { createContext, useContext, type Accessor } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";

/**
 * Shared state/actions for one AccountListPage's tree, threaded via context instead of drilling props
 * through every recursive AccountTree/AccountTreeRow level. acctType is fixed for the whole tree (the
 * page's route param) -- see documentation/account-list-implementation-plan.md §0: nothing in this tree
 * ever lets the user pick or change it.
 */
export type AccountTreeActions = {
	acctType: AcctTypeStr;
	/** The full (unfiltered) account list, for AccountParentPicker's type-filtering/cycle-exclusion. */
	accounts: Accessor<Account[]>;

	/** The parentId the "new account" modal is currently open for, or null if it's closed. Only one at a time. */
	addingParentId: Accessor<AcctId | null>;
	/** Opens the "new account" modal as a child of the given parent (a tree node's id, or the type root). */
	requestAdd: (parentId: AcctId) => void;
	/** Called after a successful create: refetches the account list and closes the modal. */
	onAdded: () => void;
	/** Called to abandon the in-progress new-account modal without creating anything. */
	onCancelAdd: () => void;

	/** The account id currently in edit mode, or null if none is. Only one at a time. */
	editingId: Accessor<AcctId | null>;
	/** Switches the given row into edit mode. */
	requestEdit: (id: AcctId) => void;
	/** Called after a successful patch or delete: refetches the account list and closes edit mode. */
	onEdited: () => void;
	/** Called to abandon in-progress edits without saving. */
	onCancelEdit: () => void;
};

const AccountTreeContext = createContext<AccountTreeActions>();

export const AccountTreeProvider = AccountTreeContext.Provider;

export function useAccountTreeActions(): AccountTreeActions {
	const actions = useContext(AccountTreeContext);
	if (!actions) {
		throw new Error("useAccountTreeActions() called outside an AccountTreeProvider");
	}
	return actions;
}
