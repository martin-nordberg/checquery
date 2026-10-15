import type { IOriginCmdSvc } from "@checquery/shared/crudServices/origins/IOriginCmdSvc";
import type { OriginCreationEvent } from "@checquery/shared/domain/origins/Origin";
import type { ActionLog } from "../ActionLog";

export class OriginActionLogCmdSvc implements IOriginCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createOrigin(originCreation: OriginCreationEvent): Promise<OriginCreationEvent | null> {
        return this.log.appendAction('create-origin', originCreation)
    }
}
