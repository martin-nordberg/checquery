import {type AcctTypeStr, acctTypeText} from "$shared/domain/core/AcctType";
import type {ChecquerySqlDb} from "../ChecquerySqlDb";


export function migration001(db: ChecquerySqlDb) {

    // Account Type
    db.exec(
        `CREATE TABLE AcctType
         (
             code TEXT(30) NOT NULL,
             text TEXT(100),
             CONSTRAINT AcctType_PK PRIMARY KEY (code)
         );`,
        {}
    )

    // Account Type reference data (as of migration #1)
    const acctTypes: AcctTypeStr[] = ['CHECKING', 'SAVINGS', 'RETIREMENT']
    acctTypes.forEach(code =>
        db.exec(
            `INSERT INTO AcctType (code, text)
             VALUES ($code, $text)
             ON CONFLICT(code)
             DO UPDATE SET
                text = excluded.text;`,
            {
                $code: code,
                $text: acctTypeText(code)
            }
        )
    )

    // Account
    db.exec(
        `CREATE TABLE Account
         (
             id         TEXT(28) NOT NULL,
             name       TEXT(100) UNIQUE NOT NULL,
             acctNumber TEXT(50) UNIQUE NOT NULL,
             acctType   TEXT(30) NOT NULL REFERENCES AcctType(code),
             summary    TEXT(200),
             CONSTRAINT Account_PK PRIMARY KEY (id)
         );`,
        {}
    )

}

