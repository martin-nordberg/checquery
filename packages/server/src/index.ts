import { ConfigError, loadConfig, type Config } from "./config";
import { createApp } from "./app";
import { closeWithBackup } from "./fileLifecycle";
import { closeIfIdle } from "./idleClose";

let config: Config;
try {
	config = loadConfig(process.env);
} catch (err) {
	console.error(err instanceof ConfigError ? err.message : err);
	process.exit(1);
}

const { app, state } = createApp(config);

const server = Bun.serve({
	hostname: config.host,
	port: config.port,
	// Room for the largest allowed upload plus multipart overhead; bodyLimit gives the friendly 413.
	maxRequestBodySize: config.maxUploadBytes + 1024 * 1024,
	fetch: app.fetch,
});

console.log(
	`Checquery listening on http://${server.hostname}:${server.port} ` +
		`(data dir ${config.dataDir}, encryption ${config.encryptionMode}, ` +
		`idle close ${config.idleCloseMinutes ? `${config.idleCloseMinutes} min` : "off"})`,
);

setInterval(() => void closeIfIdle(state), 60_000);

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		if (shuttingDown) return;
		shuttingDown = true;
		// Waits for any in-flight mutation, then closes + backs up the open file (D12).
		void state.mutex
			.run(() => closeWithBackup(state, `server shutdown (${signal})`))
			.finally(() => {
				void server.stop();
				process.exit(0);
			});
	});
}
