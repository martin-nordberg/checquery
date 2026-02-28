import {type Accessor, createMemo, createSignal, onMount, Show} from "solid-js";
import type {Statement} from "$shared/domain/statements/Statement.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import {type CurrencyAmt, fromCents, toCents} from "$shared/domain/core/CurrencyAmt.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import {genStmtId} from "$shared/domain/statements/StmtId.ts";
import {statementClientSvc} from "../../clients/statements/StatementClientSvc.ts";
import EditableDateField from "../common/fields/EditableDateField.tsx";
import EditableAmountField from "../common/fields/EditableAmountField.tsx";
import ConfirmDialog from "../common/dialogs/ConfirmDialog.tsx";
import useAbandonConfirm from "../common/hooks/useAbandonConfirm.ts";

/**
 * Returns the first and last days of the latest whole month up to today.
 * Uses the current month if today is its last day, otherwise the prior month.
 */
const defaultStatementDates = (): { beginDate: IsoDate, endDate: IsoDate } => {
    const today = new Date()
    const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    let year: number
    let month: number
    if (today.getDate() === lastDayOfCurrentMonth) {
        year = today.getFullYear()
        month = today.getMonth()
    } else {
        const prior = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        year = prior.getFullYear()
        month = prior.getMonth()
    }

    const lastDay = new Date(year, month + 1, 0).getDate()
    const mm = String(month + 1).padStart(2, '0')
    return {
        beginDate: `${year}-${mm}-01` as IsoDate,
        endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` as IsoDate,
    }
}

type ReconcilePanelProps = {
    accountName: string
    checkedTxnIds: Accessor<Set<TxnId>>
    checkedAmountCents: number
    defaultBeginningBalance: CurrencyAmt
    onInitCheckedTxnIds: (txnIds: TxnId[]) => void
    onClose: () => void
    onSaved: () => void
    onDeleted: () => void
}

const ReconcilePanel = (props: ReconcilePanelProps) => {

    const [existingStatement, setExistingStatement] = createSignal<Statement | null>(null)
    const [isLoading, setIsLoading] = createSignal(true)
    const [isSaving, setIsSaving] = createSignal(false)

    const [beginDate, setBeginDate] = createSignal<IsoDate | undefined>(undefined)
    const [endDate, setEndDate] = createSignal<IsoDate | undefined>(undefined)
    const [beginningBalance, setBeginningBalance] = createSignal<CurrencyAmt | undefined>(undefined)
    const [endingBalance, setEndingBalance] = createSignal<CurrencyAmt | undefined>(undefined)
    const [initialTxnIds, setInitialTxnIds] = createSignal<Set<TxnId>>(new Set())

    const isEditing = () => existingStatement() !== null

    const reconciledBalance = createMemo(() => {
        const bb = beginningBalance()
        const bbCents = bb ? toCents(bb) : 0
        return fromCents(bbCents + props.checkedAmountCents)
    })

    const difference = createMemo(() => {
        const eb = endingBalance()
        const ebCents = eb ? toCents(eb) : 0
        const rb = reconciledBalance()
        const rbCents = toCents(rb)
        return fromCents(ebCents - rbCents)
    })

    const txnIdsDirty = () => {
        const current = props.checkedTxnIds()
        const initial = initialTxnIds()
        if (current.size !== initial.size) {
            return true
        }
        for (const id of current) {
            if (!initial.has(id)) {
                return true
            }
        }
        return false
    }

    const isDirty = createMemo(() => {
        const stmt = existingStatement()
        if (stmt) {
            // Edit mode: dirty if any field differs from loaded statement
            return txnIdsDirty()
                || beginDate() !== stmt.beginDate
                || endDate() !== stmt.endDate
                || beginningBalance() !== stmt.beginningBalance
                || endingBalance() !== stmt.endingBalance
        } else {
            // Create mode: dirty if any field differs from defaults
            const defaults = defaultStatementDates()
            return txnIdsDirty()
                || beginDate() !== defaults.beginDate
                || endDate() !== defaults.endDate
                || beginningBalance() !== props.defaultBeginningBalance
                || endingBalance() !== undefined
        }
    })

    const abandon = useAbandonConfirm(isDirty, props.onClose)

    onMount(async () => {
        try {
            const statements = await statementClientSvc.findStatementsAll()
            const unreconciled = statements.find(
                s => s.account === props.accountName && !s.isReconciled
            )
            if (unreconciled) {
                setExistingStatement(unreconciled)
                setBeginDate(unreconciled.beginDate)
                setEndDate(unreconciled.endDate)
                setBeginningBalance(unreconciled.beginningBalance)
                setEndingBalance(unreconciled.endingBalance)
                props.onInitCheckedTxnIds(unreconciled.transactions)
                setInitialTxnIds(new Set(unreconciled.transactions))
            } else {
                const defaults = defaultStatementDates()
                setBeginDate(defaults.beginDate)
                setEndDate(defaults.endDate)
                setBeginningBalance(props.defaultBeginningBalance)
            }
        } finally {
            setIsLoading(false)
        }
    })

    const saveStatement = async (reconciled: boolean) => {
        setIsSaving(true)
        try {
            const stmt = existingStatement()
            const transactions = [...props.checkedTxnIds()]
            if (stmt) {
                await statementClientSvc.patchStatement({
                    id: stmt.id,
                    beginDate: beginDate(),
                    endDate: endDate(),
                    beginningBalance: beginningBalance(),
                    endingBalance: endingBalance(),
                    isReconciled: reconciled,
                    transactions,
                })
            } else {
                await statementClientSvc.createStatement({
                    id: genStmtId(),
                    account: props.accountName,
                    beginDate: beginDate()!,
                    endDate: endDate()!,
                    beginningBalance: beginningBalance() ?? '$0.00' as CurrencyAmt,
                    endingBalance: endingBalance() ?? '$0.00' as CurrencyAmt,
                    isReconciled: reconciled,
                    transactions,
                })
            }
            props.onSaved()
        } finally {
            setIsSaving(false)
        }
    }

    const handleSave = () => saveStatement(false)
    const handleFinalize = () => saveStatement(true)

    const handleDelete = async () => {
        const stmt = existingStatement()
        if (!stmt) {
            return
        }
        setIsSaving(true)
        try {
            await statementClientSvc.deleteStatement(stmt.id)
            props.onDeleted()
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div class="flex-none bg-blue-50 border-b border-gray-200 p-4">
            <ConfirmDialog
                isOpen={abandon.showAbandonConfirm()}
                message="Abandon unsaved changes?"
                onYes={abandon.doCancel}
                onNo={abandon.dismissConfirm}
            />
            <Show when={!isLoading()} fallback={<p class="text-sm text-gray-500">Loading...</p>}>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium text-blue-700">
                        {isEditing() ? "Edit Statement" : "Reconcile with Account Statement"}
                    </span>
                    <button
                        onClick={abandon.handleCancel}
                        class="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 cursor-pointer"
                        title="Close"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="grid gap-3" style={{"grid-template-columns": "1fr 1fr 1fr 1fr 0.5fr 0.5fr"}}>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Begin Date</label>
                        <EditableDateField
                            value={beginDate() ?? '' as IsoDate}
                            onChange={setBeginDate}
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Beginning Balance</label>
                        <EditableAmountField
                            value={beginningBalance() ?? '$0.00' as CurrencyAmt}
                            onChange={setBeginningBalance}
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                        <EditableDateField
                            value={endDate() ?? '' as IsoDate}
                            onChange={setEndDate}
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Ending Balance</label>
                        <EditableAmountField
                            value={endingBalance() ?? '$0.00' as CurrencyAmt}
                            onChange={setEndingBalance}
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Reconciled Balance</label>
                        <div class="text-sm px-2 py-1 h-[30px] bg-gray-100 rounded border border-gray-200 text-gray-700 text-right">
                            {reconciledBalance()}
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Difference</label>
                        <div class={`text-sm px-2 py-1 h-[30px] bg-gray-100 rounded border border-gray-200 text-right ${difference() === '$0.00' ? 'text-green-700' : 'text-red-700'}`}>
                            {difference()}
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button
                        type="button"
                        onClick={handleFinalize}
                        disabled={isSaving() || difference() !== '$0.00'}
                        class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        {isSaving() ? 'Saving...' : 'Finalize'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving() || !isDirty()}
                        class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                        </svg>
                        {isSaving() ? 'Saving...' : 'Save for Later'}
                    </button>
                    <Show when={isEditing()}>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSaving()}
                            class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Delete
                        </button>
                    </Show>
                </div>
            </Show>
        </div>
    )
}

export default ReconcilePanel
