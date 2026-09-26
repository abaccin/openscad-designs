import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { exportLidParts, exportLidStls, parseArguments, readStlVertices } from '../scripts/export-lid-stls.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'export-lid-stls.mjs');
const triangle = `solid test
facet normal 0 0 1
outer loop
vertex 0 -10 0
vertex 1 -10 0
vertex 0 -9 0
endloop
endfacet
endsolid test
`;
const metadata = 'ECHO: "__DRAWER_LID_EXPORT_FLAGS__", [false, true, true]\n';

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), 'lid exporter test '));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const modelRoot = join(temporary, 'model with spaces');
  mkdirSync(modelRoot);
  writeFileSync(join(modelRoot, 'round_box_drawer.scad'), '// test model\n');
  const outputDir = join(temporary, 'output with spaces');
  const calls = [];
  const logs = [];
  const run = (executable, args, options) => {
    calls.push({ executable, args, options });
    const output = args[args.indexOf('-o') + 1];
    writeFileSync(output, output.endsWith('.echo') ? metadata : triangle);
    return { status: 0, stdout: '', stderr: '' };
  };
  return { temporary, modelRoot, outputDir, calls, run, logs, log: message => logs.push(message) };
}

function assertClean(f) {
  assert.equal(readdirSync(f.temporary).some(name => name.startsWith('.lid-stls-')), false);
}

test('CLI parses repeated definitions and rejects invalid or reserved options', () => {
  assert.deepEqual(parseArguments(['--output-dir', 'a b', '-D', 'lidText="A B"', '-D', '$fn=16']), {
    outputDir: 'a b', definitions: ['lidText="A B"', '$fn=16'],
  });
  assert.deepEqual(parseArguments(['-D', 'boxLength=100', '-D', 'boxLength=120']).definitions,
    ['boxLength=100', 'boxLength=120']);
  assert.equal(parseArguments(['--help']).help, true);
  for (const args of [
    ['--unknown'], ['--output-dir'], ['-D'], ['-D', 'broken'], ['-D', 'x='],
    ['--output-dir', 'x', '--output-dir', 'y'],
    ...['withLid', 'withColorInlay', 'itemsShown', 'colorShown'].map(name => ['-D', ` ${name} = false`]),
  ]) assert.throws(() => parseArguments(args));
});

test('exports only evaluated enabled parts, preserving definitions, cwd and forced flags', t => {
  const f = fixture(t);
  const definitions = ['lidText="A B"', 'withLidLogo=boxLength>50'];
  const before = readFileSync(join(f.modelRoot, 'round_box_drawer.scad'));
  const files = exportLidStls({ outputDir: f.outputDir, definitions }, f);
  assert.deepEqual(files.map(file => file.slice(f.outputDir.length + 1)),
    ['lid_body.stl', 'lid_logo.stl', 'lid_text.stl']);
  assert.deepEqual(readdirSync(f.outputDir).sort(), ['lid_body.stl', 'lid_logo.stl', 'lid_text.stl']);
  assert.equal(f.calls.length, 4);
  for (const [i, call] of f.calls.entries()) {
    const defs = call.args.filter((value, index) => call.args[index - 1] === '-D');
    assert.deepEqual(defs, [...definitions, 'withLid=true', 'withColorInlay=true',
      'itemsShown="lid"', `colorShown="${['lid', 'lid', 'logo', 'text'][i]}"`]);
    assert.equal(call.options.cwd, f.modelRoot);
    assert.equal(call.options.timeout, 600_000);
    assert.ok(call.options.env.OPENSCADPATH.startsWith(f.modelRoot));
    assert.equal(call.options.shell, undefined);
    if (i) assert.equal(call.args.at(-1), join(f.modelRoot, 'round_box_drawer.scad'));
  }
  for (const file of files) assert.equal(readFileSync(file, 'utf8'), triangle);
  assert.ok(f.logs.includes('Skipping robot: decoration disabled.'));
  assert.deepEqual(readFileSync(join(f.modelRoot, 'round_box_drawer.scad')), before);
  assertClean(f);
});

test('default output is relative to model root and disabled decorations are all skipped', t => {
  const f = fixture(t);
  const run = (...args) => {
    const result = f.run(...args);
    const output = args[1][1];
    if (output.endsWith('.echo')) writeFileSync(output, metadata.replace('false, true, true', 'false, false, false'));
    return result;
  };
  const files = exportLidStls({}, { ...f, run });
  assert.deepEqual(files, [join(f.modelRoot, 'exports', 'lid-stls', 'lid_body.stl')]);
  assert.equal(f.logs.filter(line => line.startsWith('Skipping')).length, 3);
  assert.equal(readdirSync(join(f.modelRoot, 'exports')).length, 1);
});

