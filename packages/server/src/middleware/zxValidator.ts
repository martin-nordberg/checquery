import { z } from "zod";
import type { ValidationTargets } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HttpError } from "../httpError";

/** zValidator that turns any request-shape failure into a 400 `invalid-request` ApiErrorBody (via
 * errorHandler.ts), with Zod's readable summary as the message. */
export const zxValidator = <T extends z.ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
	zValidator(target, schema, (result) => {
		if (!result.success) {
			throw new HttpError(400, "invalid-request", z.prettifyError(result.error));
		}
	});
