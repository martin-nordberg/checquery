import {type Origin, type OriginCreationEvent} from "../../domain/origins/Origin";
import {type OrigId} from "../../domain/origins/OrigId";
import type {IOriginSvc} from "./IOriginSvc";
import type {IOriginQrySvc} from "./IOriginQrySvc";
import type {IOriginCmdSvc} from "./IOriginCmdSvc";


export class OriginTeeSvc implements IOriginSvc {

    constructor(
        private qrySvc: IOriginQrySvc,
        private cmdSvcs: IOriginCmdSvc[]
    ) {
    }

    /** Creates a new origin with given attributes. */
    async createOrigin(originCreation: OriginCreationEvent): Promise<OriginCreationEvent | null> {
        let result: OriginCreationEvent | null = originCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createOrigin(result) : null
        }
        return result
    }

    /** Finds the origin with given unique ID */
    async findOriginById(originId: OrigId): Promise<Origin | null> {
        return this.qrySvc.findOriginById(originId)
    }

    /** Finds the entire list of origins */
    async findOriginsAll(): Promise<Origin[]> {
        return this.qrySvc.findOriginsAll()
    }

    /** Counts origins. */
    async countOriginsAll(): Promise<number> {
        return this.qrySvc.countOriginsAll()
    }

}
