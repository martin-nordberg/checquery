import type { Database } from "bun:sqlite";
import type { IOriginSvc } from "../../../shared/crudServices/origins/IOriginSvc";
import type { Origin, OriginCreationEvent } from "../../../shared/domain/origins/Origin";
import type { OrigId } from "../../../shared/domain/origins/OrigId";
import type { NameStr } from "../../../shared/domain/core/Name";
import type { IpAddress } from "../../../shared/domain/core/IpAddress";

type OriginRow = {
    id: string
    name: string
    ip_address: string
}

function rowToOrigin(row: OriginRow): Origin {
    return {
        id: row.id as OrigId,
        name: row.name as NameStr,
        ipAddress: row.ip_address as IpAddress,
    } as Origin
}

/** The materialized-store half of the Origin entity -- see documentation/materialized-store.md. Origins are
 * immutable (no patch/delete action exists), so this is the simplest of the five: create and find only. */
export class OriginMaterializedStoreSvc implements IOriginSvc {
    constructor(private readonly db: Database) {
    }

    async createOrigin(originCreation: OriginCreationEvent): Promise<OriginCreationEvent | null> {
        this.db.run(`INSERT INTO origins (id, name, ip_address) VALUES (?, ?, ?)`, [
            originCreation.id,
            originCreation.name,
            originCreation.ipAddress,
        ])
        return originCreation
    }

    async findOriginById(originId: OrigId): Promise<Origin | null> {
        const row = this.db.query(`SELECT * FROM origins WHERE id = ?`).get(originId) as OriginRow | null
        return row ? rowToOrigin(row) : null
    }

    async findOriginsAll(): Promise<Origin[]> {
        const rows = this.db.query(`SELECT * FROM origins ORDER BY name`).all() as OriginRow[]
        return rows.map(rowToOrigin)
    }
}
