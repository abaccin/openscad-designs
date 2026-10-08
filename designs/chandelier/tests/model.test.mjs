import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'chandelier.scad');
const configured = process.env.OPENSCAD || 'openscad';
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const defaults = {
  flange_diameter: 63.5, flange_height: 4, collar_diameter: 41.5, base_height: 30,
  lower_bore_diameter: 34.204, lower_bore_height: 2.998, upper_bore_diameter: 36.504,
  ring_outer_diameter: 34.2, ring_inner_diameter: 33.004, ring_height: 1.8,
  dome_diameter: 60, dome_height: 41.2374, dome_inner_diameter: 55.006,
  dome_inner_height: 35, dome_opening_height: 1.879, dome_opening_diameter: 54.45,
  top_hole_diameter: 10, print_gap: 10,
};

function render(t, overrides = {}, errorPattern) {
  const temporary = mkdtempSync(join(tmpdir(), 'chandelier-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const output = join(temporary, 'chandelier.stl');
  const before = readFileSync(source);
  const result = spawnSync(executable, [
    '-o', output, '--export-format', 'asciistl',
    ...Object.entries(overrides).flatMap(([key, value]) => [
      '-D', `${key}=${JSON.stringify(value)}`,
    ]),
    source,
  ], { cwd: temporary, encoding: 'utf8', timeout: 120_000 });
  assert.ifError(result.error);
  const diagnostics = result.stdout + result.stderr;
  assert.deepEqual(readFileSync(source), before, 'Rendering must not change saved settings');
  if (errorPattern) {
    assert.match(diagnostics, /ERROR: Assertion/);
    assert.match(diagnostics, errorPattern);
    assert.notEqual(result.status, 0, diagnostics);
    assert.equal(existsSync(output), false, 'Invalid input must not produce an STL');
    assert.doesNotMatch(diagnostics, /WARNING:/);
    return;
  }
  assert.equal(result.status, 0, diagnostics);
  assert.doesNotMatch(diagnostics, /ERROR:|WARNING:|not a valid 2-manifold/i);
  return [...readFileSync(output, 'utf8').matchAll(
    /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi,
  )].map(match => match.slice(1).map(Number));
}

function checkBounds(mesh, expected, tolerance = 0.02) {
  mesh.bounds.flat().forEach((value, i) => {
    assert.ok(Math.abs(value - expected.flat()[i]) < tolerance,
      `Bound ${i}: expected ${expected.flat()[i]}, got ${value}`);
  });
}

function radialRange(mesh, z, center = [0, 0, 0]) {
  const radii = mesh.triangles.flat().filter(p => Math.abs(p[2] - center[2] - z) < 0.0001)
    .map(p => Math.hypot(p[0] - center[0], p[1] - center[1]));
  assert.ok(radii.length > 0, `Mesh must contain vertices at local Z=${z}`);
  return [Math.min(...radii), Math.max(...radii)];
}

function checkBase(mesh, settings = defaults, center = [0, 0, 0]) {
  const contains = (r, z) => mesh.contains([
    center[0] + r, center[1], center[2] + z,
  ]);
  const lower = settings.lower_bore_diameter / 2;
  const upper = settings.upper_bore_diameter / 2;
  const shoulder = settings.lower_bore_height;
  for (const [z, expected] of [
    [0, [lower, settings.flange_diameter / 2]],
    [settings.base_height, [upper, settings.collar_diameter / 2]],
  ]) {
    radialRange(mesh, z, center).forEach((radius, i) => {
      assert.ok(Math.abs(radius - expected[i]) < 0.001, `Base radius at Z=${z}`);
    });
  }
  const shoulderVertices = mesh.triangles.flat().filter(p =>
    Math.abs(Math.hypot(p[0] - center[0], p[1] - center[1]) - lower) < 0.0001);
  assert.ok(Math.abs(Math.max(...shoulderVertices.map(p => p[2] - center[2])) - shoulder) < 0.0001,
    'Measured bore shoulder height');
  for (const z of [0.1, shoulder - 0.1, shoulder + 0.1, settings.base_height - 0.1]) {
    assert.equal(contains(0, z), false, 'Base bore must pass through the full height');
    assert.equal(contains(lower - 0.15, z), false, 'Lower bore clearance');
    assert.equal(contains(upper + 0.15, z), true, 'Material outside the upper bore');
  }
  assert.equal(contains(lower + 0.15, shoulder - 0.1), true, 'Lower bore wall');
  assert.equal(contains(lower + 0.15, shoulder + 0.1), false, 'Bore shoulder');
  assert.equal(contains(upper - 0.15, settings.base_height - 0.1), false, 'Upper bore radius');
  const flangeSample = (settings.collar_diameter + settings.flange_diameter) / 4;
  assert.equal(contains(flangeSample, settings.flange_height - 0.1), true, 'Flange material');
  assert.equal(contains(flangeSample, settings.flange_height + 0.1), false, 'Flange height');
  assert.equal(contains(settings.collar_diameter / 2 - 0.15, settings.base_height - 0.1),
    true, 'Collar reaches the full base height');
}

function checkRing(mesh, settings = defaults, center = [0, 0, 0]) {
  radialRange(mesh, 0, center).forEach((radius, i) => {
    const expected = [settings.ring_inner_diameter, settings.ring_outer_diameter][i] / 2;
    // Translated ASCII STL coordinates have only six significant digits.
    assert.ok(Math.abs(radius - expected) < 0.001, 'Measured ring inside/outside radius');
  });
  for (const z of [0.1, settings.ring_height / 2, settings.ring_height - 0.1]) {
    const contains = r => mesh.contains([center[0] + r, center[1], center[2] + z]);
    assert.equal(contains(0), false, 'Ring opening must pass through the full height');
    assert.equal(contains(settings.ring_inner_diameter / 2 - 0.1), false, 'Ring bore');
    assert.equal(contains(settings.ring_inner_diameter / 2 + 0.1), true, 'Ring inner wall');
    assert.equal(contains(settings.ring_outer_diameter / 2 - 0.1), true, 'Ring outer wall');
    assert.equal(contains(settings.ring_outer_diameter / 2 + 0.1), false, 'Ring outside radius');
  }
}

function checkDome(mesh, settings = defaults, center = [0, 0, 0]) {
  const contains = (r, z) => mesh.contains([
    center[0] + r, center[1], center[2] + z,
  ]);
  const hole = settings.top_hole_diameter / 2;
  const outer = settings.dome_diameter / 2;
  const inner = settings.dome_inner_diameter / 2;
  const opening = settings.dome_opening_diameter / 2;
  const offset = settings.dome_opening_height;
  const outerHeight = settings.dome_height / Math.sqrt(1 - (hole / outer) ** 2);
  const innerTop = offset + settings.dome_inner_height * Math.sqrt(1 - (hole / inner) ** 2);
  for (const z of [0.1, offset + 0.1, innerTop - 0.2, innerTop + 0.2,
    settings.dome_height - 0.15]) {
    assert.equal(contains(0, z), false, 'Cavity and top hole must remain open');
    assert.equal(contains(hole - 0.15, z), false, 'Top hole clearance');
  }
  assert.equal(contains(hole + 0.15, innerTop + 0.2), true, 'Material around top hole');
  assert.equal(contains(opening - 0.15, 0.1), false, 'Bottom opening diameter');
  const ledge = (opening + inner) / 2;
  assert.equal(contains(ledge, offset - 0.1), true, 'Bottom ledge material');
  assert.equal(contains(ledge, offset + 0.1), false, 'Cavity expands above the bottom ledge');

  for (const z of [8, 16, 24, 32]) {
    const outerAtZ = outer * Math.sqrt(1 - (z / outerHeight) ** 2);
    const innerAtZ = inner * Math.sqrt(1 - ((z - offset) / settings.dome_inner_height) ** 2);
    assert.equal(contains(innerAtZ - 0.15, z), false, `Hollow cavity at Z=${z}`);
    assert.equal(contains(innerAtZ + 0.15, z), true, `Inner dome wall at Z=${z}`);
    assert.equal(contains(outerAtZ - 0.15, z), true, `Outer dome wall at Z=${z}`);
    assert.equal(contains(outerAtZ + 0.15, z), false, `Outer silhouette at Z=${z}`);
  }
}

function checkPrintLayout(vertices, settings = defaults) {
  const mesh = inspectMesh(vertices, 3);
  const domeX = settings.flange_diameter / 2 + settings.print_gap + settings.dome_diameter / 2;
  const ringX = domeX + settings.dome_diameter / 2 +
    settings.print_gap + settings.ring_outer_diameter / 2;
  const bodies = [
    { center: 0, radius: settings.flange_diameter / 2, height: settings.base_height,
      check: checkBase },
    { center: domeX, radius: settings.dome_diameter / 2, height: settings.dome_height,
      check: checkDome },
    { center: ringX, radius: settings.ring_outer_diameter / 2, height: settings.ring_height,
      check: checkRing },
  ].map(({ center, radius, height, check }) => {
    const body = inspectMesh(vertices.filter(p => Math.abs(p[0] - center) <= radius + 0.001));
    checkBounds(body, [[center - radius, -radius, 0], [center + radius, radius, height]], 0.05);
    check(body, settings, [center, 0, 0]);
    return body;
  });
  for (let i = 1; i < bodies.length; i++) {
    const gap = bodies[i].bounds[0][0] - bodies[i - 1].bounds[1][0];
    assert.ok(Math.abs(gap - settings.print_gap) < 0.02, 'Adaptive edge-to-edge print gap');
  }
  checkBounds(mesh, [[-settings.flange_diameter / 2, -settings.flange_diameter / 2, 0],
    [ringX + settings.ring_outer_diameter / 2, settings.flange_diameter / 2,
      Math.max(settings.base_height, settings.dome_height, settings.ring_height)]], 0.05);
}

test('chandelier default: three separate watertight bed-level parts with preserved features', t => {
  checkPrintLayout(render(t));
});

test('chandelier base: measured dimensions and stepped through-bore', t => {
  const mesh = inspectMesh(render(t, { part: 'base' }));
  checkBounds(mesh, [[-31.75, -31.75, 0], [31.75, 31.75, 30]]);
  checkBase(mesh);
});

test('chandelier ring: measured dimensions, thin wall, and independent bed-level export', t => {
  const mesh = inspectMesh(render(t, { part: 'ring', layout: 'source' }));
  checkBounds(mesh, [[-17.1, -17.1, 0], [17.1, 17.1, 1.8]]);
  checkRing(mesh);
});

test('chandelier dome: finished height, openings, cavity, and source cross-section fidelity', t => {
  const mesh = inspectMesh(render(t, { part: 'dome' }));
  checkBounds(mesh, [[-30, -30, 0], [30, 30, 41.2374]], 0.05);
  checkDome(mesh);

  // These radial/height samples come from the source STL, not the new model.
  const samples = [
    [30, 0], [29.7436, 5.465], [28.978, 10.838], [27.7166, 16.026],
    [25.9808, 20.939], [23.8006, 25.494], [21.2134, 29.613],
    [18.2628, 33.226], [15, 36.269], [11.4806, 38.692], [7.7646, 40.453],
    [27.225, 0], [27.503, 1.879], [27.2673, 6.446], [26.5656, 10.937],
    [25.4091, 15.273], [23.8181, 19.38], [21.8195, 23.187],
    [19.4473, 26.63], [16.7425, 29.649], [13.7514, 32.193],
    [10.5249, 34.218], [7.1181, 35.69],
  ];
  const segments = [];
  for (const triangle of mesh.triangles) {
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a[0] > 0 && b[0] > 0 && Math.abs(a[1]) < 1e-7 && Math.abs(b[1]) < 1e-7) {
        segments.push([[a[0], a[2]], [b[0], b[2]]]);
      }
    }
  }
  assert.ok(segments.length > 0, 'Rendered mesh must expose its radial cross-section');
  for (const point of samples) {
    const distance = Math.min(...segments.map(([a, b]) => {
      const delta = b.map((v, i) => v - a[i]);
      const lengthSquared = delta.reduce((sum, v) => sum + v * v, 0);
      const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
        delta.reduce((sum, v, i) => sum + v * (point[i] - a[i]), 0) / lengthSquared));
      return Math.hypot(...point.map((v, i) => v - a[i] - projection * delta[i]));
    }));
    assert.ok(distance < 0.15, `Source profile ${point}: surface distance ${distance} mm`);
  }
});

