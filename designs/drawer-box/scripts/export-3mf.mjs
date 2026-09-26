import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run3mfCli } from './export-lid-3mf.mjs';

export { exportDrawer3mf, parse3mfArguments } from './export-lid-3mf.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run3mfCli(process.argv.slice(2));
}
