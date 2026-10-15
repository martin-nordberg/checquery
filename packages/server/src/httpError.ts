import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiErrorCode } from "@checquery/shared/api/apiError";

/** An expected, user-facing failure with a specific status and ApiErrorCode; errorHandler.ts turns it into an
 * ApiErrorBody response as-is. Anything else thrown is treated as unexpected (500). */
export class HttpError extends Error {
	constructor(
		readonly status: ContentfulStatusCode,
		readonly code: ApiErrorCode,
		message: string,
		readonly headers?: Record<string, string>,
	) {
		super(message);
		this.name = "HttpError";
	}
}
