import {type BalanceAssertion} from "../../domain/balanceAssertions/BalanceAssertion";
import {type AsrtId} from "../../domain/balanceAssertions/AsrtId";


export interface IBalanceAssertionQrySvc {

    /** Finds the balance assertion with given unique ID */
    findBalanceAssertionById(assertionId: AsrtId): Promise<BalanceAssertion | null>

    /** Finds the entire list of balance assertions */
    findBalanceAssertionsAll(): Promise<BalanceAssertion[]>

}
