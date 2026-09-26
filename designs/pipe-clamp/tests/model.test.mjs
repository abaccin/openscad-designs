import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configured = process.env.OPENSCAD || 'openscad';
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const defaults = {
  pipe_radius: 10, clamp_height: 12, wall_thickness: 20, screw_radius: 3.5,
  slit_width: 1.5, tab_length: 14, tab_depth: 10, tab_overlap: 2,
};

for (const [name, overrides, expectedBounds] of [
  ['saved dimensions', {}, [[-30, -29.9408, 0], [42, 29.9408, 12]]],
  ['resized clamp', {
    pipe_radius: 15, clamp_height: 16, wall_thickness: 8, screw_radius: 2.5,
    slit_width: 2, tab_length: 16, tab_depth: 8, tab_overlap: 3, $fn: 64,
  }, [[-23, -23, 0], [36, 23, 16]]],
]) {
  test(`pipe clamp ${name}: dimensions, bore, slit, tabs, and screw clearance`, t => {
    const temporary = mkdtempSync(join(tmpdir(), 'pipe-clamp-test-'));
    t.after(() => rmSync(temporary, { recursive: true, force: true }));
    const output = join(temporary, 'clamp.stl');
    const source = join(root, 'pipe_clamp.scad');
    const before = readFileSync(source);
    const result = spawnSync(executable, [
      '-o', output, '--export-format', 'asciistl',
      ...Object.entries(overrides).flatMap(([key, value]) => ['-D', `${key}=${value}`]),
      source,
    ], { cwd: temporary, encoding: 'utf8', timeout: 120_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /ERROR:|WARNING:|not a valid 2-manifold/i);
    const vertices = [...readFileSync(output, 'utf8').matchAll(
      /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi,
    )].map(match => match.slice(1).map(Number));
    const mesh = inspectMesh(vertices);
    mesh.bounds.flat().forEach((value, index) => {
      assert.ok(Math.abs(value - expectedBounds.flat()[index]) < 0.001,
        `Bound ${index}: expected ${expectedBounds.flat()[index]}, got ${value}`);
    });

    const s = { ...defaults, ...overrides };
    const outer = s.pipe_radius + s.wall_thickness;
    const screwX = outer + (s.tab_length - s.tab_overlap) / 2;
    const midZ = s.clamp_height / 2;
    for (const z of [0.1, midZ, s.clamp_height - 0.1]) {
      assert.equal(mesh.contains([0, 0, z]), false, 'Pipe bore must pass through the full height');
      assert.equal(mesh.contains([-s.pipe_radius + 0.2, 0, z]), false, 'Bore radius');
      assert.equal(mesh.contains([-s.pipe_radius - 0.2, 0, z]), true, 'Ring around bore');
      assert.equal(mesh.contains([s.pipe_radius + 1, 0, z]), false, 'Slit must open the ring');
      assert.equal(mesh.contains([screwX, 0, z]), false, 'Slit must separate the tabs');
    }
    for (const side of [-1, 1]) {
      assert.equal(mesh.contains([screwX, side * (s.slit_width / 2 - 0.1), 0.5]), false,
        'Full slit width');
      assert.equal(mesh.contains([screwX, side * (s.slit_width / 2 + 0.1), 0.5]), true,
        'Tab material immediately beside slit');
      assert.equal(mesh.contains([outer - s.tab_overlap / 2, side * 2, 0.5]), true,
        'Both tabs overlap the ring');
      for (const depth of [s.slit_width / 2 + 0.2, s.tab_depth - 0.1]) {
        const y = side * depth;
        assert.equal(mesh.contains([screwX, y, midZ]), false, 'Screw hole passes through both tabs');
        assert.equal(mesh.contains([screwX, y, midZ + s.screw_radius - 0.1]), false,
          'Screw radius');
        assert.equal(mesh.contains([screwX, y, midZ + s.screw_radius + 0.1]), true,
          'Material above the screw hole');
      }
    }
    assert.deepEqual(readFileSync(source), before, 'Rendering must not change saved settings');
  });
}
