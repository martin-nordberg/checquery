import type {PgLiteTxn} from "./PgLiteTxn";
import {acctTypeCodes, acctTypeText} from "../domain/accounts/AcctType";
import {nameMaxLength} from "$shared/domain/core/Name";
import {descriptionMaxLength} from "$shared/domain/core/Description";
import {hlcLength} from "$shared/domain/core/HybridLogicalClock";
import {acctNumberMaxLength} from "$shared/domain/accounts/AcctNumber";
import {acctIdLength} from "$shared/domain/accounts/AcctId";
import {vndrIdLength} from "$shared/domain/vendors/VndrId";
import {stmtIdLength} from "$shared/domain/statements/StmtId";
import {isoDateLength} from "$shared/domain/core/IsoDate";
import {txnIdLength} from "$shared/domain/transactions/TxnId";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export async function runChecqueryPgDdl(db: PgLiteDb) {
    return db.transaction(async (txn) =>
        runChecqueryPgDdlTxn(txn)
    )
}

async function runChecqueryPgDdlTxn(txn: PgLiteTxn) {

        // Account Type
    await txn.exec(
        `CREATE TABLE AcctType
         (
             code VARCHAR(10) PRIMARY KEY,
             text VARCHAR(${nameMaxLength})
         );`
    )

    // Account Type - Reference Data
    acctTypeCodes.forEach(code =>
        txn.exec(
            `INSERT INTO AcctType (code, text)
             VALUES ($1, $2);`,
            [
                code,
                acctTypeText(code)
            ]
        )
    )

    // Account
    await txn.exec(
        `CREATE TABLE Account
         (
             id             CHAR(${acctIdLength}) PRIMARY KEY,
             acctType       VARCHAR(10)                      NOT NULL REFERENCES AcctType (code),
             acctTypeHlc    CHAR(${hlcLength})               NOT NULL,
             acctNumber     VARCHAR(${acctNumberMaxLength}) UNIQUE,
             acctNumberHlc  CHAR(${hlcLength})               NOT NULL,
             name           VARCHAR(${nameMaxLength}) UNIQUE NOT NULL,
             nameHlc        CHAR(${hlcLength})               NOT NULL,
             description    VARCHAR(${descriptionMaxLength}),
             descriptionHlc CHAR(${hlcLength})               NOT NULL,
             isDeleted      BOOLEAN                          NOT NULL DEFAULT FALSE,
             isDeletedHlc   CHAR(${hlcLength})               NOT NULL
         );`
    )

    // Vendor
    await txn.exec(
        `CREATE TABLE Vendor
         (
             id                  CHAR(${vndrIdLength}) PRIMARY KEY,
             name                VARCHAR(${nameMaxLength}) UNIQUE NOT NULL,
             nameHlc             CHAR(${hlcLength})               NOT NULL,
             description         VARCHAR(${descriptionMaxLength}),
             descriptionHlc      CHAR(${hlcLength})               NOT NULL,
             defaultAccountId    CHAR(${acctIdLength}) REFERENCES Account (id),
             defaultAccountIdHlc CHAR(${hlcLength})               NOT NULL,
             isActive            BOOLEAN                          NOT NULL DEFAULT TRUE,
             isActiveHlc         CHAR(${hlcLength})               NOT NULL,
             isDeleted           BOOLEAN                          NOT NULL DEFAULT FALSE,
             isDeletedHlc        CHAR(${hlcLength})               NOT NULL
         );`
    )

    // Statement
    await txn.exec(
        `CREATE TABLE Statement
         (
             id                   CHAR(${stmtIdLength}) PRIMARY KEY,
             beginDate            VARCHAR(${isoDateLength}) NOT NULL,
             beginDateHlc         CHAR(${hlcLength})        NOT NULL,
             endDate              VARCHAR(${isoDateLength}) NOT NULL,
             endDateHlc           CHAR(${hlcLength})        NOT NULL,
             beginBalanceCents    INTEGER                   NOT NULL,
             beginBalanceCentsHlc CHAR(${hlcLength})        NOT NULL,
             endbalanceCents      INTEGER                   NOT NULL,
             endbalanceCentsHlc   CHAR(${hlcLength})        NOT NULL,
             accountId            CHAR(${acctIdLength})     NOT NULL REFERENCES Account (id),
             isReconciled         BOOLEAN                   NOT NULL DEFAULT FALSE,
             isReconciledHlc      CHAR(${hlcLength})        NOT NULL,
             isDeleted            BOOLEAN                   NOT NULL DEFAULT FALSE,
             isDeletedHlc         CHAR(${hlcLength})        NOT NULL
         );`
    )

    // Statement - partial unique index excluding soft-deleted rows
    await txn.exec(
        `CREATE UNIQUE INDEX statement_enddate_accountid_key
         ON Statement (endDate, accountId)
         WHERE isDeleted = false;`
    )

    // Transaction
    await txn.exec(
        `CREATE TABLE Transaxtion
         (
             id             CHAR(${txnIdLength}) PRIMARY KEY,
             date           VARCHAR(${isoDateLength}) NOT NULL,
             dateHlc        CHAR(${hlcLength})        NOT NULL,
             code           VARCHAR(50),
             codeHlc        CHAR(${hlcLength})        NOT NULL,
             vendorId       CHAR(${vndrIdLength}) REFERENCES Vendor (id),
             vendorIdHlc    CHAR(${hlcLength})        NOT NULL,
             description    VARCHAR(${descriptionMaxLength}),
             descriptionHlc CHAR(${hlcLength})        NOT NULL,
             insertOrder    SERIAL,
             isDeleted      BOOLEAN                   NOT NULL DEFAULT FALSE,
             isDeletedHlc   CHAR(${hlcLength})        NOT NULL
         );`
    )

    // Entry
    await txn.exec(
        `CREATE TABLE Entry
         (
             txnId       CHAR(${txnIdLength})     NOT NULL REFERENCES Transaxtion (id),
             entrySeq    INTEGER                  NOT NULL,
             accountId   CHAR(${acctIdLength})    NOT NULL REFERENCES Account (id),
             debitCents  INTEGER                  NOT NULL,
             creditCents INTEGER                  NOT NULL,
             comment     VARCHAR(${descriptionMaxLength}),
             stmtId      VARCHAR(${stmtIdLength}) REFERENCES Statement (id) ON DELETE SET NULL,
             isDeleted   BOOLEAN                  NOT NULL DEFAULT FALSE,
             CONSTRAINT Entry_PK PRIMARY KEY (txnId, entrySeq),
             UNIQUE (txnId, entrySeq),
             UNIQUE (txnId, accountId)
         );`
    )

}

