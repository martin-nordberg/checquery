import {type Origin} from "../../domain/origins/Origin";
import {type OrigId} from "../../domain/origins/OrigId";


export interface IOriginQrySvc {

    /** Finds the origin with given unique ID */
    findOriginById(originId: OrigId): Promise<Origin | null>

    /** Finds the entire list of origins */
    findOriginsAll(): Promise<Origin[]>

}
