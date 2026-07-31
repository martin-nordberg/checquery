import {z} from "zod";
import type {Branded} from "../../util/Branded";

/** Schema for a Checquery name. */
export const nameMaxLength = 200;

export const nameRegex = /^[^\r\n]*$/

export type NameStr = Branded<string, 'NameStr'>

export const nameSchema =
    z.string()
        .trim()
        .min(1, "Name must not be empty.")
        .max(nameMaxLength, `Name can be at most ${nameMaxLength} characters.`)
        .regex(nameRegex, "Name must not cross multiple lines.")
        .transform((s): NameStr => s as NameStr)
