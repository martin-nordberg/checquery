import type { PayloadCodec } from "./PayloadCodec";

/** The no-encryption codec: stores the JSON payload as-is. `iv` is meaningless here and always empty --
 * present only because every codec must fill the same two columns. */
export class PlaintextCodec implements PayloadCodec {
    encode(plaintext: string): { iv: string; payload: string } {
        return { iv: '', payload: plaintext }
    }

    decode(_iv: string, payload: string): string {
        return payload
    }
}