test('chandelier source layout: original positions and separate raised ring', t => {
  const vertices = render(t, { layout: 'source' });
  const mesh = inspectMesh(vertices, 3);
  checkBounds(mesh, [[-93, -75.9995, 0], [20.5, 28, 41.2374]], 0.05);
  const radial = (p, center) => Math.hypot(p[0] - center[0], p[1] - center[1]);
  const baseCenter = [-11.25, -44.2495, 0];
  const base = inspectMesh(vertices.filter(p =>
    radial(p, baseCenter) >= 17.101 && radial(p, baseCenter) <= 31.751));
  checkBounds(base, [[-43, -75.9995, 0], [20.5, -12.4995, 30]]);
  checkBase(base, defaults, baseCenter);
  const dome = inspectMesh(vertices.filter(p => radial(p, [-63, -2]) <= 30.001));
  checkBounds(dome, [[-93, -32, 0], [-33, 28, 41.2374]], 0.05);
  checkDome(dome, defaults, [-63, -2, 0]);
  const ring = inspectMesh(vertices.filter(p =>
    radial(p, [-11.25, -44.2495]) < 17.101 && p[2] > 1 && p[2] < 3));
  checkBounds(ring, [[-28.35, -61.3495, 1.1], [5.85, -27.1495, 2.9]]);
  checkRing(ring, defaults, [-11.25, -44.2495, 1.1]);
  assert.equal(mesh.contains([5.55, -44.2495, 1]), false, 'Ring is raised above the source bed');
  assert.equal(mesh.contains([5.55, -44.2495, 1.2]), true, 'Source ring starts at Z=1.1');
  const clearance = radialRange(base, 0, baseCenter)[0] -
    radialRange(ring, 0, [-11.25, -44.2495, 1.1])[1];
  assert.ok(Math.abs(clearance - 0.002) < 0.0002,
    `Preserve the measured 0.002 mm radial ring clearance, got ${clearance}`);
});

