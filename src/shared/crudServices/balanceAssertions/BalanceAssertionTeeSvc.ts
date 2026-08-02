import {
    type BalanceAssertion,
    type BalanceAssertionCreationEvent,
    type BalanceAssertionDeletionEvent,
    type BalanceAssertionPatchEvent
} from "../../domain/balanceAssertions/BalanceAssertion";
import {type AsrtId} from "../../domain/balanceAssertions/AsrtId";
import type {IBalanceAssertionSvc} from "./IBalanceAssertionSvc";
import type {IBalanceAssertionQrySvc} from "./IBalanceAssertionQrySvc";
import type {IBalanceAssertionCmdSvc} from "./IBalanceAssertionCmdSvc";


export class BalanceAssertionTeeSvc implements IBalanceAssertionSvc {

    constructor(
        private qrySvc: IBalanceAssertionQrySvc,
        private cmdSvcs: IBalanceAssertionCmdSvc[]
    ) {
    }

    /** Creates a new balance assertion with given attributes. */
    async createBalanceAssertion(assertionCreation: BalanceAssertionCreationEvent): Promise<BalanceAssertionCreationEvent | null> {
        let result: BalanceAssertionCreationEvent | null = assertionCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createBalanceAssertion(result) : null
        }
        return result
    }

    /** Deletes a given balance assertion. */
    async deleteBalanceAssertion(assertionDeletion: BalanceAssertionDeletionEvent): Promise<BalanceAssertionDeletionEvent | null> {
        let result: BalanceAssertionDeletionEvent | null = assertionDeletion
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.deleteBalanceAssertion(result) : null
        }
        return result
    }

    /** Finds the balance assertion with given unique ID */
    async findBalanceAssertionById(assertionId: AsrtId): Promise<BalanceAssertion | null> {
        return this.qrySvc.findBalanceAssertionById(assertionId)
    }

    /** Finds the entire list of balance assertions */
    async findBalanceAssertionsAll(): Promise<BalanceAssertion[]> {
        return this.qrySvc.findBalanceAssertionsAll()
    }

    /** Counts non-deleted balance assertions. */
    async countBalanceAssertionsAll(): Promise<number> {
        return this.qrySvc.countBalanceAssertionsAll()
    }

    /** Updates a balance assertion's attributes. */
    async patchBalanceAssertion(assertionPatch: BalanceAssertionPatchEvent): Promise<BalanceAssertionPatchEvent | null> {
        let result: BalanceAssertionPatchEvent | null = assertionPatch
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.patchBalanceAssertion(result) : null
        }
        return result
    }

}
