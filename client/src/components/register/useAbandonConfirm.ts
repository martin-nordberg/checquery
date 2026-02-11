import {type Accessor, createSignal} from "solid-js";

const useAbandonConfirm = (isDirty: Accessor<boolean>, onConfirmedCancel: () => void) => {
    const [showAbandonConfirm, setShowAbandonConfirm] = createSignal(false)

    const handleCancel = () => {
        if (isDirty()) {
            setShowAbandonConfirm(true)
            return
        }
        doCancel()
    }

    const doCancel = () => {
        setShowAbandonConfirm(false)
        onConfirmedCancel()
    }

    const dismissConfirm = () => setShowAbandonConfirm(false)

    return {showAbandonConfirm, handleCancel, doCancel, dismissConfirm}
}

export default useAbandonConfirm