test('chandelier resized: dimensions, profile, and adaptive print spacing', t => {
  const settings = {
    flange_diameter: 76.2, flange_height: 5, collar_diameter: 50, base_height: 34,
    lower_bore_diameter: 42.2, lower_bore_height: 3.4, upper_bore_diameter: 44.2,
    ring_outer_diameter: 41.04, ring_inner_diameter: 39.6048, ring_height: 2.4,
    dome_diameter: 72, dome_height: 47, dome_inner_diameter: 66.0072,
    dome_inner_height: 40, dome_opening_height: 2.5, dome_opening_diameter: 65.34,
    top_hole_diameter: 14, print_gap: 7, radial_segments: 64, profile_segments: 32,
  };
  checkPrintLayout(render(t, settings), settings);
});

test('chandelier top-hole resizing preserves finished height and ignores unselected dimensions', t => {
  const settings = { ...defaults, top_hole_diameter: 12 };
  const mesh = inspectMesh(render(t, {
    part: 'dome', top_hole_diameter: 12, ring_height: -1, base_height: 0,
  }));
  checkBounds(mesh, [[-30, -30, 0], [30, 30, 41.2374]], 0.05);
  checkDome(mesh, settings);
  assert.ok(Math.abs(radialRange(mesh, settings.dome_height)[0] - 6) < 0.0001,
    'Measured top-hole radius after resizing');
});

