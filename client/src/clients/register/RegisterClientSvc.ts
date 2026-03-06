import {hc} from 'hono/client'
import type {IRegisterSvc} from "$shared/services/register/IRegisterSvc.ts";
import type {Register, RegisterTransaction} from "$shared/domain/register/Register.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import type {RegisterRoutes} from "$shared/routes/register/RegisterRoutes.ts";
import {webAppHost} from "../config.ts";

const client = hc<RegisterRoutes>(`${webAppHost}`)

export class RegisterClientSvc implements IRegisterSvc {

    async findRegister(accountId: AcctId): Promise<Register | null> {
        console.log("findRegister", accountId)
        const res = await client.register[':accountId'].$get({param: {accountId}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

    async findTransaction(txnId: TxnId): Promise<RegisterTransaction | null> {
        console.log("findTransaction", txnId)
        const res = await client.register.transaction[':txnId'].$get({param: {txnId}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

}

