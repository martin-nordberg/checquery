import {Show} from "solid-js";

type RegisterActionButtonsProps = {
    onSave: () => void,
    onDelete?: () => void,
    onAddEntry: () => void,
    isSaving?: boolean,
    isNew?: boolean,
    isDirty?: boolean,
}

const RegisterActionButtons = (props: RegisterActionButtonsProps) => {
    return (
        <div class="flex gap-2 mt-2">
            <button
                type="button"
                onClick={props.onSave}
                disabled={props.isSaving || !props.isDirty}
                class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {props.isSaving ? 'Saving...' : 'Save'}
            </button>
            <Show when={!props.isNew && props.onDelete}>
                <button
                    type="button"
                    onClick={props.onDelete}
                    disabled={props.isSaving}
                    class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                </button>
            </Show>
            <div class="flex-1"></div>
            <button
                type="button"
                onClick={props.onAddEntry}
                class="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 mr-75"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Entry
            </button>
        </div>
    )
}

export default RegisterActionButtons
