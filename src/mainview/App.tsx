import "./rpc";
import { createEffect } from "solid-js";
import { useLocation, type RouteSectionProps } from "@solidjs/router";
import NewFileModal from "./NewFileModal";
import PasswordModal from "./PasswordModal";
import FileInfoModal from "./FileInfoModal";
import ErrorAlertModal from "./ErrorAlertModal";
import { recordLocation } from "./navigationHistory";

/** Router root: modals stay mounted across every route; {props.children} is the matched page. */
export default function App(props: RouteSectionProps) {
	const location = useLocation();
	// Records every settled route (including the initial one) for the top nav's Back/Forward
	// buttons -- see navigationHistory.ts.
	createEffect(() => {
		recordLocation(location.pathname + location.search);
	});

	return (
		<>
			<NewFileModal />
			<PasswordModal />
			<FileInfoModal />
			<ErrorAlertModal />
			{props.children}
		</>
	);
}
