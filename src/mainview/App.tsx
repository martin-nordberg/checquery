import "./rpc";
import type { RouteSectionProps } from "@solidjs/router";
import NewFileModal from "./NewFileModal";
import PasswordModal from "./PasswordModal";
import FileInfoModal from "./FileInfoModal";
import ErrorAlertModal from "./ErrorAlertModal";

/** Router root: modals stay mounted across every route; {props.children} is the matched page. */
export default function App(props: RouteSectionProps) {
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
