import {z} from "zod";

/** Schema for a Checquery transaction status. */
export const txnStatusSchema =
    z.enum(['FORECAST', 'UNMARKED', 'PENDING', 'RECONCILED'])

export const txnStatusCodes = txnStatusSchema.options

export type TxnStatusStr = z.infer<typeof txnStatusSchema>

export function txnStatusCode(txnStatus: TxnStatusStr) {
    switch (txnStatus) {
        case 'FORECAST':
            return "F"
        case 'UNMARKED':
            return ""
        case 'PENDING':
            return "r"
        case 'RECONCILED':
            return "R"
    }
}

export function txnStatusText(txnStatus: TxnStatusStr) {
    switch (txnStatus) {
        case 'FORECAST':
            return "Forecast"
        case 'UNMARKED':
            return ""
        case 'PENDING':
            return "Pending"
        case 'RECONCILED':
            return "Reconciled"
    }
}

export function txnStatusFromCode(txnStatusCode: string): TxnStatusStr {
    switch (txnStatusCode) {
        case "":
            return 'UNMARKED'
        case "F":
            return 'FORECAST'
        case "r":
            return 'PENDING'
        case "R":
            return 'RECONCILED'
    }

    throw Error(`Unknown transaction status code: ${txnStatusCode}`)
}