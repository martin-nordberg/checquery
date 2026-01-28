import type {IOrganizationSvc} from "$shared/services/organizations/IOrganizationSvc";
import {organizationCreationSchema} from "$shared/domain/organizations/Organization";

/** The file containing organization directives. TODO: make configurable */
const organizationsFile = "C:\\Data\\Documents\\checquery\\data\\organizations.yaml"

/**
 * Loads organization entities from their YAML history.
 * @param orgSvc the service to be called with organization events
 */
export const loadOrganizations = async (orgSvc: IOrganizationSvc)=> {
    // Read the file content as a string.
    const organizationsYaml = await Bun.file(organizationsFile).text()

    // Parse the YAML string into a JavaScript object.
    const directives = Bun.YAML.parse(organizationsYaml) as any[]

    // Handle each directive in order.
    for (const directive of directives) {
        switch (directive.action) {
            case 'create':
                await orgSvc.createOrganization(organizationCreationSchema.parse(directive.payload))
                break
        }
    }
}

