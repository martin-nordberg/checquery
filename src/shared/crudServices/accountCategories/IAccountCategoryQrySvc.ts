import {type AccountCategory} from "../../domain/accountCategories/AccountCategory";
import {type AcctCtgId} from "../../domain/accountCategories/AcctCtgId";


export interface IAccountCategoryQrySvc {

    /** Finds the account category with given unique ID */
    findAccountCategoryById(acctCtgId: AcctCtgId): Promise<AccountCategory | null>

    /** Finds the entire list of account categories */
    findAccountCategoriesAll(): Promise<AccountCategory[]>

    /** Counts non-deleted account categories. */
    countAccountCategoriesAll(): Promise<number>

    /** Checks if a category has any live child category or child account -- can't be deleted if so. */
    isAccountCategoryInUse(acctCtgId: AcctCtgId): Promise<boolean>

}
