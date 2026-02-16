import type {PgLiteDb} from "./PgLiteDb";
import {type AcctTypeStr, acctTypeText} from "../domain/accounts/AcctType";


export async function runChecqueryPgDdl(db: PgLiteDb) {

    // Account Type
    await db.exec(
        `CREATE TABLE AcctType
         (
             code VARCHAR(10) PRIMARY KEY,
             text VARCHAR(100)
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
    await db.exec(
        `CREATE TABLE Account
         (
             id          CHAR(28) PRIMARY KEY,
             acctType    VARCHAR(10)         NOT NULL REFERENCES AcctType (code),
             acctNumber  VARCHAR(50) UNIQUE,
             name        VARCHAR(200) UNIQUE NOT NULL,
             description VARCHAR(200),
             isDeleted   BOOLEAN             NOT NULL DEFAULT FALSE
         );`
    )

    // Vendor
    await db.exec(
        `CREATE TABLE Vendor
         (
             id               CHAR(28) PRIMARY KEY,
             name             VARCHAR(200) UNIQUE NOT NULL,
             description      VARCHAR(200),
             defaultAccountId CHAR(28) REFERENCES Account (id),
             isActive         BOOLEAN             NOT NULL DEFAULT TRUE,
             isDeleted        BOOLEAN             NOT NULL DEFAULT FALSE
         );`
    )

    // Statement
    await db.exec(
        `CREATE TABLE Statement
         (
             id                CHAR(28) PRIMARY KEY,
             beginDate         VARCHAR(10) NOT NULL,
             endDate           VARCHAR(10) NOT NULL,
             beginBalanceCents INTEGER     NOT NULL,
             endBalanceCents   INTEGER     NOT NULL,
             accountId         CHAR(28)    NOT NULL REFERENCES Account (id),
             isReconciled      BOOLEAN     NOT NULL DEFAULT FALSE,
             isDeleted         BOOLEAN     NOT NULL DEFAULT FALSE,
             UNIQUE (endDate, accountId)
         );`
    )

    // Transaction
    await db.exec(
        `CREATE TABLE Transaxtion
         (
             id          CHAR(28) PRIMARY KEY,
             date        VARCHAR(10) NOT NULL,
             code        VARCHAR(100),
             vendorId    CHAR(28) REFERENCES Vendor (id),
             description VARCHAR(200),
             isDeleted   BOOLEAN     NOT NULL DEFAULT FALSE
         );`
    )

    // Entry
    await db.exec(
        `CREATE TABLE Entry
         (
             txnId       CHAR(28)     NOT NULL REFERENCES Transaxtion (id),
             entrySeq    INTEGER      NOT NULL,
             accountId   VARCHAR(200) NOT NULL REFERENCES Account (id),
             debitCents  INTEGER      NOT NULL,
             creditCents INTEGER      NOT NULL,
             comment     VARCHAR(200),
             stmtId      VARCHAR(28)  REFERENCES Statement (id) ON DELETE SET NULL,
             isDeleted   BOOLEAN      NOT NULL DEFAULT FALSE,
             CONSTRAINT Entry_PK PRIMARY KEY (txnId, entrySeq),
             UNIQUE (txnId, entrySeq),
             UNIQUE (txnId, accountId)
         );`
    )

}

