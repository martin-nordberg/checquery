import { $ } from 'bun'
import { join } from 'node:path'

const projectRoot = import.meta.dir

// Build the Vite client
console.log('Building client...')
await $`bun run build`.cwd(join(projectRoot, 'client'))

console.log(`
Build complete!

Run with:
  CHECQUERY_LOG_FILE=/path/to/data.yaml bun run launcher.ts
`)
