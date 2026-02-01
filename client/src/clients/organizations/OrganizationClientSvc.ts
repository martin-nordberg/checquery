import {hc} from 'hono/client'
import type {Organization} from "$shared/domain/organizations/Organization.ts";
import type {OrganizationRoutes} from "$shared/routes/organizations/OrganizationRoutes.ts";
import {webAppHost} from "../config.ts";

const client = hc<OrganizationRoutes>(`${webAppHost}`)

export class OrganizationClientSvc {

    async findOrganizationsAll(): Promise<Organization[]> {
        console.log("findOrganizationsAll")
        const res = await client.organizations.$get()

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return []
    }

}

export const organizationClientSvc = new OrganizationClientSvc()
