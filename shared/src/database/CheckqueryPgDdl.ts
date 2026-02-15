import type {PgLiteDb} from "./PgLiteDb";
import {type AcctTypeStr, acctTypeText} from "../domain/accounts/AcctType";


export async function runChecqueryPgDdl(db: PgLiteDb) {

    // Account Type
    await db.execDdl(
        `CREATE TABLE AcctType
         (
             code VARCHAR(10) NOT NULL,
             text VARCHAR(100),
             CONSTRAINT AcctType_PK PRIMARY KEY (code)
         );`
    )

    // Account Type - Reference Data
    const acctTypes: AcctTypeStr[] = ['ASSET', 'LIABILITY', 'EQUITY', 'EXPENSE', 'INCOME']
    acctTypes.forEach(code =>
        db.exec(
            `INSERT INTO AcctType (code, text)
             VALUES ($1, $2) ON CONFLICT(code) DO
            UPDATE SET
                text = excluded.text;`,
            [
                code,
                acctTypeText(code)
            ]
        )
    )

    // Account
    await db.execDdl(
        `CREATE TABLE Account
         (
             id          CHAR(28)            NOT NULL,
             acctType    VARCHAR(10)         NOT NULL REFERENCES AcctType (code),
             acctNumber  VARCHAR(50) UNIQUE,
             name        VARCHAR(200) UNIQUE NOT NULL,
             description VARCHAR(200),
             CONSTRAINT Account_PK PRIMARY KEY (id)
         );`
    )

    // Vendor
    await db.execDdl(
        `CREATE TABLE Vendor
         (
             id             CHAR(28)            NOT NULL,
             name           VARCHAR(200) UNIQUE NOT NULL,
             description    VARCHAR(200),
             defaultAccount VARCHAR(200),
             isActive       INTEGER             NOT NULL DEFAULT 1,
             CONSTRAINT Vendor_PK PRIMARY KEY (id)
         );`
    )

    // Statement
    await db.execDdl(
        `CREATE TABLE Statement
         (
             id                CHAR(28)    NOT NULL,
             beginDate         VARCHAR(10) NOT NULL,
             endDate           VARCHAR(10) NOT NULL,
             beginBalanceCents INTEGER     NOT NULL,
             endBalanceCents   INTEGER     NOT NULL,
             accountId         CHAR(28)    NOT NULL REFERENCES Account (id),
             isReconciled      INTEGER     NOT NULL DEFAULT 0,
             CONSTRAINT Statement_PK PRIMARY KEY (id),
             UNIQUE (endDate, accountId)
         );`
    )

    // Transaction
    await db.execDdl(
        `CREATE TABLE Transaxtion
         (
             id          CHAR(28)    NOT NULL,
             date        VARCHAR(10) NOT NULL,
             code        VARCHAR(100),
             vendorId    CHAR(28) REFERENCES Vendor (id),
             stmtId      VARCHAR(28) REFERENCES Statement (id) ON DELETE SET NULL,
             description VARCHAR(200),
             comment     VARCHAR(200),
             CONSTRAINT Transaxtion_PK PRIMARY KEY (id)
         );`
    )

    // Entry
    await db.execDdl(
        `CREATE TABLE Entry
         (
             txnId       CHAR(28)     NOT NULL REFERENCES Transaxtion (id),
             entrySeq    INTEGER      NOT NULL,
             accountId   VARCHAR(200) NOT NULL REFERENCES Account (id),
             debitCents  INTEGER      NOT NULL,
             creditCents INTEGER      NOT NULL,
             comment     VARCHAR(200),
             CONSTRAINT Post_PK PRIMARY KEY (txnId, entrySeq),
             UNIQUE (txnId, entrySeq),
             UNIQUE (txnId, accountId)
         );`
    )

}

