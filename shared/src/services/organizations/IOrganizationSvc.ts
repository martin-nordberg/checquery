import {type Organization, type OrganizationCreation, type OrganizationUpdate} from "../../domain/organizations/Organization";
import {type OrgId} from "../../domain/organizations/OrgId";


export interface IOrganizationSvc {

    /** Creates a new organization with given attributes. */
    createOrganization(organization: OrganizationCreation): Promise<void>

    /** Deletes a given organization. */
    deleteOrganization(organizationId: OrgId): Promise<void>

    /** Finds the organization with given unique ID */
    findOrganizationById(organizationId: OrgId): Promise<Organization | null>

    /** Finds the entire list of organizations */
    findOrganizationsAll(): Promise<Organization[]>

    /** Updates an organization's attributes. */
    updateOrganization(organizationPatch: OrganizationUpdate): Promise<Organization | null>

}
