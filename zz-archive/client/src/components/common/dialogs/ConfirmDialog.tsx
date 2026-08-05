import {Show} from "solid-js";

type ConfirmDialogProps = {
    isOpen: boolean,
    message: string,
    onYes: () => void,
    onNo: () => void,
}

const ConfirmDialog = (props: ConfirmDialogProps) => {
    return (
        <Show when={props.isOpen}>
            <div class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="fixed inset-0 bg-black opacity-30" onClick={props.onNo}></div>
                <div class="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                    <p class="text-gray-700 mb-4">{props.message}</p>
                    <div class="flex justify-end gap-2">
                        <button
                            onClick={props.onNo}
                            class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                            No
                        </button>
                        <button
                            onClick={props.onYes}
                            class="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Yes
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    )
}

export default ConfirmDialog
