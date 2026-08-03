import { For, Show } from "solid-js";
import type { AccountTreeNode } from "../../accounts/buildAccountTree";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import AccountTreeRow from "./AccountTreeRow";
import NewAccountRow from "./NewAccountRow";
import { useAccountTreeActions } from "./AccountTreeContext";

type AccountTreeProps = {
	nodes: AccountTreeNode[];
	/** The account id these nodes are children of (a tree node's id, or the type root). */
	parentId: AcctId;
	depth?: number;
};

/** Renders a list of AccountTreeNodes recursively, plus the "new account" modal if one is open under this
 * parentId. Takes the already-built tree as a prop (see buildAccountTree.ts) -- owns no data fetching
 * itself, only the create-form-open state (via AccountTreeContext, shared with the whole page's tree). */
export default function AccountTree(props: AccountTreeProps) {
	const actions = useAccountTreeActions();
	const depth = () => props.depth ?? 0;

	return (
		<>
			<For each={props.nodes}>{(node) => <AccountTreeRow node={node} depth={depth()} />}</For>
			<Show when={actions.addingParentId() === props.parentId}>
				<NewAccountRow parentId={props.parentId} />
			</Show>
		</>
	);
}
