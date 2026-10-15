import type { ApiErrorCode } from "@checquery/shared/api/apiError";
import { setApiErrorListener } from "./apiClient";
import { setCurrentUser } from "./authSession";
import { currentFile, refreshFileSession, resetFileSession, setCurrentFile, setErrorAlert } from "./fileSession";

/**
 * How the app recovers when any /api call reveals the session changed under it -- the server restarted or the
 * login expired (`unauthenticated`), the file was closed by another session or the idle timeout
 * (`no-file-open`), or another session opened a different file (`file-locked`). Registered once from main.tsx.
 * Clearing the user/file signals is enough to move the UI: App.tsx's guard sends a signed-out session to
 * /login, and a file-less one back home.
 */
export function handleSessionError(code: ApiErrorCode): void {
	switch (code) {
		case "unauthenticated":
			setCurrentUser(null);
			resetFileSession();
			break;
		case "no-file-open":
			if (currentFile()) {
				setErrorAlert({
					title: "File Closed",
					message: "The file was closed -- by another session, or after being left idle.",
				});
			}
			setCurrentFile(null);
			break;
		case "file-locked":
			setCurrentFile(null);
			void refreshFileSession().catch(() => undefined);
			break;
	}
}

export function registerSessionRecovery(): void {
	setApiErrorListener(handleSessionError);
}
