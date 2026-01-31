import {Hono} from 'hono'
import {zxValidator} from "../validation/zxvalidator";
import {z} from "zod";
import {type IRegisterSvc} from "../../services/register/IRegisterSvc";
import {acctIdSchema} from "../../domain/accounts/AcctId";

/** REST routes for registers. */
export const registerRoutes = (registerSvc: IRegisterSvc) => {
    return new Hono()
        .get(
            '/:accountId',
            zxValidator('param', z.object({accountId: acctIdSchema})),
            async (c) => {
                const {accountId} = c.req.valid('param')
                return c.json(await registerSvc.findRegister(accountId))
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const regRoutes = (regApp: ReturnType<typeof registerRoutes>) => new Hono().route('/register', regApp)

export type RegisterRoutes = ReturnType<typeof regRoutes>
