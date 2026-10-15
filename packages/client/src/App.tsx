import { createEffect, createSignal, onMount, Show } from "solid-js";
import { useLocation, useNavigate, type RouteSectionProps } from "@solidjs/router";
import NewFileModal from "./NewFileModal";
import OpenFileModal from "./components/files/OpenFileModal";
import FileInfoModal from "./FileInfoModal";
import ErrorAlertModal from "./ErrorAlertModal";
import { recordLocation } from "./navigationHistory";
import { currentUser, initAuth } from "./api/authSession";
import { currentFile, refreshFileSession, setErrorAlert } from "./api/fileSession";
import { errorMessage } from "./api/apiClient";
import { displayName } from "./files/fileDisplay";

/**
 * Router root: modals stay mounted across every route; {props.children} is the matched page.
 *
 * Also owns the session-driven navigation a browser refresh or a pasted link needs (the desktop app always
 * started fresh at `/` with nothing open): first ask the server who's signed in and what's open, then
 * - signed out → `/login?next=<requested page>`;
 * - signed in on `/login` → on to `next` (or `/`);
 * - signed in on a page that needs a file, with none open (for this session) → `/`.
 * The same rules handle a session lost mid-use (sessionRecovery.ts just clears the signals).
 */
export default function App(props: RouteSectionProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const [ready, setReady] = createSignal(false);

	onMount(async () => {
		try {
			await initAuth();
			if (currentUser()) await refreshFileSession();
		} catch (e) {
			setErrorAlert({ title: "Cannot Reach the Server", message: errorMessage(e) });
		}
		setReady(true);
	});

	// Records every settled route (including the initial one) for the top nav's Back/Forward
	// buttons -- see navigationHistory.ts.
	createEffect(() => {
		recordLocation(location.pathname + location.search);
	});

	createEffect(() => {
		if (!ready()) return;
		const path = location.pathname;
		if (!currentUser()) {
			if (path !== "/login") {
				navigate(`/login?next=${encodeURIComponent(path + location.search)}`, { replace: true });
			}
		} else if (path === "/login") {
			const next = new URLSearchParams(location.search).get("next");
			void refreshFileSession()
				.catch(() => undefined)
				.finally(() => navigate(next?.startsWith("/") ? next : "/", { replace: true }));
		} else if (path !== "/" && !currentFile()) {
			navigate("/", { replace: true });
		}
	});

	createEffect(() => {
		const file = currentFile();
		document.title = file ? `${displayName(file.name)} - Checquery` : "Checquery";
	});

	return (
		<>
			<NewFileModal />
			<OpenFileModal />
			<FileInfoModal />
			<ErrorAlertModal />
			<Show when={ready()}>{props.children}</Show>
		</>
	);
}