test('shared renderer resolves colors only when requested and omits disabled-part colors', t => {
  const f = fixture(t);
  const run = (...args) => {
    const result = f.run(...args);
    if (args[1][1].endsWith('.csg')) {
      writeFileSync(args[1][1], 'color([1, 0, 0, 1]) { cube(); }\n'
        + ['1, 1, 1, 1', '1, 0.5, 0, 1', '0, 0, 0, 1', '0, 0.501961, 0, 0.5']
          .map(color => `color([${color}]) { cube(); }`).join('\n'));
    }
    return result;
  };
  const result = exportLidParts({ outputDir: f.outputDir, includeColors: true }, { ...f, run });
  assert.deepEqual(result.colors, ['#FFFFFF', '#000000', '#008000']);
  assert.equal(result.files.length, 3);
  assert.ok(f.logs.some(message => message.includes('preview transparency')));
  assert.equal(f.calls.length, 5);
  for (const call of f.calls) assert.equal(call.args.filter(arg => arg === '-o').length, 1);
  assertClean(f);
});

test('shared renderer rejects invalid or missing palette output before rendering', t => {
  for (const palette of [null, '', 'color([1, 2, 3, 4]) {}'.repeat(4)]) {
    const f = fixture(t);
    const run = (...args) => {
      const result = f.run(...args);
      if (args[1][1].endsWith('.csg')) {
        if (palette === null) rmSync(args[1][1]);
        else writeFileSync(args[1][1], palette);
      }
      return result;
    };
    assert.throws(() => exportLidParts({ outputDir: f.outputDir, includeColors: true }, { ...f, run }), /palette|RGBA/);
    assert.equal(f.calls.length, 2);
    assert.equal(existsSync(f.outputDir), false);
    assertClean(f);
  }
});

test('full-project rendering adds the matching box and its own color without changing lid settings', t => {
  const f = fixture(t);
  const definitions = ['boxLength=120', 'lidStyle="magnetic"', 'dividerCountY=2'];
  const run = (...args) => {
    const result = f.run(...args);
    if (args[1][1].endsWith('.csg')) {
      writeFileSync(args[1][1], ['0.12549, 0.25098, 0.376471, 1', '1, 1, 1, 1',
        '1, 0.5, 0, 1', '0, 0, 0, 1', '0, 0.501961, 0, 1']
        .map(color => `color([${color}]) { cube(); }`).join('\n'));
    }
    return result;
  };
  const result = exportLidParts({ definitions, outputDir: f.outputDir, includeColors: true, includeBox: true }, { ...f, run });
  assert.deepEqual(result.files.map(file => file.slice(f.outputDir.length + 1)),
    ['box.stl', 'lid_body.stl', 'lid_logo.stl', 'lid_text.stl']);
  assert.deepEqual(result.colors, ['#204060', '#FFFFFF', '#000000', '#008000']);
  assert.equal(f.calls.length, 6);
  for (const [index, call] of f.calls.slice(2).entries()) {
    assert.deepEqual(call.args.filter((value, i) => call.args[i - 1] === '-D'), [
      ...definitions, 'withLid=true', 'withColorInlay=true', 'itemsShown="lid"',
      `colorShown="${['box', 'lid', 'logo', 'text'][index]}"`,
    ]);
  }
  assertClean(f);
});

test('box rendering failure aborts the entire full-project export', t => {
  const f = fixture(t);
  const run = (...args) => {
    if (args[1][1].endsWith('box.stl')) return { status: 1, stderr: 'ERROR: Invalid box divider settings' };
    return f.run(...args);
  };
  assert.throws(() => exportLidParts({ outputDir: f.outputDir, includeBox: true }, { ...f, run }), /Invalid box divider/);
  assert.equal(existsSync(f.outputDir), false);
  assert.equal(f.calls.length, 1);
  assertClean(f);
});

test('accepts an empty output directory but refuses existing files before running', t => {
  const f = fixture(t);
  mkdirSync(f.outputDir);
  exportLidStls({ outputDir: f.outputDir }, f);
  const previous = readFileSync(join(f.outputDir, 'lid_body.stl'));
  f.calls.length = 0;
  assert.throws(() => exportLidStls({ outputDir: f.outputDir }, f), /new or empty/);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(readFileSync(join(f.outputDir, 'lid_body.stl')), previous);
  assertClean(f);
});

