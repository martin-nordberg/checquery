import {createContext, useContext} from 'solid-js'
import type {IAccountSvc} from '$shared/services/accounts/IAccountSvc.ts'
import type {IVendorSvc} from '$shared/services/vendors/IVendorSvc.ts'
import type {ITransactionSvc} from '$shared/services/transactions/ITransactionSvc.ts'
import type {IStatementSvc} from '$shared/services/statements/IStatementSvc.ts'
import type {IRegisterSvc} from '$shared/services/register/IRegisterSvc.ts'
import type {IBalanceSheetSvc} from '$shared/services/balancesheet/IBalanceSheetSvc.ts'
import type {IIncomeStatementSvc} from '$shared/services/incomestatement/IIncomeStatementSvc.ts'

export type Services = {
    acctSvc: IAccountSvc
    vndrSvc: IVendorSvc
    txnSvc: ITransactionSvc
    stmtSvc: IStatementSvc
    regSvc: IRegisterSvc
    bsSvc: IBalanceSheetSvc
    isSvc: IIncomeStatementSvc
}

export const ServicesContext = createContext<Services>()

export const useServices = (): Services => {
    const ctx = useContext(ServicesContext)
    if (!ctx) {
        throw new Error('useServices must be called within a ServicesContext.Provider')
    }
    return ctx
}
