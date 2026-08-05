import {
    type AccountCategoryCreationEvent,
    type AccountCategoryDeletionEvent,
    type AccountCategoryPatchEvent
} from "../../domain/accountCategories/AccountCategory";


export interface IAccountCategoryCmdSvc {

    /** Creates a new account category with given attributes. */
    createAccountCategory(category: AccountCategoryCreationEvent): Promise<AccountCategoryCreationEvent | null>

    /** Deletes a given account category. */
    deleteAccountCategory(categoryDeletion: AccountCategoryDeletionEvent): Promise<AccountCategoryDeletionEvent | null>

    /** Updates an account category's attributes. */
    patchAccountCategory(categoryPatch: AccountCategoryPatchEvent): Promise<AccountCategoryPatchEvent | null>

}