test('chandelier equal opening/interior diameters produce a valid dome without a ledge', t => {
  const mesh = inspectMesh(render(t, { part: 'dome', dome_opening_diameter: 55.006 }));
  checkBounds(mesh, [[-30, -30, 0], [30, 30, 41.2374]], 0.05);
  assert.equal(mesh.contains([27.4, 0, 1]), false);
  assert.equal(mesh.contains([27.7, 0, 1]), true);
});

for (const [name, overrides, message] of [
  ['unknown part', { part: 'missing' }, /Unknown part/],
  ['unknown layout', { layout: 'assembly' }, /Unknown layout/],
  ['zero print gap', { print_gap: 0 }, /Print gap must be positive/],
  ['negative print gap', { print_gap: -1 }, /Print gap must be positive/],
  ['invalid radial resolution', { radial_segments: 23 }, /Radial segments must be an integer/],
  ['fractional profile resolution', { profile_segments: 8.5 }, /Profile segments must be an integer/],
  ['zero base height', { part: 'base', base_height: 0 }, /Base dimensions must be positive/],
  ['nonnumeric bore', { part: 'base', lower_bore_diameter: 'wide' }, /Base dimensions must be positive/],
  ['upper bore removes collar', { part: 'base', upper_bore_diameter: 41.5 }, /Base bores must satisfy/],
  ['reversed bore shoulder', { part: 'base', lower_bore_diameter: 37 }, /Base bores must satisfy/],
  ['invalid shoulder height', { part: 'base', lower_bore_height: 4 }, /Base heights must satisfy/],
  ['zero ring wall', { part: 'ring', ring_inner_diameter: 34.2 }, /Ring outside diameter must exceed/],
  ['negative ring height', { part: 'ring', ring_height: -1 }, /Ring dimensions must be positive/],
  ['oversized top hole', { part: 'dome', top_hole_diameter: 56 }, /Dome diameters must satisfy/],
  ['cavity exits dome top', { part: 'dome', dome_inner_height: 60 }, /Dome cavity must terminate below/],
  ['cavity crosses outer profile', {
    part: 'dome', dome_inner_diameter: 59.8, dome_inner_height: 39,
  }, /Dome wall must remain positive/],
]) {
  test(`chandelier rejects ${name}`, t => render(t, overrides, message));
}
