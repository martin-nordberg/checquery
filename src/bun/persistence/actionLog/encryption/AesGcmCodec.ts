import { decryptPayload, encryptPayload } from "./crypto";
import type { PayloadCodec } from "./PayloadCodec";

/** The encrypting codec: AES-256-GCM under a fixed key, fresh IV per row (see crypto.ts). */
export class AesGcmCodec implements PayloadCodec {
    constructor(private readonly key: Buffer) {
    }

    encode(plaintext: string): { iv: string; payload: string } {
        const { iv, encryptedPayload } = encryptPayload(this.key, plaintext)
        return { iv, payload: encryptedPayload }
    }

    decode(iv: string, payload: string): string {
        return decryptPayload(this.key, iv, payload)
    }
}