test('does not publish over files added while rendering', t => {
  const f = fixture(t);
  const run = (...args) => {
    if (!existsSync(f.outputDir)) {
      mkdirSync(f.outputDir);
      writeFileSync(join(f.outputDir, 'user-file.txt'), 'keep');
    }
    return f.run(...args);
  };
  assert.throws(() => exportLidStls({ outputDir: f.outputDir }, { ...f, run }), /new or empty/);
  assert.deepEqual(readdirSync(f.outputDir), ['user-file.txt']);
  assertClean(f);
});

for (const [name, change, expected] of [
  ['missing executable', () => ({ error: Object.assign(new Error('spawn'), { code: 'ENOENT' }) }), /Set OPENSCAD/],
  ['timeout', () => ({ error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) }), /timed out/],
  ['spawn failure', () => ({ error: new Error('access denied') }), /access denied/],
  ['nonzero exit', () => ({ status: 1, stderr: 'render failed' }), /render failed/],
  ['assertion with zero exit', () => ({ status: 0, stderr: 'ERROR: Assertion failed' }), /Assertion failed/],
  ['warning with zero exit', () => ({ status: 0, stderr: 'WARNING: missing SVG' }), /missing SVG/],
  ['invalid manifold', () => ({ status: 0, stderr: 'Object may not be a valid 2-manifold' }), /valid 2-manifold/],
  ['malformed metadata', output => { writeFileSync(output, metadata.replace('false', 'undef')); }, /valid boolean/],
  ['missing metadata', output => { rmSync(output); }, /settings metadata/],
  ['duplicate metadata', output => { writeFileSync(output, metadata + metadata); }, /valid boolean/],
  ['metadata assertion', output => { writeFileSync(output, `ERROR: Assertion failed\n${metadata}`); }, /Assertion failed/],
]) {
  test(`reports ${name} and cleans staging without publishing`, t => {
    const f = fixture(t);
    const run = (...args) => {
      const result = f.run(...args);
      return change(args[1][1]) ?? result;
    };
    assert.throws(() => exportLidStls({ outputDir: f.outputDir }, { ...f, run }), expected);
    assert.equal(existsSync(f.outputDir), false);
    assertClean(f);
  });
}

for (const [name, replacement] of [
  ['empty', 'solid empty\nendsolid empty\n'],
  ['malformed', 'this is not STL'],
  ['nonfinite', triangle.replace('vertex 1', 'vertex NaN')],
  ['missing', null],
]) {
  test(`rejects ${name} inlay after body export without leaving partial results`, t => {
    const f = fixture(t);
    mkdirSync(f.outputDir);
    const run = (...args) => {
      const result = f.run(...args);
      const output = args[1][1];
      if (output.endsWith('lid_logo.stl')) {
        if (replacement === null) rmSync(output);
        else writeFileSync(output, replacement);
      }
      return result;
    };
    assert.throws(() => exportLidStls({ outputDir: f.outputDir }, { ...f, run }), /lid_logo.stl/);
    assert.deepEqual(readdirSync(f.outputDir), []);
    assertClean(f);
  });
}

test('STL reader accepts finite ASCII and binary facets, rejecting empty or invalid data', () => {
  const ascii = readStlVertices(Buffer.from(triangle));
  const binary = Buffer.alloc(134);
  binary.writeUInt32LE(1, 80);
  ascii.flat().forEach((coordinate, i) => binary.writeFloatLE(coordinate, 96 + i * 4));
  assert.deepEqual(readStlVertices(binary), ascii);
  binary.writeFloatLE(Infinity, 96);
  assert.throws(() => readStlVertices(binary), /finite/);
  assert.throws(() => readStlVertices(Buffer.alloc(84)), /nonempty/);
  assert.throws(() => readStlVertices(Buffer.from(triangle.replace('endfacet', 'broken'))), /facets/);
});

