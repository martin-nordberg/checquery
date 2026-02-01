import {Show} from "solid-js";

type RegisterActionButtonsProps = {
    onCancel: () => void,
    onSave: () => void,
    onDelete?: () => void,
    isSaving?: boolean,
    isNew?: boolean,
}

const RegisterActionButtons = (props: RegisterActionButtonsProps) => {
    return (
        <div class="flex gap-2 mt-2">
            <button
                type="button"
                onClick={props.onCancel}
                disabled={props.isSaving}
                class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={props.onSave}
                disabled={props.isSaving}
                class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {props.isSaving ? 'Saving...' : 'Save'}
            </button>
            <Show when={!props.isNew && props.onDelete}>
                <button
                    type="button"
                    onClick={props.onDelete}
                    disabled={props.isSaving}
                    class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                    Delete
                </button>
            </Show>
        </div>
    )
}

export default RegisterActionButtons
