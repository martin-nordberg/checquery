import {Show} from "solid-js";

type MessageDialogProps = {
    isOpen: boolean,
    message: string,
    onClose: () => void,
}

const MessageDialog = (props: MessageDialogProps) => {
    return (
        <Show when={props.isOpen}>
            <div class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="fixed inset-0 bg-black opacity-30" onClick={props.onClose}></div>
                <div class="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                    <p class="text-gray-700 mb-4">{props.message}</p>
                    <div class="flex justify-end">
                        <button
                            onClick={props.onClose}
                            class="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    )
}

export default MessageDialog