test('CLI help and missing-executable errors work from outside the repository', t => {
  const f = fixture(t);
  const help = spawnSync(process.execPath, [script, '--help'], { cwd: f.temporary, encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /multi-part object/);
  const missing = spawnSync(process.execPath, [script, '--output-dir', f.outputDir], {
    cwd: f.temporary, encoding: 'utf8', env: { ...process.env, OPENSCAD: join(f.temporary, 'missing renderer.exe') },
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Set OPENSCAD/);
  assert.equal(existsSync(f.outputDir), false);
  assertClean(f);
});

const bounds = vertices => [Math.min, Math.max].map(fn => [0, 1, 2].map(axis =>
  vertices.reduce((bound, point) => fn(bound, point[axis]), fn === Math.min ? Infinity : -Infinity)));
const uniqueVertices = vertices => [...new Set(vertices.map(vertex => vertex.join(',')))].sort();

for (const style of ['sliding', 'magnetic']) {
  test(`real OpenSCAD ${style} exports match direct meshes at their original coordinates`, t => {
    const f = fixture(t);
    const source = join(root, 'round_box_drawer.scad');
    const before = readFileSync(source);
    const artwork = join(f.temporary, 'simple artwork.svg');
    writeFileSync(artwork, '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16"/></svg>');
    const settings = {
      boxLength: 100, boxWidth: 95, boxHeight: 50, wallThickness: 2.5, bottomThickness: 2,
      cornerRadius: 5, dividerCountX: 0, dividerCountY: 0, compartmentSizesX: [], compartmentSizesY: [],
      pullLedges: 'none', withStacking: false, lidStyle: style, lidThickness: 2,
      lidClearance: 0.2, withNotch: true, slidingSkirtDepth: 6, slidingSkirtThickness: 1.4,
      slidingRailDepth: 0.4, slidingVerticalClearance: 0.2, slidingFloorRadius: 2,
      slidingEdgeChamfer: 0.5, withSlidingGrip: true,
      slidingGripProjection: 0.8, withSlidingLock: true, slidingLockInterference: 0.2,
      magneticLidThickness: 5, magnetThickness: 3, magnetRecess: 0.1,
      withLidArtwork: true, lidArtworkFile: artwork, lidArtworkAspect: 1, lidArtworkDepth: 0.5,
      withLidLogo: true, lidLogoSize: 15, lidLogoDepth: 0.5,
      withLidText: true, lidText: 'AB', lidTextSize: 6, lidTextDepth: 0.5,
      lidTextPositionX: 70, lidTextPositionY: 25, $fn: 16,
    };
    const definitions = Object.entries(settings).map(([name, value]) => `${name}=${JSON.stringify(value)}`);
    // Exercise evaluated expressions, not merely literal flags in the SCAD source.
    definitions.push('withLidArtwork=boxLength>50');
    const args = [script, '--output-dir', f.outputDir, ...definitions.flatMap(value => ['-D', value])];
    const result = spawnSync(process.execPath, args, { cwd: f.temporary, encoding: 'utf8', timeout: 2_400_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(readdirSync(f.outputDir).sort(),
      ['lid_body.stl', 'lid_logo.stl', 'lid_robot.stl', 'lid_text.stl']);
    const configured = process.env.OPENSCAD || 'openscad';
    const executable = process.platform === 'win32'
      ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
    let bodyBounds;
    for (const [part, filename] of [
      ['lid', 'lid_body.stl'], ['robot', 'lid_robot.stl'], ['logo', 'lid_logo.stl'], ['text', 'lid_text.stl'],
    ]) {
      const direct = join(f.temporary, `${part}-direct.stl`);
      const rendered = spawnSync(executable, [
        '-o', direct, '--export-format', 'asciistl',
        ...definitions.flatMap(value => ['-D', value]),
        '-D', 'withLid=true', '-D', 'withColorInlay=true', '-D', 'itemsShown="lid"',
        '-D', `colorShown="${part}"`, source,
      ], { cwd: root, encoding: 'utf8', timeout: 600_000 });
      assert.ifError(rendered.error);
      assert.equal(rendered.status, 0, rendered.stdout + rendered.stderr);
      assert.doesNotMatch(rendered.stdout + rendered.stderr, /ERROR:|WARNING:|not a valid 2-manifold/i);
      const actual = readStlVertices(readFileSync(join(f.outputDir, filename)));
      assert.deepEqual(uniqueVertices(actual), uniqueVertices(readStlVertices(readFileSync(direct))),
        `${filename} must retain the direct export's exact vertex coordinates`);
      const partBounds = bounds(actual);
      if (part === 'lid') bodyBounds = partBounds;
      else {
        for (let axis = 0; axis < 3; axis++) {
          assert.ok(partBounds[0][axis] >= bodyBounds[0][axis] - 0.001);
          assert.ok(partBounds[1][axis] <= bodyBounds[1][axis] + 0.001);
        }
        assert.equal(partBounds[0][2], 0, 'Every inlay starts on the exterior print face');
        assert.equal(partBounds[1][2], 0.5, 'Every inlay reaches its configured engraving depth');
      }
    }
    assert.deepEqual(bodyBounds, style === 'sliding'
      ? [[0, -100.8, 0], [100, -4.2, 8]] : [[0, -100, 0], [100, -5, 7]]);
    assert.deepEqual(readFileSync(source), before);
    assertClean(f);
  });
}
