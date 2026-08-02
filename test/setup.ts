import { plugin } from "bun";
import { afterEach } from "bun:test";
import { transformSync } from "@babel/core";
import solidPreset from "babel-preset-solid";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@solidjs/testing-library";

GlobalRegistrator.register();

// electrobun/view's Electroview reaches for `window.__electrobun` unconditionally at construction time
// (it's injected by Electrobun's real preload script in the actual app). Stub it so importing any module
// that constructs an Electroview (mainview/rpc.ts, and anything that imports it) doesn't throw under
// happy-dom. window.__electrobun{WebviewId,RpcSocketPort} are left undefined, which Electroview already
// treats as "skip the native socket" -- no real IPC is attempted.
(globalThis.window as unknown as { __electrobun: object }).__electrobun = {};

// @solidjs/testing-library auto-registers this via a bare `afterEach` reference (relying on it being an
// ambient global), which is fragile to depend on -- register explicitly instead so every test file gets a
// clean DOM between tests regardless of how it imports things.
afterEach(cleanup);

/**
 * bun test's built-in JSX handling treats `jsxImportSource: "solid-js"` as an automatic React-17-style
 * runtime (importing jsx/jsxs/Fragment functions), but solid-js doesn't ship those -- Solid's JSX requires
 * a compile-time transform (babel-preset-solid) into direct DOM-construction calls, the same one
 * vite-plugin-solid applies during the real app build. Without this plugin, any .tsx importing solid-js
 * JSX fails or behaves incorrectly under `bun test`. This mirrors vite-plugin-solid's own babel config
 * (see node_modules/vite-plugin-solid/dist/esm/index.mjs) but leaves TypeScript syntax untouched --
 * bun's own transpiler strips that afterward via the returned "tsx" loader.
 */
plugin({
	name: "solid-jsx-for-bun-test",
	setup(build) {
		build.onLoad({ filter: /\.tsx$/ }, async (args) => {
			const source = await Bun.file(args.path).text();
			const result = transformSync(source, {
				filename: args.path,
				presets: [[solidPreset, { generate: "dom", hydratable: false }]],
				ast: false,
				sourceMaps: false,
				configFile: false,
				babelrc: false,
				parserOpts: { plugins: ["jsx", "typescript"] },
			});
			return { contents: result!.code!, loader: "tsx" };
		});
	},
});
