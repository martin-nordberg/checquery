import {
    type Organization, type OrganizationCreation,
    organizationSchema, type OrganizationUpdate,
} from "$shared/domain/organizations/Organization";
import {type IOrganizationSvc} from "$shared/services/organizations/IOrganizationSvc";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import {type OrgId} from "$shared/domain/organizations/OrgId";


export class OrganizationSqlService implements IOrganizationSvc {

    readonly db = new ChecquerySqlDb()

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async createOrganization(organization: OrganizationCreation): Promise<void> {
        this.db.run(
            'organization.create',
            () =>
                `INSERT INTO Organization (id, name, description)
                 VALUES ($id, $name, $description);`,
            {
                $id: organization.id,
                $name: organization.name,
                $description: organization.description ?? null,
            }
        )
    }

    async deleteOrganization(organizationId:OrgId): Promise<void> {
        this.db.run(
            'organization.delete',
            () =>
                `DELETE
                 FROM Organization
                 WHERE id = $id`,
            {$id: organizationId}
        )
    }

    async findOrganizationById(organizationId: OrgId): Promise<Organization | null> {
        return this.db.findOne(
            'organization.findById',
            () =>
                `SELECT *
                 FROM Organization
                 WHERE id = $id`,
            {$id: organizationId},
            organizationSchema
        )
    }

    async findOrganizationsAll(): Promise<Organization[]> {
        return this.db.findMany(
            'organization.findOrganizationsAll',
            () =>
                `SELECT *
                 FROM Organization
                 ORDER BY name`,
            {},
            organizationSchema
        )
    }

    async updateOrganization(organizationPatch: OrganizationUpdate): Promise<Organization|null> {

        let queryKey = 'organization.update'
        let sql = `UPDATE Organization`
        let bindings: any = {$id: organizationPatch.id}

        if (organizationPatch.name) {
            queryKey += '.name'
            sql += ` SET name = $name`
            bindings.$name = organizationPatch.name
        }
        if (organizationPatch.description) {
            queryKey += '.description'
            sql += ` SET description = $description`
            bindings.$description = organizationPatch.description
        } else if (organizationPatch.description == "") {
            queryKey += '.description-null'
            sql += ` SET description = NULL`
        }
        sql += ` WHERE id = $id`

        const changes = this.db.run(queryKey, () => sql, bindings)

        if (changes.changes == 0) {
            return null
        }

        return this.findOrganizationById(organizationPatch.id)
    }

}