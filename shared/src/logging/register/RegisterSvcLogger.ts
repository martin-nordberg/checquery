import type {IRegisterQrySvc} from "$shared/services/register/IRegisterQrySvc";
import type {Register, RegisterTransaction} from "$shared/domain/register/Register";
import type {AcctId} from "$shared/domain/accounts/AcctId";
import type {TxnId} from "$shared/domain/transactions/TxnId";


export class RegisterSvcLogger implements IRegisterQrySvc {

    async findRegister(accountId: AcctId): Promise<Register | null> {
        console.info('RegisterSvcLogger.findRegister', JSON.stringify(accountId, null, 2))
        return null
    }

    async findTransaction(txnId: TxnId): Promise<RegisterTransaction | null> {
        console.info('RegisterSvcLogger.findTransaction', JSON.stringify(txnId, null, 2))
        return null
    }

    async findLatestTransactionForVendorAndAccount(vendorName: string, accountId: AcctId): Promise<RegisterTransaction | null> {
        console.info('RegisterSvcLogger.findLatestTransactionForVendorAndAccount', JSON.stringify({vendorName, accountId}, null, 2))
        return null
    }

}
