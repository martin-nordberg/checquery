import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {accountCreationSchema} from "$shared/domain/accounts/Account";

/** The file containing account directives. TODO: make configurable */
const accountsFile = "C:\\Data\\Documents\\checquery\\data\\accounts.yaml"

/**
 * Loads account entities from their YAML history.
 * @param acctSvc the service to be called with account events
 */
export const loadAccounts = async (acctSvc: IAccountSvc)=> {
    // Read the file content as a string.
    const accountsYaml = await Bun.file(accountsFile).text()

    // Parse the YAML string into a JavaScript object.
    const directives = Bun.YAML.parse(accountsYaml) as any[]

    // Handle each directive in order.
    for (const directive of directives) {
        switch (directive.action) {
            case 'create':
                await acctSvc.createAccount(accountCreationSchema.parse(directive.payload))
                break
        }
    }
}

