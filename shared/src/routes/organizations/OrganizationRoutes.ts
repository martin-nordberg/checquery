import {Hono} from 'hono'
import {type IOrganizationSvc} from "../../services/organizations/IOrganizationSvc";

/** REST routes for organizations. */
export const organizationRoutes = (organizationSvc: IOrganizationSvc) => {
    return new Hono()
        .get(
            '/',
            async (c) => {
                return c.json(await organizationSvc.findOrganizationsAll())
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const orgRoutes = (orgApp: ReturnType<typeof organizationRoutes>) => new Hono().route('/organizations', orgApp)

export type OrganizationRoutes = ReturnType<typeof orgRoutes>
