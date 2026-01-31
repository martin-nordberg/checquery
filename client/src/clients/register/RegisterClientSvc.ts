import {hc} from 'hono/client'
import type {IRegisterSvc} from "$shared/services/register/IRegisterSvc.ts";
import type {Register} from "$shared/domain/register/Register.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
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

}

export const registerClientSvc = new RegisterClientSvc()
