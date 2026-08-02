/**
 * The one pluggable link in ActionLog's storage chain: how an action's plaintext JSON payload becomes what
 * actually sits in the actions table's iv/encrypted_payload columns, and back. ActionLog itself never encrypts
 * or decrypts anything directly -- it just calls encode/decode on whatever codec it was constructed with, so
 * swapping AesGcmCodec for PlaintextCodec (or vice versa) is the entire difference between an encrypted and an
 * unencrypted .checquery file.
 */
export interface PayloadCodec {
    encode(plaintext: string): { iv: string; payload: string }
    decode(iv: string, payload: string): string
}
