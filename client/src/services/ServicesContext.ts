import {createContext, useContext} from 'solid-js'
import type {IAccountSvc} from '$shared/services/accounts/IAccountSvc.ts'
import type {IVendorSvc} from '$shared/services/vendors/IVendorSvc.ts'
import type {ITransactionSvc} from '$shared/services/transactions/ITransactionSvc.ts'
import type {IStatementSvc} from '$shared/services/statements/IStatementSvc.ts'
import type {IRegisterQrySvc} from '$shared/services/register/IRegisterQrySvc.ts'
import type {IExpenseLogQrySvc} from '$shared/services/expenselog/IExpenseLogQrySvc.ts'
import type {IBalanceSheetQrySvc} from '$shared/services/balancesheet/IBalanceSheetQrySvc.ts'
import type {IIncomeStatementQrySvc} from '$shared/services/incomestatement/IIncomeStatementQrySvc.ts'

export type Services = {
    acctSvc: IAccountSvc
    vndrSvc: IVendorSvc
    txnSvc: ITransactionSvc
    stmtSvc: IStatementSvc
    regSvc: IRegisterQrySvc
    expSvc: IExpenseLogQrySvc
    bsSvc: IBalanceSheetQrySvc
    isSvc: IIncomeStatementQrySvc
}

export const ServicesContext = createContext<Services>()

export const useServices = (): Services => {
    const ctx = useContext(ServicesContext)
    if (!ctx) {
        throw new Error('useServices must be called within a ServicesContext.Provider')
    }
    return ctx
}
