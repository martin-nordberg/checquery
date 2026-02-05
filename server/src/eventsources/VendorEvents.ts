import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import {vendorCreationSchema, vendorUpdateSchema} from "$shared/domain/vendors/Vendor";

/** The file containing vendor directives. TODO: make configurable */
const vendorsFile = "C:\\Data\\Documents\\checquery\\data\\vendors.yaml"

/**
 * Loads vendor entities from their YAML history.
 * @param vendorSvc the service to be called with vendor events
 */
export const loadVendors = async (vendorSvc: IVendorSvc) => {
    // Read the file content as a string.
    const vendorsYaml = await Bun.file(vendorsFile).text()

    // Parse the YAML string into a JavaScript object.
    const directives = Bun.YAML.parse(vendorsYaml) as any[]

    // Handle each directive in order.
    for (const directive of directives) {
        switch (directive.action) {
            case 'create':
                await vendorSvc.createVendor(vendorCreationSchema.parse(directive.payload))
                break
            case 'update':
                await vendorSvc.updateVendor(vendorUpdateSchema.parse(directive.payload))
                break
        }
    }
}

