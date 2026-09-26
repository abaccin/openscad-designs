import { spawnSync } from 'node:child_process';
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  renameSync, rmdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marker = '__DRAWER_LID_EXPORT_FLAGS__';
const reserved = new Set(['withLid', 'withColorInlay', 'itemsShown', 'colorShown']);
const parts = [
  ['lid', 'lid_body.stl'],
  ['robot', 'lid_robot.stl'],
  ['logo', 'lid_logo.stl'],
  ['text', 'lid_text.stl'],
];

const help = `Export aligned lid-component STLs using saved round_box_drawer.scad settings.

Usage: node scripts\\export-lid-stls.mjs [--output-dir DIRECTORY] [-D NAME=VALUE ...]

Run from designs\\drawer-box, or invoke the script by its full path.

  --output-dir DIRECTORY  New or empty directory (default: exports\\lid-stls under this design).
  -D NAME=VALUE            OpenSCAD definition; repeat for multiple settings.
  --help                  Show this help.

Requires Node.js 18+ and OpenSCAD 2021.01+. The standard Windows OpenSCAD install
is detected automatically; otherwise use PATH or set OPENSCAD. Relative output paths use the current directory;
the default output directory and model are resolved from the script location.

The script controls withLid, withColorInlay, itemsShown, and colorShown.
It exports the lid body and enabled robot/logo/text inlays without moving them.
Import all output STLs together as one multi-part object and assign filaments
in your slicer. STL files do not store colors. No box or 3MF is exported.
`;

export function parseArguments(argv) {
  const options = { definitions: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--output-dir' || arg === '-D') {
      const value = argv[++i];
      if (!value || value.startsWith('--') || value === '-D') {
        throw new Error(`${arg} requires a value. Use --help for usage.`);
      }
      if (arg === '--output-dir') {
        if (options.outputDir !== undefined) throw new Error('--output-dir may only be specified once.');
        options.outputDir = value;
      } else {
        const definition = value.match(/^\s*([A-Za-z_$][\w$]*)\s*=\s*(\S[\s\S]*)$/);
        if (!definition) throw new Error(`Invalid -D definition: ${value}. Expected NAME=VALUE.`);
        if (reserved.has(definition[1])) {
          throw new Error(`${definition[1]} is controlled by the exporter; omit this -D override.`);
        }
        options.definitions.push(value);
      }
    } else {
      throw new Error(`Unknown argument: ${arg}. Use --help for usage.`);
    }
  }
  return options;
}

function checkOutputDirectory(outputDir) {
  // Do not follow a symlink or delete anything from a previous export.
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink() || readdirSync(outputDir).length) {
    throw new Error(`Output must be a new or empty directory: ${outputDir}`);
  }
  return true;
}

function checkDiagnostics(log, context) {
  if (/(?:^|\n)\s*(?:ERROR|WARNING):|not (?:be )?a valid 2-manifold/i.test(log)) {
    throw new Error(`${context}: OpenSCAD reported a warning or error.\n${log.trim()}`);
  }
}

export function readStlVertices(data) {
  const vertices = [];
  if (data.length >= 84 && data.length === 84 + 50 * data.readUInt32LE(80)) {
    for (let offset = 84; offset < data.length; offset += 50) {
      for (let vertex = 0; vertex < 3; vertex++) {
        vertices.push([0, 1, 2].map(axis => data.readFloatLE(offset + 12 + vertex * 12 + axis * 4)));
      }
    }
  } else {
    const text = data.toString('utf8').trim();
    const mesh = text.match(/^solid[^\r\n]*\r?\n([\s\S]*?)endsolid[^\r\n]*$/);
    if (!mesh) throw new Error('Invalid STL structure.');
    const facet = /facet\s+normal\s+\S+\s+\S+\s+\S+\s+outer\s+loop\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+endloop\s+endfacet/g;
    const remaining = mesh[1].replace(facet, (...match) => {
      for (let i = 1; i <= 9; i += 3) vertices.push(match.slice(i, i + 3).map(Number));
      return '';
    });
    if (remaining.trim()) throw new Error('Invalid STL facets.');
  }
  if (!vertices.length || !vertices.every(vertex => vertex.every(Number.isFinite))) {
    throw new Error('STL must contain nonempty, finite geometry.');
  }
  return vertices;
}

export function exportLidStls(options, {
  log = console.log, ...dependencies
} = {}) {
  const { files } = exportLidParts(options, { ...dependencies, log });
  log(`Exported ${files.length} aligned STL file(s) to ${dirname(files[0])}`);
  log('Import these STLs together as one multi-part object; do not arrange the inlays separately. Assign filaments in your slicer.');
  return files;
}

