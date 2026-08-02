import { A } from "@solidjs/router";
import { Show } from "solid-js";
import Breadcrumb from "./Breadcrumb";
import { currentFile } from "../../rpc";

type FileBreadcrumbProps = {
	/** False on the file hub page itself, where this segment is the current page (no self-link). */
	linkHome?: boolean;
};

/** The `[File Name]` breadcrumb segment. Renders nothing when no file is open. There's only ever one
 * file open at a time, so unlike other breadcrumbs this never becomes a HoverableDropDown -- it has no
 * siblings to switch between. */
export default function FileBreadcrumb(props: FileBreadcrumbProps) {
	return (
		<Show when={currentFile()}>
			{(file) => (
				<Breadcrumb>
					{props.linkHome === false ? (
						file().name
					) : (
						<A class="hover:underline" href="/">
							{file().name}
						</A>
					)}
				</Breadcrumb>
			)}
		</Show>
	);
}
