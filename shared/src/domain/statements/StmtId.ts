import {z} from "zod";
import {createId} from "@paralleldrive/cuid2";

/** Schema for a statement ID. */
export const stmtIdPrefix = 'stmt'
export const stmtIdSchema =
    z.cuid2({message: `Statement ID must be a string in CUID2 format with prefix '${stmtIdPrefix}'.`})
        .trim()
        .startsWith(stmtIdPrefix)
        .brand('Statement')
export type StmtId = z.infer<typeof stmtIdSchema>


/** Generates a new ID for a statement. */
export const genStmtId: () => StmtId =
    () => stmtIdSchema.parse(stmtIdPrefix + createId())
