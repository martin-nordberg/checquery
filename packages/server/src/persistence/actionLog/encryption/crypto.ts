import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/** Parameters for the scrypt key-derivation function, stored per-file so future builds can strengthen the
 * default for new files without breaking existing ones. */
export type KdfParams = {
    N: number
    r: number
    p: number
    keylen: number
}

export const defaultKdfParams: KdfParams = { N: 32768, r: 8, p: 1, keylen: 32 }

const authTagLength = 16
const ivLength = 12

/** Derives a symmetric key from a password and a base64-encoded salt. */
export function deriveKey(password: string, saltB64: string, params: KdfParams): Buffer {
    const salt = Buffer.from(saltB64, 'base64')
    // scrypt's memory usage is ~128 * N * r bytes; give it headroom above Node's 32 MiB default,
    // since defaultKdfParams already sits right at that boundary.
    const maxmem = Math.max(128 * params.N * params.r * 2, 64 * 1024 * 1024)
    return scryptSync(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p, maxmem })
}

/** Encrypts a plaintext string with AES-256-GCM under a fresh random IV, returning both base64-encoded. */
export function encryptPayload(key: Buffer, plaintext: string): { iv: string; encryptedPayload: string } {
    const ivBuf = randomBytes(ivLength)
    const cipher = createCipheriv('aes-256-gcm', key, ivBuf)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()])
    return { iv: ivBuf.toString('base64'), encryptedPayload: ciphertext.toString('base64') }
}

/** Decrypts a payload produced by encryptPayload. Throws if the key is wrong or the payload was tampered with. */
export function decryptPayload(key: Buffer, ivB64: string, encryptedPayloadB64: string): string {
    const ivBuf = Buffer.from(ivB64, 'base64')
    const combined = Buffer.from(encryptedPayloadB64, 'base64')
    const authTag = combined.subarray(combined.length - authTagLength)
    const ciphertext = combined.subarray(0, combined.length - authTagLength)
    const decipher = createDecipheriv('aes-256-gcm', key, ivBuf)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Fixed known plaintext encrypted under a file's key so a later password attempt can be verified without
 * touching the (potentially large) actions table. */
const verifyPlaintext = 'checquery-verify'

export type FileCryptoMaterial = {
    kdfSalt: string
    kdfParams: KdfParams
    verifyIv: string
    verifyCiphertext: string
}

/** Generates the 3-character hex node ID used for this file's HLC values. Independent of whether the file is
 * encrypted -- every file needs one, regardless of password. */
export function generateNodeId(): string {
    return randomBytes(2).toString('hex').slice(0, 3).toUpperCase()
}

/** Generates fresh per-file crypto material for a new password, returning both the material to persist in
 * _checquery_meta and the derived key to use immediately. */
export function generateFileCryptoMaterial(password: string): { material: FileCryptoMaterial; key: Buffer } {
    const kdfSalt = randomBytes(16).toString('base64')
    const kdfParams = defaultKdfParams
    const key = deriveKey(password, kdfSalt, kdfParams)
    const { iv, encryptedPayload } = encryptPayload(key, verifyPlaintext)
    return {
        material: { kdfSalt, kdfParams, verifyIv: iv, verifyCiphertext: encryptedPayload },
        key,
    }
}

/** Derives a candidate key from the given password and file material, returning it only if the password is
 * correct (verified by successfully decrypting the stored verify-ciphertext). Returns null, never throws, on
 * a wrong password. */
export function verifyPassword(
    password: string,
    material: Pick<FileCryptoMaterial, 'kdfSalt' | 'kdfParams' | 'verifyIv' | 'verifyCiphertext'>,
): Buffer | null {
    const key = deriveKey(password, material.kdfSalt, material.kdfParams)
    try {
        const plaintext = decryptPayload(key, material.verifyIv, material.verifyCiphertext)
        return plaintext === verifyPlaintext ? key : null
    } catch {
        return null
    }
}
