import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import {
	newFileBodySchema,
	openFileBodySchema,
	unlockFileBodySchema,
	type ConfigPayload,
	type FileInfoPayload,
} from "@checquery/shared/api/fileApi";
import type { AppEnv } from "../honoEnv";
import { clientIp } from "../clientIp";
import { HttpError } from "../httpError";
import { requireLogin, requireUnlockedFile, withPasswordRateLimit } from "../middleware/auth";
import { zxValidator } from "../middleware/zxValidator";
import { closeWithBackup, currentFilePayload, listFiles, newFile, openFile, unlockFile } from "../fileLifecycle";
import { uploadFile } from "../fileUpload";
import { getCurrentFileInfo } from "../persistence/db";
import type { OriginIdentity } from "../persistence/db";
import type { ServerState } from "../serverState";
import type { Context } from "hono";

/** Who a session's writes are attributed to: the logged-in user, from this client address (D8/A1). */
function identityOf(state: ServerState, c: Context<AppEnv>): OriginIdentity {
	return { name: c.var.login.username, ipAddress: clientIp(c, state.config.trustProxy) };
}

/** `/api/config`: settings the client's dialogs need. */
export const configRoutes = (state: ServerState) =>
	new Hono<AppEnv>().get("/", requireLogin(state), (c) => {
		const config: ConfigPayload = {
			encryptionMode: state.config.encryptionMode,
			maxUploadBytes: state.config.maxUploadBytes,
		};
		return c.json(config, 200);
	});

/** `/api/files`: the data directory's files -- list, and upload (D4.1). */
export const filesRoutes = (state: ServerState) =>
	new Hono<AppEnv>()
		.use("*", requireLogin(state))
		.get("/", (c) => c.json(listFiles(state), 200))
		.post(
			"/",
			bodyLimit({
				// Some multipart overhead on top of the file itself.
				maxSize: state.config.maxUploadBytes + 64 * 1024,
				onError: () => {
					throw new HttpError(413, "too-large", "That file is too large to upload.");
				},
			}),
			zxValidator("form", z.object({ file: z.instanceof(File, { message: "Choose a file to upload." }) })),
			async (c) => c.json(await uploadFile(state, c.req.valid("form").file), 201),
		);

/** `/api/file`: the one open file -- current/new/open/unlock/info/close. */
export const fileRoutes = (state: ServerState) =>
	new Hono<AppEnv>()
		.use("*", requireLogin(state))
		.get("/", (c) => c.json(currentFilePayload(c.var.login), 200))
		.post("/new", zxValidator("json", newFileBodySchema), async (c) => {
			const body = c.req.valid("json");
			const key = `file:${clientIp(c, state.config.trustProxy)}`;
			return c.json(await withPasswordRateLimit(state, key, () => newFile(state, c.var.login, body, identityOf(state, c))), 200);
		})
		.post("/open", zxValidator("json", openFileBodySchema), async (c) => {
			const body = c.req.valid("json");
			const key = `file:${clientIp(c, state.config.trustProxy)}`;
			return c.json(await withPasswordRateLimit(state, key, () => openFile(state, c.var.login, body, identityOf(state, c))), 200);
		})
		.post("/unlock", zxValidator("json", unlockFileBodySchema), async (c) => {
			const { password } = c.req.valid("json");
			const key = `file:${clientIp(c, state.config.trustProxy)}`;
			return c.json(
				await withPasswordRateLimit(state, key, () => unlockFile(state, c.var.login, password, identityOf(state, c))),
				200,
			);
		})
		.get("/info", requireUnlockedFile, async (c) => {
			const info: FileInfoPayload | null = await getCurrentFileInfo();
			return c.json(info!, 200);
		})
		.post("/close", requireUnlockedFile, (c) => c.json(closeWithBackup(state, `closed by ${c.var.login.username}`), 200));
