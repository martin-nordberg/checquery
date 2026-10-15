import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "solid-app",
		identifier: "solidapp.electrobun.dev",
		version: "0.0.1",
	},
	build: {
		bun: {
			entrypoint: "packages/server/src/index.ts",
		},
		copy: {
			"packages/client/dist/index.html": "views/mainview/index.html",
			"packages/client/dist/assets": "views/mainview/assets",
		},
		watchIgnore: ["packages/client/dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
