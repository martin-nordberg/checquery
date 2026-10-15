import type { buildApiApp } from "./app";

/** The type of the server's /api routes, for the client's typed `hc<AppType>()` client. Type-only: the client
 * imports nothing from the server at runtime. */
export type AppType = ReturnType<typeof buildApiApp>;
