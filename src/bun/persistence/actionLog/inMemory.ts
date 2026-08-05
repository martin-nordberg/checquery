import { Database } from "bun:sqlite";
import { randomBytes } from "node:crypto";
import { ActionLog } from "./ActionLog";
import { AesGcmCodec } from "./encryption/AesGcmCodec";
import type { PayloadCodec } from "./encryption/PayloadCodec";

/**
 * Builds a working ActionLog with no file or password involved -- just a :memory: database and, by default, a
 * random-keyed AesGcmCodec standing in for what db.ts would otherwise derive from a password. Pass a
 * PlaintextCodec to test the unencrypted path instead; ActionLog treats both identically.
 */
export function createInMemoryActionLog(opts?: { codec?: PayloadCodec; nodeId?: string }): ActionLog {
    const db = new Database(':memory:')
    const codec = opts?.codec ?? new AesGcmCodec(randomBytes(32))
    const nodeId = opts?.nodeId ?? randomBytes(2).toString('hex').slice(0, 3).toUpperCase()
    return new ActionLog(db, codec, nodeId)
}
