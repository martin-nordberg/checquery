import type { IAccountCategoryCmdSvc } from "../../../../shared/crudServices/accountCategories/IAccountCategoryCmdSvc";
import type {
    AccountCategoryCreationEvent,
    AccountCategoryDeletionEvent,
    AccountCategoryPatchEvent
} from "../../../../shared/domain/accountCategories/AccountCategory";
import type { ActionLog } from "../ActionLog";

export class AccountCategoryActionLogCmdSvc implements IAccountCategoryCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createAccountCategory(category: AccountCategoryCreationEvent): Promise<AccountCategoryCreationEvent | null> {
        return this.log.appendAction('create-account-category', category)
    }

    patchAccountCategory(categoryPatch: AccountCategoryPatchEvent): Promise<AccountCategoryPatchEvent | null> {
        return this.log.appendAction('update-account-category', categoryPatch)
    }

    deleteAccountCategory(categoryDeletion: AccountCategoryDeletionEvent): Promise<AccountCategoryDeletionEvent | null> {
        return this.log.appendAction('delete-account-category', categoryDeletion)
    }
}
