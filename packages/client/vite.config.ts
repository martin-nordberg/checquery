import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [solid(), tailwindcss()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
		// `bun run dev` runs the API server alongside; proxying keeps everything same-origin, so the session
		// cookie and csrf() checks behave exactly as in production.
		proxy: {
			"/api": `http://127.0.0.1:${process.env.CHECQUERY_PORT ?? 3000}`,
		},
	},
});
