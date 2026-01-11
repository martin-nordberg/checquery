import {Hono} from 'hono'
import {
    type AccountCreation,
    accountCreationSchema,
    type AccountUpdate,
    accountUpdateSchema
} from "../../domain/accounts/Account";
import {zxValidator} from "../validation/zxvalidator";
import {z} from "zod";
import {type IAccountSvc} from "../../services/accounts/IAccountSvc";
import {acctIdSchema} from "../../domain/accounts/AcctId";

/** REST routes for accounts. */
export const accountRoutes = (accountService: IAccountSvc) => {
    return new Hono()
        .get(
            '/',
            async (c) => {
                return c.json(await accountService.findAccountsAll())
            }
        )
        .post(
            '/',
            zxValidator('json', accountCreationSchema),
            async (c) => {
                const account: AccountCreation = c.req.valid('json')
                await accountService.createAccount(account)
                return c.body(null, 201)
            }
        )
        .get(
            '/:id',
            zxValidator('param', z.object({id: acctIdSchema})),
            async (c) => {
                const {id} = c.req.valid('param')
                return c.json(await accountService.findAccountById(id))
            }
        )
        .delete(
            '/:id',
            zxValidator('param', z.object({id: acctIdSchema})),
            async (c) => {
                const {id} = c.req.valid('param')
                await accountService.deleteAccount(id)
                return c.body(null, 204)
            }
        )
        .patch(
            '/:id',
            zxValidator('param', z.object({id: acctIdSchema})),
            zxValidator('json', accountUpdateSchema),
            async (c) => {
                // const {id} = c.req.valid('param')
                const account: AccountUpdate = c.req.valid('json')
                return c.json(await accountService.updateAccount(account))
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const acctRoutes = (acctApp: ReturnType<typeof accountRoutes>) => new Hono().route('/accounts', acctApp)

export type AccountRoutes = ReturnType<typeof acctRoutes>


