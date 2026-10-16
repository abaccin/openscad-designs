import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'blind_cord_coupler.scad');
const configured = process.env.OPENSCAD || 'openscad';
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const defaults = {
  thin_cord_diameter: 1, pull_cord_diameter: 3, hole_clearance: 0.4,
  plate_width: 28, plate_length: 36, plate_thickness: 6, corner_radius: 3,
  thin_column_spacing: 8, thin_row_spacing: 6, thin_edge_distance: 6,
  pull_edge_distance: 8, mouth_chamfer: 0.4, minimum_wall: 2,
};

function render(t, overrides = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'blind-cord-coupler-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const output = join(temporary, 'coupler.stl');
  const before = readFileSync(source);
  const result = spawnSync(executable, [
    '-o', output, '--export-format', 'asciistl',
    ...Object.entries(overrides).flatMap(([key, value]) => ['-D', `${key}=${value}`]),
    source,
  ], { cwd: temporary, encoding: 'utf8', timeout: 120_000 });
  assert.ifError(result.error);
  assert.deepEqual(readFileSync(source), before, 'Rendering must not change saved settings');
  return { result, output };
}

for (const [name, overrides] of [
  ['saved dimensions', {}],
  ['resized plate and cords', {
    thin_cord_diameter: 1.4, pull_cord_diameter: 4, hole_clearance: 0.5,
    plate_width: 36, plate_length: 46, plate_thickness: 5, corner_radius: 5,
    thin_column_spacing: 10, thin_row_spacing: 8, thin_edge_distance: 8,
    pull_edge_distance: 10, mouth_chamfer: 0.6, minimum_wall: 2.5,
  }],
  ['unchamfered holes and square corners', { corner_radius: 0, mouth_chamfer: 0 }],
  ['holes near large rounded corners', { corner_radius: 10, thin_column_spacing: 9 }],
]) {
  test(`blind cord coupler ${name}: outline, seven bores, chamfers, and ligaments`, t => {
    const { result, output } = render(t, overrides);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /ERROR:|WARNING:|not a valid 2-manifold/i);
    const vertices = [...readFileSync(output, 'utf8').matchAll(
      /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi,
    )].map(match => match.slice(1).map(Number));
    const mesh = inspectMesh(vertices);
    const s = { ...defaults, ...overrides };
    const expectedBounds = [
      [-s.plate_width / 2, -s.plate_length / 2, 0],
      [s.plate_width / 2, s.plate_length / 2, s.plate_thickness],
    ];
    mesh.bounds.flat().forEach((value, index) => {
      assert.ok(Math.abs(value - expectedBounds.flat()[index]) < 0.001,
        `Bound ${index}: expected ${expectedBounds.flat()[index]}, got ${value}`);
    });

    const holes = [];
    for (let row = 0; row < 2; row++) {
      for (let column = -1; column <= 1; column++) {
        holes.push([
          column * s.thin_column_spacing,
          s.plate_length / 2 - s.thin_edge_distance - row * s.thin_row_spacing,
          (s.thin_cord_diameter + s.hole_clearance) / 2,
        ]);
      }
    }
    holes.push([0, -s.plate_length / 2 + s.pull_edge_distance,
      (s.pull_cord_diameter + s.hole_clearance) / 2]);
    const margin = 0.06;
    const heights = [...new Set([
      margin, s.mouth_chamfer + margin, s.plate_thickness / 2,
      s.plate_thickness - s.mouth_chamfer - margin, s.plate_thickness - margin,
    ])];
    const expectPoint = (point, inside, message) => {
      assert.equal(mesh.contains(point), inside, `${message}: [${point.join(', ')}]`);
    };

    for (const [index, [x, y, radius]] of holes.entries()) {
      for (const z of heights) {
        expectPoint([x, y, z], false, `Hole ${index + 1} stays open through the plate`);
        const boreRadius = radius
          + Math.max(0, s.mouth_chamfer - Math.min(z, s.plate_thickness - z));
        for (let step = 0; step < 8; step++) {
          const angle = step * Math.PI / 4;
          for (const [delta, inside] of [[-margin, false], [margin, true]]) {
            expectPoint([
              x + (boreRadius + delta) * Math.cos(angle),
              y + (boreRadius + delta) * Math.sin(angle), z,
            ], inside, `Hole ${index + 1} bore radius, mouth chamfers, and surrounding material`);
          }
        }
      }
      if (s.mouth_chamfer > 0) {
        const probeX = x + radius + s.mouth_chamfer / 2;
        expectPoint([probeX, y, margin], false, 'Lower chamfer opens the mouth');
        expectPoint([probeX, y, s.plate_thickness - margin], false,
          'Upper chamfer opens the mouth');
        expectPoint([probeX, y, s.plate_thickness / 2], true,
          'Chamfers leave the narrower straight bore section');
      }
    }

    for (const z of [margin, s.plate_thickness / 2, s.plate_thickness - margin]) {
      expectPoint([0, 0, z], true, 'Solid web between the thin cords and pull cord');
      for (const [i, j] of [
        [0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5], [4, 6],
      ]) {
        const a = holes[i], b = holes[j];
        const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const mouthA = a[2] + s.mouth_chamfer, mouthB = b[2] + s.mouth_chamfer;
        const gap = distance - mouthA - mouthB;
        assert.ok(gap >= s.minimum_wall, 'Expected layout preserves the minimum face ligament');
        const fraction = (mouthA + gap / 2) / distance;
        expectPoint([
          a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction, z,
        ], true, `Solid ligament between holes ${i + 1} and ${j + 1}`);
      }

      for (const side of [-1, 1]) {
        for (const [delta, inside] of [[-margin, true], [margin, false]]) {
          expectPoint([side * (s.plate_width / 2 + delta), 0, z], inside, 'Plate width');
          expectPoint([0, side * (s.plate_length / 2 + delta), z], inside, 'Plate length');
        }
        for (const end of [-1, 1]) {
          expectPoint([
            side * (s.plate_width / 2 - margin),
            end * (s.plate_length / 2 - margin), z,
          ], s.corner_radius === 0, 'Rounded corners remove the rectangular tips');
          if (s.corner_radius > 0) {
            for (const [delta, inside] of [[-margin, true], [margin, false]]) {
              const offset = (s.corner_radius + delta) / Math.sqrt(2);
              expectPoint([
                side * (s.plate_width / 2 - s.corner_radius + offset),
                end * (s.plate_length / 2 - s.corner_radius + offset), z,
              ], inside, 'Corner radius follows the specified arc');
            }
          }
        }
      }
    }
  });
}

