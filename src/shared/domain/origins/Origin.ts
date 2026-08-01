import {z} from "zod";
import {nameSchema} from "../core/Name";
import {ipAddressSchema} from "../core/IpAddress";
import {origIdSchema} from "./OrigId";
import {hlcSchema} from "../core/HybridLogicalClock";

/**
 * Base schema for a Checquery origin's details. An origin records who (a person's name) and where (an IP
 * address) a mutation came from. Origins are immutable once created -- there is no patch or deletion event,
 * since amending or removing the record of who made a change would defeat its purpose as an audit trail.
 */
const originAttributesSchema =
    z.strictObject({
        /** The unique ID of the origin. */
        id: origIdSchema,

        /** The name of the person the origin represents. */
        name: nameSchema,

        /** The IP address the origin represents. */
        ipAddress: ipAddressSchema,
    })


/** Schema for an origin. */
export const originReadSchema =
    originAttributesSchema.readonly()

export type Origin = z.infer<typeof originReadSchema>


/** Schema for origin creation. */
export const originCreationEventSchema =
    originAttributesSchema.extend({
        hlc: hlcSchema.optional(),
    }).readonly()

export type OriginCreationEvent = z.infer<typeof originCreationEventSchema>
