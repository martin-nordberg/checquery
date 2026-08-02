import "./rpc";
import { currentFile } from "./rpc";
import NewFileModal from "./NewFileModal";
import PasswordModal from "./PasswordModal";
import FileInfoModal from "./FileInfoModal";
import ErrorAlertModal from "./ErrorAlertModal";

export default function App() {
	return (
		<main>
			<NewFileModal />
			<PasswordModal />
			<FileInfoModal />
			<ErrorAlertModal />
			<div class="container">
				<h1>Checquery</h1>
				<p class="subtitle">
					{currentFile()
						? `Open: ${currentFile()!.name} (id: ${currentFile()!.fileId})`
						: "No file open — use File > New or File > Open"}
				</p>
			</div>
		</main>
	);
}
