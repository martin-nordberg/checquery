import { createSignal } from "solid-js";

/**
 * Shared "cancel with a confirmation if there are unsaved changes" behavior for NewTransactionRow/
 * EditableTransactionRow, mirroring the old client's useAbandonConfirm.ts hook. `handleCancel` is what the
 * row's own Cancel/Escape handlers call; it shows the confirm dialog only when `isDirty()` is true, otherwise
 * cancels immediately.
 */
export default function useAbandonConfirm(isDirty: () => boolean, onConfirmedCancel: () => void) {
	const [showAbandonConfirm, setShowAbandonConfirm] = createSignal(false);

	const handleCancel = () => {
		if (isDirty()) {
			setShowAbandonConfirm(true);
		} else {
			onConfirmedCancel();
		}
	};

	const doCancel = () => {
		setShowAbandonConfirm(false);
		onConfirmedCancel();
	};

	const dismissConfirm = () => setShowAbandonConfirm(false);

	return { showAbandonConfirm, handleCancel, doCancel, dismissConfirm };
}
