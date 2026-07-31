import "./rpc";
import { currentFile } from "./rpc";
import NewFileModal from "./NewFileModal";

export default function App() {
	return (
		<main>
			<NewFileModal />
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
