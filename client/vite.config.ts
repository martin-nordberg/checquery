import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "$shared": path.resolve(__dirname, "../shared/src"),
        },
    },
    plugins: [solidPlugin()],
    server: {
        port: 3000,
    },
    build: {
        target: 'esnext',
    },
});


