import { createSignal, Show } from "solid-js";
import type { AccountTreeNode } from "../../accounts/buildAccountTree";
import AccountTree from "./AccountTree";
import EditableAccountRow from "./EditableAccountRow";
import { useAccountTreeActions } from "./AccountTreeContext";

type AccountTreeRowProps = {
	node: AccountTreeNode;
	depth: number;
};

export default function AccountTreeRow(props: AccountTreeRowProps) {
	const actions = useAccountTreeActions();
	const [expanded, setExpanded] = createSignal(true);
	const hasChildren = () => props.node.children.length > 0;
	const isAddingHere = () => actions.addingParentId() === props.node.account.id;
	const isEditingHere = () => actions.editingId() === props.node.account.id;
	const showChildren = () => (hasChildren() && expanded()) || isAddingHere();

	return (
		<>
			<div
				class="group flex items-center gap-2 py-1"
				style={{ "padding-left": `${props.depth * 1.5}rem` }}
			>
				<button
					type="button"
					class="w-4 shrink-0 text-slate-400 hover:text-slate-600"
					classList={{ invisible: !hasChildren() }}
					disabled={!hasChildren()}
					onClick={() => setExpanded((v) => !v)}
					aria-label={expanded() ? "Collapse" : "Expand"}
				>
					{expanded() ? "▾" : "▸"}
				</button>
				<button
					type="button"
					class="flex-1 cursor-pointer text-left text-slate-800 hover:underline"
					onClick={() => actions.requestEdit(props.node.account.id)}
				>
					{props.node.account.name}
				</button>
				<Show when={props.node.account.description}>
					<span class="text-sm text-slate-500">{props.node.account.description}</span>
				</Show>
				<Show when={props.node.account.isPrimary}>
					<span class="text-xs font-medium text-blue-600" title="Primary account">
						★
					</span>
				</Show>
				<button
					type="button"
					class="text-xs text-blue-600 opacity-0 hover:underline group-hover:opacity-100"
					onClick={() => actions.requestAdd(props.node.account.id)}
				>
					+ Add child account
				</button>
			</div>
			{/* A modal, not an inline row -- see EditableAccountRow's own doc comment for why. */}
			<Show when={isEditingHere()}>
				<EditableAccountRow account={props.node.account} />
			</Show>
			<Show when={showChildren()}>
				<AccountTree nodes={props.node.children} parentId={props.node.account.id} depth={props.depth + 1} />
			</Show>
		</>
	);
}
