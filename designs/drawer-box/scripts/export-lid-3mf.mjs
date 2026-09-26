import {
  linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync,
  rmSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportLidParts, parseArguments, readStlVertices } from './export-lid-stls.mjs';
import { createBambuProject } from './lib/bambu-project.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const help = `Create one Bambu Studio 3MF containing the box and decorated lid on separate plates.

Usage: node scripts\\export-3mf.mjs [--output FILE.3mf] [--force] [-D NAME=VALUE ...]

Run from designs\\drawer-box, or invoke the script by its full path.

  --output FILE.3mf  Destination (default: exports\\drawer-box.3mf under this design).
  --force            Replace an existing 3MF after the new export succeeds.
  -D NAME=VALUE      Override a saved OpenSCAD setting; repeat as needed.
  --help             Show this help.

Run this command, then open the resulting 3MF in Bambu Studio as a project.
Plate 1 contains the matching box. Plate 2 contains the lid and enabled inlays
as one assembled object. Saved boxColor/lidColor/robotColor/logoColor/textColor
settings assign their colors automatically. Identical colors share a filament.
No manual STL importing or assembly is needed. Select your actual printer and
filament material before slicing; physical AMS slot mapping is printer-specific.

Requires Node.js 18+ and OpenSCAD 2021.01+. The standard Windows OpenSCAD install
is detected automatically; otherwise use PATH or set OPENSCAD.
`;

export function parse3mfArguments(argv) {
  const forwarded = [];
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') force = true;
    else if (arg === '--output' || arg === '-D') {
      forwarded.push(arg === '--output' ? '--output-dir' : arg);
      const value = argv[++i];
      if (!value || value.startsWith('--') || value === '-D') throw new Error(`${arg} requires a value.`);
      forwarded.push(value);
    } else if (arg === '--help') forwarded.push(arg);
    else throw new Error(`Unknown argument: ${arg}. Use --help for usage.`);
  }
  const parsed = parseArguments(forwarded);
  return { definitions: parsed.definitions, output: parsed.outputDir, force, help: parsed.help };
}

function checkDestination(output, force) {
  let stat;
  try {
    stat = lstatSync(output);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Destination is not a regular file: ${output}`);
  if (!force) throw new Error(`Project already exists: ${output}. Use --force to replace it.`);
}

export function exportDrawer3mf(options, {
  render = exportLidParts, log = console.log, modelRoot = root,
} = {}) {
  const output = resolve(options.output ?? join(modelRoot, 'exports', 'drawer-box.3mf'));
  if (extname(output).toLowerCase() !== '.3mf') throw new Error('Output filename must end in .3mf.');
  checkDestination(output, options.force);
  mkdirSync(dirname(output), { recursive: true });
  const temporary = mkdtempSync(join(dirname(output), '.drawer-3mf-'));
  try {
    const { files, colors } = render({
      definitions: options.definitions ?? [], outputDir: join(temporary, 'parts'), includeColors: true, includeBox: true,
    }, { log, modelRoot });
    if (!files?.length || colors?.length !== files.length) throw new Error('Renderer did not return matching parts and colors.');
    const renderedParts = files.map((file, index) => ({
      name: basename(file, '.stl'), color: colors[index], vertices: readStlVertices(readFileSync(file)),
    }));
    const boxes = renderedParts.filter(part => part.name === 'box');
    const lid = renderedParts.filter(part => part.name !== 'box');
    if (boxes.length !== 1 || lid.filter(part => part.name === 'lid_body').length !== 1) {
      throw new Error('Renderer must return both the box and the lid body.');
    }
    const archive = createBambuProject(lid, { box: boxes[0] });
    const staged = join(temporary, 'drawer-box.3mf');
    writeFileSync(staged, archive);
    checkDestination(output, options.force);
    // Hard-link publication is atomic and never replaces a concurrently created file.
    if (options.force) renameSync(staged, output);
    else linkSync(staged, output);
    log(`Created ${output}`);
    log('Open this 3MF in Bambu Studio: plate 1 is the box; plate 2 is the assembled lid. Filament colors are already assigned.');
    return output;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export const exportLid3mf = exportDrawer3mf;

export function run3mfCli(argv) {
  try {
    const options = parse3mfArguments(argv);
    if (options.help) console.log(help);
    else exportDrawer3mf(options);
  } catch (error) {
    console.error(`3MF export failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run3mfCli(process.argv.slice(2));
}
