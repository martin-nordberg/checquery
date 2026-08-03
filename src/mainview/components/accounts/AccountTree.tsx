import { For } from "solid-js";
import type { AccountTreeNode } from "../../accounts/buildAccountTree";
import AccountTreeRow from "./AccountTreeRow";

type AccountTreeProps = {
	nodes: AccountTreeNode[];
	depth?: number;
};

/** Renders a list of AccountTreeNodes recursively as <tr> rows -- must be mounted inside a <tbody>. Takes
 * the already-built tree as a prop (see buildAccountTree.ts) -- owns no data fetching itself. Create/edit
 * are modals now (see NewAccountRow/EditableAccountRow), rendered once at the page level rather than at
 * their tree position, so this component has nothing to do with either. */
export default function AccountTree(props: AccountTreeProps) {
	const depth = () => props.depth ?? 0;
	return <For each={props.nodes}>{(node) => <AccountTreeRow node={node} depth={depth()} />}</For>;
}
