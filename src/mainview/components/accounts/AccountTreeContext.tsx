import { createContext, useContext, type Accessor } from "solid-js";
import type { Account } from "../../../shared/domain/accounts/Account";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";

export type TreeNodeKind = "category" | "account";

/**
 * Shared state/actions for one AccountListPage's tree, threaded via context instead of drilling props
 * through every recursive AccountTree/AccountTreeRow level. acctType is fixed for the whole tree (the
 * page's route param) -- nothing in this tree ever lets the user pick or change it.
 *
 * Unlike the old (account-to-account) tree this replaces, "add" and "edit" requests both need to carry
 * *which kind* of node is being created/edited, since a tree node is now either a category (can have
 * children) or an account (always a leaf) -- see account-categories-implementation-plan.md §7.
 */
export type AccountTreeActions = {
	acctType: AcctTypeStr;
	/** The full (unfiltered) category list, for AccountCategoryParentPicker's type-filtering/cycle-exclusion. */
	categories: Accessor<AccountCategory[]>;
	/** The full (unfiltered) account list, for AccountParentPicker's type-filtering. */
	accounts: Accessor<Account[]>;

	/** The in-progress "new node" request, or null if none is open. Only one at a time. */
	addingRequest: Accessor<{ kind: TreeNodeKind; parentCtgId: AcctCtgId } | null>;
	/** Opens the "new category" modal as a child of the given parent category (or the type root). */
	requestAddCategory: (parentCtgId: AcctCtgId) => void;
	/** Opens the "new account" modal as a child of the given parent category. Never the type root directly
	 * (see §0) -- callers only ever invoke this from a category row's "+ Add account" link. */
	requestAddAccount: (parentCtgId: AcctCtgId) => void;
	/** Called after a successful create: refetches both lists and closes the modal. */
	onAdded: () => void;
	/** Called to abandon the in-progress new-node modal without creating anything. */
	onCancelAdd: () => void;

	/** The in-progress "edit" request, or null if none is open. Only one at a time. */
	editingRequest: Accessor<{ kind: TreeNodeKind; id: AcctCtgId | AcctId } | null>;
	/** Switches the given category into edit mode. */
	requestEditCategory: (id: AcctCtgId) => void;
	/** Switches the given account into edit mode. */
	requestEditAccount: (id: AcctId) => void;
	/** Called after a successful patch or delete: refetches both lists and closes edit mode. */
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
