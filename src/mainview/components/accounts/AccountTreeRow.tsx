import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { AccountTreeNode } from "../../accounts/buildAccountTree";
import { accountDetailRoute } from "../../accounts/accountRoute";
import AccountTree from "./AccountTree";
import { useAccountTreeActions } from "./AccountTreeContext";

type AccountTreeRowProps = {
	node: AccountTreeNode;
	depth: number;
};

export default function AccountTreeRow(props: AccountTreeRowProps) {
	const actions = useAccountTreeActions();
	const [expanded, setExpanded] = createSignal(true);
	const hasChildren = () => props.node.children.length > 0;
	const isEditingHere = () => actions.editingId() === props.node.account.id;

	return (
		<>
			<tr class="group hover:bg-gray-50" classList={{ "bg-blue-50": isEditingHere() }}>
				<td class="px-2 py-2 text-center">
					<button
						type="button"
						class="rounded p-1 text-blue-600 hover:bg-gray-200 hover:text-blue-800"
						onClick={() => actions.requestEdit(props.node.account.id)}
						aria-label={`Edit ${props.node.account.name}`}
						title="Edit account"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
							/>
						</svg>
					</button>
				</td>
				<td class="px-4 py-2 text-sm text-gray-900">
					<div class="flex items-center gap-2" style={{ "padding-left": `${props.depth * 1.5}rem` }}>
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
						<A href={accountDetailRoute(actions.acctType, props.node.account.id)} class="hover:underline">
							{props.node.account.name}
						</A>
					</div>
				</td>
				<td class="px-4 py-2 text-sm text-gray-500">{props.node.account.description}</td>
				<td class="px-2 py-2 text-center">
					<Show when={props.node.account.isPrimary}>
						<span class="text-blue-600" title="Primary account">
							★
						</span>
					</Show>
				</td>
				<td class="px-4 py-2 text-sm">
					<button
						type="button"
						class="text-xs text-blue-600 opacity-0 hover:underline group-hover:opacity-100"
						onClick={() => actions.requestAdd(props.node.account.id)}
					>
						+ Add child account
					</button>
				</td>
			</tr>
			<Show when={hasChildren() && expanded()}>
				<AccountTree nodes={props.node.children} depth={props.depth + 1} />
			</Show>
		</>
	);
}
