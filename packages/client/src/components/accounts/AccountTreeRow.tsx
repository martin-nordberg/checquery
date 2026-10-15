import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { AccountTreeNode } from "../../accountCategories/buildAccountCategoryTree";
import { accountDetailRoute } from "../../accounts/accountRoute";
import AccountTree from "./AccountTree";
import { useAccountTreeActions } from "./AccountTreeContext";

type AccountTreeRowProps = {
	node: AccountTreeNode;
	depth: number;
};

/** One row: a category (branch, can have children) or an account (always a leaf). See
 * documentation/account-categories-implementation-plan.md §7 for the two-links-per-category-row design. */
export default function AccountTreeRow(props: AccountTreeRowProps) {
	const actions = useAccountTreeActions();
	const [expanded, setExpanded] = createSignal(true);
	// Captured once -- each row is a fresh component instance per node object (see buildAccountCategoryTree,
	// which produces a brand-new tree on every refetch), so there's no staleness risk in reading this eagerly
	// rather than through a reactive accessor, and it buys plain TS narrowing on node.kind throughout below.
	const node = props.node;

	const hasChildren = () => node.kind === "category" && node.children.length > 0;
	const isEditingHere = () => {
		const editing = actions.editingRequest();
		if (!editing) return false;
		const id = node.kind === "category" ? node.category.id : node.account.id;
		return editing.kind === node.kind && editing.id === id;
	};
	const name = (node.kind === "category" ? node.category.name : node.account.name) as string;
	const description = (node.kind === "category" ? node.category.description : node.account.description) as string;

	return (
		<>
			<tr class="group hover:bg-gray-50" classList={{ "bg-blue-50": isEditingHere() }}>
				<td class="px-2 py-2 text-center">
					<button
						type="button"
						class="rounded p-1 text-blue-600 hover:bg-gray-200 hover:text-blue-800"
						onClick={() => (node.kind === "category" ? actions.requestEditCategory(node.category.id) : actions.requestEditAccount(node.account.id))}
						aria-label={`Edit ${name}`}
						title={node.kind === "category" ? "Edit category" : "Edit account"}
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
						<Show when={node.kind === "account"} fallback={<span class="font-semibold text-slate-700">{name}</span>}>
							<A href={accountDetailRoute(actions.acctType, (node as Extract<AccountTreeNode, { kind: "account" }>).account.id)} class="hover:underline">
								{name}
							</A>
						</Show>
					</div>
				</td>
				<td class="px-4 py-2 text-sm text-gray-500">{description}</td>
				<td class="px-2 py-2 text-center">
					<Show when={node.kind === "account" && node.account.isPrimary}>
						<span class="text-blue-600" title="Primary account">
							★
						</span>
					</Show>
				</td>
				<td class="px-4 py-2 text-sm">
					<Show when={node.kind === "category"}>
						<div class="flex gap-3 opacity-0 group-hover:opacity-100">
							<button
								type="button"
								class="text-xs text-blue-600 hover:underline"
								onClick={() => actions.requestAddCategory((node as Extract<AccountTreeNode, { kind: "category" }>).category.id)}
							>
								+ Add category
							</button>
							<button
								type="button"
								class="text-xs text-blue-600 hover:underline"
								onClick={() => actions.requestAddAccount((node as Extract<AccountTreeNode, { kind: "category" }>).category.id)}
							>
								+ Add account
							</button>
						</div>
					</Show>
				</td>
			</tr>
			<Show when={node.kind === "category" && hasChildren() && expanded()}>
				<AccountTree nodes={(node as Extract<AccountTreeNode, { kind: "category" }>).children} depth={props.depth + 1} />
			</Show>
		</>
	);
}