export function exportLidParts(options, {
  run = spawnSync, log = console.log, modelRoot = root, timeout = 600_000,
} = {}) {
  const outputDir = resolve(options.outputDir ?? join(modelRoot, 'exports', 'lid-stls'));
  checkOutputDirectory(outputDir);
  const source = join(modelRoot, 'round_box_drawer.scad');
  if (!existsSync(source)) throw new Error(`Model not found: ${source}`);
  const selectedParts = options.includeBox ? [['box', 'box.stl'], ...parts] : parts;
  const colorSettings = options.includeBox
    ? 'boxColor,lidColor,robotColor,logoColor,textColor' : 'lidColor,robotColor,logoColor,textColor';
  const windowsInstall = join(process.env.ProgramFiles || 'C:\\Program Files', 'OpenSCAD', 'openscad.exe');
  const configured = process.env.OPENSCAD
    || (process.platform === 'win32' && existsSync(windowsInstall) ? windowsInstall : 'openscad');
  const executable = process.platform === 'win32'
    ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
  const common = (options.definitions ?? []).flatMap(value => ['-D', value]);
  common.push('-D', 'withLid=true', '-D', 'withColorInlay=true', '-D', 'itemsShown="lid"');
  const env = {
    ...process.env,
    OPENSCADPATH: [modelRoot, process.env.OPENSCADPATH].filter(Boolean).join(delimiter),
  };

  function invoke(args, context, echoFile) {
    const result = run(executable, args, {
      cwd: modelRoot, env, encoding: 'utf8', timeout, maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    const diagnostics = [result.stdout, result.stderr,
      echoFile && existsSync(echoFile) ? readFileSync(echoFile, 'utf8') : '',
    ].filter(Boolean).join('\n');
    if (result.error) {
      const reason = result.error.code === 'ENOENT'
        ? `OpenSCAD executable not found: ${executable}. Set OPENSCAD or add openscad to PATH.`
        : result.error.code === 'ETIMEDOUT'
          ? `OpenSCAD timed out after ${timeout / 1000} seconds.`
          : `Could not run OpenSCAD: ${result.error.message}`;
      throw new Error(`${context}: ${reason}${diagnostics ? `\n${diagnostics.trim()}` : ''}`);
    }
    checkDiagnostics(diagnostics, context);
    if (result.status !== 0) {
      throw new Error(`${context}: OpenSCAD failed (exit ${result.status}, signal ${result.signal ?? 'none'}).`
        + `\n${diagnostics.trim()}`);
    }
    return diagnostics;
  }

  mkdirSync(dirname(outputDir), { recursive: true });
  const temporary = mkdtempSync(join(dirname(outputDir), '.lid-stls-'));
  try {
    const staging = join(temporary, 'parts');
    mkdirSync(staging);
    const wrapper = join(temporary, 'settings.scad');
    const metadata = join(temporary, 'settings.echo');
    const palette = join(temporary, 'palette.csg');
    const probes = options.includeColors
      ? `\nfor (c=[${colorSettings}]) color(c) cube(1);\n` : '';
    writeFileSync(wrapper, `include <round_box_drawer.scad>\necho("${marker}", [withLidArtwork, withLidLogo, withLidText]);\n${probes}`);
    log('Evaluating saved lid settings...');
    invoke(['-o', metadata, ...common, '-D', 'colorShown="lid"', wrapper], 'Settings evaluation', metadata);
    if (!existsSync(metadata)) throw new Error('OpenSCAD did not produce settings metadata.');
    const records = readFileSync(metadata, 'utf8').split(/\r?\n/).filter(line => line.includes(marker));
    const match = records.length === 1
      && records[0].match(/^ECHO:\s*"__DRAWER_LID_EXPORT_FLAGS__",\s*\[(true|false),\s*(true|false),\s*(true|false)\]\s*$/);
    if (!match) throw new Error('OpenSCAD did not report valid boolean decoration settings.');
    const enabled = [...(options.includeBox ? [true] : []), true, ...match.slice(1).map(value => value === 'true')];
    let colors;
    if (options.includeColors) {
      // OpenSCAD 2021.01 can crash when .echo and .csg share an invocation.
      invoke(['-o', palette, ...common, '-D', 'colorShown="lid"', wrapper], 'Color evaluation');
      if (!existsSync(palette)) throw new Error('OpenSCAD did not produce the color palette.');
      // The final color nodes are our probes. OpenSCAD resolves named, hex,
      // and vector colors here using the same rules as its model preview.
      const values = [...readFileSync(palette, 'utf8').matchAll(/color\(\[([^\]]+)\]\)/g)].slice(-selectedParts.length);
      const rgba = values.map(value => value[1].split(',').map(component => Number(component.trim())));
      if (rgba.length !== selectedParts.length || !rgba.every(color =>
        color.length === 4 && color.every(value => Number.isFinite(value) && value >= 0 && value <= 1))) {
        throw new Error(`OpenSCAD did not report ${selectedParts.length} valid RGBA colors.`);
      }
      colors = rgba.map(color => '#' + color.slice(0, 3).map(value =>
        Math.round(value * 255).toString(16).padStart(2, '0')).join('').toUpperCase());
      if (rgba.some((color, index) => enabled[index] && color[3] !== 1)) {
        log('Using opaque filament colors; preview transparency cannot be represented by a filament assignment.');
      }
    }
    const filenames = [];
    for (const [index, [part, filename]] of selectedParts.entries()) {
      if (!enabled[index]) {
        log(`Skipping ${part}: decoration disabled.`);
        continue;
      }
      log(`Rendering ${filename}...`);
      const output = join(staging, filename);
      invoke(['-o', output, '--export-format', 'asciistl',
        ...common, '-D', `colorShown="${part}"`, source], filename);
      if (!existsSync(output)) throw new Error(`${filename}: OpenSCAD produced no STL file.`);
      try {
        readStlVertices(readFileSync(output));
      } catch (error) {
        throw new Error(`${filename}: ${error.message} Check decoration placement, overlap, and clipping.`, { cause: error });
      }
      filenames.push(filename);
    }
    // Recheck after rendering; publish the complete set by a same-volume rename.
    if (checkOutputDirectory(outputDir)) rmdirSync(outputDir);
    renameSync(staging, outputDir);
    return {
      files: filenames.map(filename => join(outputDir, filename)),
      colors: colors?.filter((color, index) => enabled[index]),
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(help);
    else exportLidStls(options);
  } catch (error) {
    console.error(`STL export failed: ${error.message}`);
    process.exitCode = 1;
  }
}
