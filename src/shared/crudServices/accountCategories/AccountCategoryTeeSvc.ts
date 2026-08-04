import {
    type AccountCategory,
    type AccountCategoryCreationEvent,
    type AccountCategoryDeletionEvent,
    type AccountCategoryPatchEvent
} from "../../domain/accountCategories/AccountCategory";
import {type AcctCtgId} from "../../domain/accountCategories/AcctCtgId";
import type {IAccountCategorySvc} from "./IAccountCategorySvc";
import type {IAccountCategoryQrySvc} from "./IAccountCategoryQrySvc";
import type {IAccountCategoryCmdSvc} from "./IAccountCategoryCmdSvc";


export class AccountCategoryTeeSvc implements IAccountCategorySvc {

    constructor(
        private qrySvc: IAccountCategoryQrySvc,
        private cmdSvcs: IAccountCategoryCmdSvc[]
    ) {
    }

    /** Creates a new account category with given attributes. */
    async createAccountCategory(categoryCreation: AccountCategoryCreationEvent): Promise<AccountCategoryCreationEvent | null> {
        let result: AccountCategoryCreationEvent | null = categoryCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createAccountCategory(result) : null
        }
        return result
    }

    /** Deletes a given account category. */
    async deleteAccountCategory(categoryDeletion: AccountCategoryDeletionEvent): Promise<AccountCategoryDeletionEvent | null> {
        let result: AccountCategoryDeletionEvent | null = categoryDeletion
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.deleteAccountCategory(result) : null
        }
        return result
    }

    /** Finds the account category with given unique ID */
    async findAccountCategoryById(acctCtgId: AcctCtgId): Promise<AccountCategory | null> {
        return this.qrySvc.findAccountCategoryById(acctCtgId)
    }

    /** Finds the entire list of account categories */
    async findAccountCategoriesAll(): Promise<AccountCategory[]> {
        return this.qrySvc.findAccountCategoriesAll()
    }

    /** Counts non-deleted account categories. */
    async countAccountCategoriesAll(): Promise<number> {
        return this.qrySvc.countAccountCategoriesAll()
    }

    /** Checks if a category has any live child category or child account. */
    async isAccountCategoryInUse(acctCtgId: AcctCtgId): Promise<boolean> {
        return this.qrySvc.isAccountCategoryInUse(acctCtgId)
    }

    /** Updates an account category's attributes. */
    async patchAccountCategory(categoryPatch: AccountCategoryPatchEvent): Promise<AccountCategoryPatchEvent | null> {
        let result: AccountCategoryPatchEvent | null = categoryPatch
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.patchAccountCategory(result) : null
        }
        return result
    }

}
