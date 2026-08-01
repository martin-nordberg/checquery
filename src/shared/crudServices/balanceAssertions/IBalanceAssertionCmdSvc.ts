import {
    type BalanceAssertionCreationEvent,
    type BalanceAssertionDeletionEvent,
    type BalanceAssertionPatchEvent
} from "../../domain/balanceAssertions/BalanceAssertion";


export interface IBalanceAssertionCmdSvc {

    /** Creates a new balance assertion with given attributes. */
    createBalanceAssertion(assertionCreation: BalanceAssertionCreationEvent): Promise<BalanceAssertionCreationEvent | null>

    /** Deletes a given balance assertion. */
    deleteBalanceAssertion(assertionDeletion: BalanceAssertionDeletionEvent): Promise<BalanceAssertionDeletionEvent | null>

    /** Updates a balance assertion's attributes. */
    patchBalanceAssertion(assertionPatch: BalanceAssertionPatchEvent): Promise<BalanceAssertionPatchEvent | null>

}
