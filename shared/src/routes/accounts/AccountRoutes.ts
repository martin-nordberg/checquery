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
                try {
                    await accountService.createAccount(account)
                    return c.body(null, 201)
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message.toUpperCase() : ''
                    if (msg.includes('UNIQUE') || msg.includes('DUPLICATE')) {
                        return c.json({error: `Cannot create account: the name "${account.name}" is already in use.`}, 409)
                    }
                    throw e
                }
            }
        )
        .get(
            '/:accountId',
            zxValidator('param', z.object({accountId: acctIdSchema})),
            async (c) => {
                const {accountId} = c.req.valid('param')
                return c.json(await accountService.findAccountById(accountId))
            }
        )
        .get(
            '/:accountId/in-use',
            zxValidator('param', z.object({accountId: acctIdSchema})),
            async (c) => {
                const {accountId} = c.req.valid('param')
                return c.json({inUse: await accountService.isAccountInUse(accountId)})
            }
        )
        .delete(
            '/:accountId',
            zxValidator('param', z.object({accountId: acctIdSchema})),
            async (c) => {
                const {accountId} = c.req.valid('param')
                const inUse = await accountService.isAccountInUse(accountId)
                if (inUse) {
                    return c.json({error: 'Account is used in transactions and cannot be deleted'}, 409)
                }
                await accountService.deleteAccount(accountId)
                return c.body(null, 204)
            }
        )
        .patch(
            '/:accountId',
            zxValidator('param', z.object({accountId: acctIdSchema})),
            zxValidator('json', accountUpdateSchema),
            async (c) => {
                const {accountId} = c.req.valid('param')
                const account: AccountUpdate = c.req.valid('json')
                try {
                    return c.json(await accountService.updateAccount({...account, id: accountId}))
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message.toUpperCase() : ''
                    if (msg.includes('UNIQUE') || msg.includes('DUPLICATE')) {
                        return c.json({error: `Cannot rename account: the name "${account.name}" is already in use.`}, 409)
                    }
                    throw e
                }
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const acctRoutes = (acctApp: ReturnType<typeof accountRoutes>) => new Hono().route('/accounts', acctApp)

export type AccountRoutes = ReturnType<typeof acctRoutes>


