import type { IBalanceAssertionCmdSvc } from "../../../shared/crudServices/balanceAssertions/IBalanceAssertionCmdSvc";
import type {
    BalanceAssertionCreationEvent,
    BalanceAssertionDeletionEvent,
    BalanceAssertionPatchEvent,
} from "../../../shared/domain/balanceAssertions/BalanceAssertion";
import type { ActionLog } from "../ActionLog";

export class BalanceAssertionActionLogCmdSvc implements IBalanceAssertionCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createBalanceAssertion(assertionCreation: BalanceAssertionCreationEvent): Promise<BalanceAssertionCreationEvent | null> {
        return this.log.appendAction('create-balance-assertion', assertionCreation)
    }

    patchBalanceAssertion(assertionPatch: BalanceAssertionPatchEvent): Promise<BalanceAssertionPatchEvent | null> {
        return this.log.appendAction('update-balance-assertion', assertionPatch)
    }

    deleteBalanceAssertion(assertionDeletion: BalanceAssertionDeletionEvent): Promise<BalanceAssertionDeletionEvent | null> {
        return this.log.appendAction('delete-balance-assertion', assertionDeletion)
    }
}
