import {z} from "zod";

/** Schema for a Checquery transaction status. */
export const txnStatusSchema =
    z.enum(['FORECAST', 'UNMARKED', 'RECONCILED'])

export const txnStatusCodes = txnStatusSchema.options

export type TxnStatusStr = z.infer<typeof txnStatusSchema>

export function txnStatusText(txnStatus: TxnStatusStr) {
    switch (txnStatus) {
        case 'FORECAST':
            return "Forecast"
        case 'UNMARKED':
            return "Unmarked"
        case 'RECONCILED':
            return "Reconciled"
    }
}

export function txnStatusFromCode(txnStatusCode: string): TxnStatusStr {
    switch (txnStatusCode) {
        case "":
            return 'UNMARKED'
        case "!":
            return 'FORECAST'
        case "*":
            return 'RECONCILED'
    }

    throw Error(`Unknown transaction status code: ${txnStatusCode}`)
}