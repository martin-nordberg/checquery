import {type AcctTypeStr, acctTypeText} from "$shared/domain/accounts/AcctType";
import type {ChecquerySqlDb} from "./ChecquerySqlDb";
import {type TxnStatusStr, txnStatusText} from "$shared/domain/transactions/TxnStatus";


export function runChecqueryDdl(db: ChecquerySqlDb) {

    // Account Type
    db.exec(
        `CREATE TABLE AcctType
         (
             code TEXT(10) NOT NULL,
             text TEXT(100),
             CONSTRAINT AcctType_PK PRIMARY KEY (code)
         );`,
        {}
    )

    // Account Type - Reference Data
    const acctTypes: AcctTypeStr[] = ['ASSET', 'LIABILITY', 'EQUITY', 'EXPENSE', 'INCOME']
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
             acctType   TEXT(10) NOT NULL REFERENCES AcctType(code),
             acctNumber TEXT(50) UNIQUE,
             name       TEXT(200) UNIQUE NOT NULL,
             description TEXT(200),
             CONSTRAINT Account_PK PRIMARY KEY (id)
         );`,
        {}
    )

    // Vendor
    db.exec(
        `CREATE TABLE Vendor
         (
             id             TEXT(27) NOT NULL,
             name           TEXT(200) UNIQUE NOT NULL,
             description    TEXT(200),
             defaultAccount TEXT(200),
             isActive       INTEGER NOT NULL DEFAULT 1,
             CONSTRAINT Vendor_PK PRIMARY KEY (id)
         );`,
        {}
    )

    // Transaction Status
    db.exec(
        `CREATE TABLE TxnStatus
         (
             code TEXT(10) NOT NULL,
             text TEXT(1),
             CONSTRAINT TxnStatus_PK PRIMARY KEY (code)
         );`,
        {}
    )

    // Transaction Status - Reference Data
    const txnStatuses: TxnStatusStr[] = ['UNMARKED', 'FORECAST', 'RECONCILED']
    txnStatuses.forEach(code =>
        db.exec(
            `INSERT INTO TxnStatus (code, text)
             VALUES ($code, $text)
             ON CONFLICT(code)
             DO UPDATE SET
                text = excluded.text;`,
            {
                $code: code,
                $text: txnStatusText(code)
            }
        )
    )

    // Statement
    db.exec(
        `CREATE TABLE Statement
         (
             id                TEXT(28) NOT NULL,
             beginDate         TEXT(10) NOT NULL,
             endDate           TEXT(10) NOT NULL,
             beginBalanceCents INTEGER NOT NULL,
             endBalanceCents   INTEGER NOT NULL,
             accountId         TEXT(200) NOT NULL REFERENCES Account(id),
             isReconciled      INTEGER NOT NULL DEFAULT 0,
             CONSTRAINT Statement_PK PRIMARY KEY (id),
             UNIQUE (endDate, accountId)
         );`,
        {}
    )

    // Transaction
    db.exec(
        `CREATE TABLE Transaxtion
         (
             id             TEXT(27) NOT NULL,
             date           TEXT(10) NOT NULL,
             code           TEXT(100),
             vendorId       TEXT(27) REFERENCES Vendor(id),
             stmtId         TEXT(28) REFERENCES Statement(id) ON DELETE SET NULL,
             description    TEXT(200),
             comment        TEXT(200),
             CONSTRAINT Transaxtion_PK PRIMARY KEY (id)
         );`,
        {}
    )

    // Entry
    db.exec(
        `CREATE TABLE Entry
         (
             txnId        TEXT(27) NOT NULL REFERENCES Transaxtion(id),
             entrySeq     INTEGER NOT NULL,
             accountId    TEXT(200) NOT NULL REFERENCES Account(id),
             status       TEXT(10) NOT NULL REFERENCES TxnStatus(code),
             debitCents   INTEGER NOT NULL,
             creditCents  INTEGER NOT NULL,
             comment      TEXT(200),
             CONSTRAINT Post_PK PRIMARY KEY (txnId, entrySeq),
             UNIQUE (txnId, entrySeq),
             UNIQUE (txnId, accountId)
         );`,
        {}
    )

}