for (const [name, overrides, message] of [
  ['zero plate width', { plate_width: 0 }, /Plate width, length, and thickness must be positive/],
  ['negative plate length', { plate_length: -1 }, /Plate width, length, and thickness must be positive/],
  ['zero thickness', { plate_thickness: 0 }, /Plate width, length, and thickness must be positive/],
  ['zero thin-cord diameter', { thin_cord_diameter: 0 }, /Both cord diameters must be positive/],
  ['negative pull-cord diameter', { pull_cord_diameter: -1 }, /Both cord diameters must be positive/],
  ['negative clearance', { hole_clearance: -0.1 }, /Hole clearance must be nonnegative/],
  ['negative corner radius', { corner_radius: -1 }, /Corner radius must be nonnegative/],
  ['corner radius consuming the width', { corner_radius: 14 }, /smaller than half either plate dimension/],
  ['zero column spacing', { thin_column_spacing: 0 }, /column and row spacing must be positive/],
  ['negative row spacing', { thin_row_spacing: -1 }, /column and row spacing must be positive/],
  ['zero thin edge distance', { thin_edge_distance: 0 }, /Hole-center edge distances must be positive/],
  ['negative pull edge distance', { pull_edge_distance: -1 }, /Hole-center edge distances must be positive/],
  ['negative chamfer', { mouth_chamfer: -0.1 }, /Mouth chamfer must be nonnegative/],
  ['chamfers consuming the bore', { mouth_chamfer: 3 }, /leave a straight bore section/],
  ['zero minimum wall', { minimum_wall: 0 }, /Minimum wall must be positive/],
  ['overlapping columns', { thin_column_spacing: 1 }, /minimum_wall between them/],
  ['overlapping rows', { thin_row_spacing: 1 }, /minimum_wall between them/],
  ['pull hole entering the thin row', { pull_edge_distance: 24 }, /minimum_wall between them/],
  ['chamfers weakening column ligaments', { thin_column_spacing: 4 }, /minimum_wall between them/],
  ['thin mouth too close to top edge', { thin_edge_distance: 2.8 }, /minimum_wall around the rounded perimeter/],
  ['pull mouth too close to bottom edge', { pull_edge_distance: 3.8 }, /minimum_wall around the rounded perimeter/],
  ['holes entering rounded corners', {
    corner_radius: 10, thin_column_spacing: 10, thin_edge_distance: 4,
  }, /minimum_wall around the rounded perimeter/],
]) {
  test(`blind cord coupler rejects ${name}`, t => {
    const { result } = render(t, overrides);
    assert.notEqual(result.status, 0, 'Invalid settings must fail rendering');
    assert.match(result.stdout + result.stderr, /ERROR: Assertion/);
    assert.match(result.stdout + result.stderr, message);
  });
}
