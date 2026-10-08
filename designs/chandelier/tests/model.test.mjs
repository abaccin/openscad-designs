import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'chandelier.scad');
const library = resolve(root, '..', '..', 'include', 'BOSL2');
const configured = process.env.OPENSCAD || 'openscad';
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const defaults = {
  flange_diameter: 63.5, flange_height: 4, collar_diameter: 41.5, base_height: 30,
  lower_bore_diameter: 34.204, lower_bore_height: 2.998, upper_bore_diameter: 36.504,
  thread_pitch: 4, thread_depth: 1, thread_clearance: 0.25,
  thread_axial_clearance: 0.4, thread_chamfer: 0.25, minimum_wall: 1.2,
  dome_diameter: 60, dome_height: 41.2374, dome_inner_diameter: 55.006,
  dome_inner_height: 35, dome_inner_offset: 1.879,
  top_hole_diameter: 10, print_gap: 10, radial_segments: 128, profile_segments: 64,
};
const fast = { radial_segments: 48, profile_segments: 24 };
const resized = {
  ...defaults, ...fast,
  flange_diameter: 76.2, flange_height: 5, collar_diameter: 46, base_height: 30,
  lower_bore_diameter: 37, lower_bore_height: 3.4, upper_bore_diameter: 39,
  dome_diameter: 72, dome_height: 47, dome_inner_diameter: 66.0072,
  dome_inner_height: 40, dome_inner_offset: 2.5,
  top_hole_diameter: 14, thread_pitch: 5, thread_depth: 1.2,
  thread_clearance: 0.35, thread_axial_clearance: 0.6, print_gap: 7,
};

function render(t, overrides = {}, { errorPattern, program, empty = false } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'chandelier-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const output = join(temporary, 'chandelier.stl');
  const before = readFileSync(source);
  const entry = program ? join(temporary, 'probe.scad') : source;
  if (program) writeFileSync(entry, `use <${source}>\n${program}\n`);
  const result = spawnSync(executable, [
    '-o', output, '--export-format', 'asciistl',
    ...Object.entries(overrides).flatMap(([key, value]) => [
      '-D', `${key}=${JSON.stringify(value)}`,
    ]),
    entry,
  ], {
    cwd: temporary, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, OPENSCADPATH: temporary },
  });
  assert.ifError(result.error);
  const diagnostics = result.stdout + result.stderr;
  assert.deepEqual(readFileSync(source), before, 'Rendering must not change saved settings');
  if (empty) {
    assert.doesNotMatch(diagnostics, /ERROR:|WARNING:/);
    assert.match(diagnostics, /Current top level object is empty/);
    assert.equal(result.status, 1, diagnostics);
    assert.equal(existsSync(output), false, 'Mating poses must have no solid interference');
    return;
  }
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
    [settings.base_height, [
      upper, settings.collar_diameter / 2 - settings.thread_depth - settings.thread_chamfer,
    ]],
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
  const tipRadius = settings.collar_diameter / 2 - settings.thread_depth - settings.thread_chamfer;
  assert.equal(contains(tipRadius - 0.1, settings.base_height - 0.1),
    true, 'Root wall reaches the chamfered male tip');
  assert.ok(tipRadius - upper >= settings.minimum_wall, 'Minimum wall at the male lead-in');
}

function checkDome(mesh, settings = defaults, center = [0, 0, 0]) {
  const contains = (r, z) => mesh.contains([
    center[0] + r, center[1], center[2] + z,
  ]);
  const hole = settings.top_hole_diameter / 2;
  const outer = settings.dome_diameter / 2;
  const inner = settings.dome_inner_diameter / 2;
  const offset = settings.dome_inner_offset;
  const collarHeight = settings.base_height - settings.flange_height;
  const socketDepth = collarHeight + settings.thread_axial_clearance;
  const outerHeight = settings.dome_height / Math.sqrt(1 - (hole / outer) ** 2);
  const innerTop = offset + settings.dome_inner_height * Math.sqrt(1 - (hole / inner) ** 2);
  for (const z of [0.1, offset + 0.1, innerTop - 0.2, innerTop + 0.2,
    settings.dome_height - 0.15]) {
    assert.equal(contains(0, z), false, 'Cavity and top hole must remain open');
    assert.equal(contains(hole - 0.15, z), false, 'Top hole clearance');
  }
  assert.equal(contains(hole + 0.15, innerTop + 0.2), true, 'Material around top hole');
  const maskRadius = settings.collar_diameter / 2 /
    Math.cos(Math.PI / settings.radial_segments) + settings.thread_clearance;
  const rootRadius = settings.collar_diameter / 2 - settings.thread_depth;
  assert.equal(contains(rootRadius - 0.1, 0.1), false, 'Threaded bottom opening remains open');
  for (const z of [2, collarHeight / 2, collarHeight - 0.5]) {
    assert.equal(contains(rootRadius - 0.1, z), false, 'Socket must accept the cylinder core');
    assert.equal(contains(maskRadius + 0.15, z), true, 'Socket is integrated into the dome');
  }
  const tipZ = collarHeight + settings.thread_axial_clearance / 2;
  assert.equal(contains(settings.collar_diameter / 2, tipZ), false, 'Tip pocket axial clearance');
  assert.equal(contains(maskRadius + 0.15, tipZ), true, 'Material surrounds the tip pocket');
  const transitionZ = socketDepth + 0.15;
  const transitionRadius = inner * Math.sqrt(1 -
    ((transitionZ - offset) / settings.dome_inner_height) ** 2);
  assert.equal(contains(Math.max(maskRadius, transitionRadius) + 0.15, transitionZ), true,
    'Socket transitions into the retained upper cavity');

  for (const z of [socketDepth + 0.5, (socketDepth + innerTop) / 2, innerTop - 0.3]) {
    const outerAtZ = outer * Math.sqrt(1 - (z / outerHeight) ** 2);
    const innerAtZ = inner * Math.sqrt(1 - ((z - offset) / settings.dome_inner_height) ** 2);
    assert.equal(contains(innerAtZ - 0.15, z), false, `Hollow cavity at Z=${z}`);
    assert.equal(contains(innerAtZ + 0.15, z), true, `Inner dome wall at Z=${z}`);
    assert.equal(contains(outerAtZ - 0.15, z), true, `Outer dome wall at Z=${z}`);
    assert.equal(contains(outerAtZ + 0.15, z), false, `Outer silhouette at Z=${z}`);
  }
}

function checkPrintLayout(vertices, settings = defaults) {
  const mesh = inspectMesh(vertices, 2);
  const domeX = settings.flange_diameter / 2 + settings.print_gap + settings.dome_diameter / 2;
  const bodies = [
    { center: 0, radius: settings.flange_diameter / 2, height: settings.base_height,
      check: checkBase },
    { center: domeX, radius: settings.dome_diameter / 2, height: settings.dome_height,
      check: checkDome },
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
    [domeX + settings.dome_diameter / 2, settings.flange_diameter / 2,
      Math.max(settings.base_height, settings.dome_height)]], 0.05);
  checkThreadPair(bodies[0], bodies[1], settings, [0, 0, 0], [domeX, 0, 0]);
}

function positiveXCrossings(mesh, z, center = [0, 0, 0]) {
  const hits = [];
  for (const [a, b, c] of mesh.triangles) {
    const by = b[1] - a[1], bz = b[2] - a[2];
    const cy = c[1] - a[1], cz = c[2] - a[2];
    const determinant = by * cz - bz * cy;
    if (Math.abs(determinant) < 1e-9) continue;
    const y = center[1] - a[1], height = z + center[2] - a[2];
    const u = (y * cz - height * cy) / determinant;
    const v = (by * height - bz * y) / determinant;
    if (u < -1e-8 || v < -1e-8 || u + v > 1 + 1e-8) continue;
    const x = a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]) - center[0];
    if (x > 0) hits.push(x);
  }
  assert.ok(hits.length > 0, `Positive X ray must cross the mesh at Z=${z}`);
  return hits.sort((a, b) => a - b);
}

function checkThreadPair(male, female, settings = defaults,
  maleCenter = [0, 0, 0], femaleCenter = [0, 0, 0]) {
  const samples = [];
  const start = (settings.base_height - settings.flange_height - 2 * settings.thread_pitch) / 2 +
    0.137;
  const compensation = settings.collar_diameter / 2 *
    (1 / Math.cos(Math.PI / settings.radial_segments) - 1);
  for (let i = 0; i < 16; i++) {
    const z = start + i * settings.thread_pitch / 16;
    const outer = positiveXCrossings(male, z + settings.flange_height, maleCenter).at(-1);
    const next = positiveXCrossings(male, z + settings.flange_height + settings.thread_pitch,
      maleCenter).at(-1);
    const bore = positiveXCrossings(female, z, femaleCenter)[0];
    assert.ok(Math.abs(outer - next) < 0.002, 'Measured helix repeats at the specified coarse pitch');
    assert.ok(Math.abs(bore - outer - settings.thread_clearance - compensation) < 0.01,
      `Measured radial thread clearance at Z=${z}: ${bore - outer}`);
    samples.push(outer);
  }
  assert.ok(Math.abs(Math.max(...samples) - settings.collar_diameter / 2) < 0.01,
    'Male thread crests retain the major diameter');
  assert.ok(Math.abs(Math.min(...samples) -
    (settings.collar_diameter / 2 - settings.thread_depth)) < 0.01,
    'Measured crest-to-root depth must produce an actual thread, not a smooth bore');
}

function collisionProgram(settings, angles, followHelix) {
  return `
    for (i = [0 : ${angles.length - 1}]) {
      angles = ${JSON.stringify(angles)};
      angle = angles[i];
      separation = ${followHelix ? `angle * ${settings.thread_pitch} / 360` : '0'};
      translate([i * 100, 0, 0])
        intersection() {
          base();
          translate([0, 0, ${settings.flange_height} + separation])
            rotate([0, 0, angle]) dome();
          // Exclude the intended planar flange/rim contact, not the threads.
          translate([-${settings.flange_diameter}, -${settings.flange_diameter},
            ${settings.flange_height} + 0.01])
            cube([${2 * settings.flange_diameter}, ${2 * settings.flange_diameter},
              ${settings.base_height + settings.dome_height}]);
        }
    }`;
}

test('chandelier bundles every transitive BOSL2 include and its license', () => {
  const pending = [join(library, 'std.scad'), join(library, 'threading.scad')];
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    assert.ok(file.startsWith(`${library}${sep}`), `Dependency must stay inside the bundle: ${file}`);
    assert.ok(existsSync(file), `Bundled dependency must exist: ${file}`);
    for (const match of readFileSync(file, 'utf8').matchAll(
      /^\s*(?:include|use)\s*<([^>]+)>/gm,
    )) {
      pending.push(resolve(dirname(file), match[1]));
    }
  }
  assert.match(readFileSync(join(library, 'LICENSE'), 'utf8'), /BSD 2-Clause License/);
});

test('chandelier default: two watertight printable parts with matched coarse threads', t => {
  checkPrintLayout(render(t));
});

test('chandelier base: measured dimensions and stepped through-bore', t => {
  const mesh = inspectMesh(render(t, { ...fast, part: 'base' }));
  checkBounds(mesh, [[-31.75, -31.75, 0], [31.75, 31.75, 30]]);
  checkBase(mesh);
});

test('chandelier dome: socket, finished height, upper cavity, and preserved outer profile', t => {
  const mesh = inspectMesh(render(t, { ...fast, part: 'dome' }));
  checkBounds(mesh, [[-30, -30, 0], [30, 30, 41.2374]], 0.05);
  checkDome(mesh, { ...defaults, ...fast });

  // These radial/height samples come from the source STL, not the new model.
  const samples = [
    [30, 0], [29.7436, 5.465], [28.978, 10.838], [27.7166, 16.026],
    [25.9808, 20.939], [23.8006, 25.494], [21.2134, 29.613],
    [18.2628, 33.226], [15, 36.269], [11.4806, 38.692], [7.7646, 40.453],
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

test('chandelier source layout: reference positions without a separate ring', t => {
  const settings = { ...defaults, ...fast };
  const vertices = render(t, { ...fast, layout: 'source' });
  const mesh = inspectMesh(vertices, 2);
  checkBounds(mesh, [[-93, -75.9995, 0], [20.5, 28, 41.2374]], 0.05);
  const radial = (p, center) => Math.hypot(p[0] - center[0], p[1] - center[1]);
  const baseCenter = [-11.25, -44.2495, 0];
  const base = inspectMesh(vertices.filter(p => radial(p, baseCenter) <= 31.751));
  checkBounds(base, [[-43, -75.9995, 0], [20.5, -12.4995, 30]]);
  checkBase(base, settings, baseCenter);
  const dome = inspectMesh(vertices.filter(p => radial(p, [-63, -2]) <= 30.001));
  checkBounds(dome, [[-93, -32, 0], [-33, 28, 41.2374]], 0.05);
  checkDome(dome, settings, [-63, -2, 0]);
  assert.equal(mesh.contains([5.55, -44.2495, 1.2]), false, 'The original ring is removed');
  checkThreadPair(base, dome, settings, baseCenter, [-63, -2, 0]);
});

test('chandelier resized: dimensions, profile, and adaptive print spacing', t => {
  checkPrintLayout(render(t, resized), resized);
});

test('chandelier shorter calibration joint retains compatible bed-level threaded parts', t => {
  const settings = { ...defaults, ...fast, base_height: 16 };
  checkPrintLayout(render(t, settings), settings);
});

test('chandelier top-hole resizing preserves the finished height and threaded opening', t => {
  const settings = { ...defaults, ...fast, top_hole_diameter: 12 };
  const mesh = inspectMesh(render(t, {
    ...fast, part: 'dome', top_hole_diameter: 12,
  }));
  checkBounds(mesh, [[-30, -30, 0], [30, 30, 41.2374]], 0.05);
  checkDome(mesh, settings);
  assert.ok(Math.abs(radialRange(mesh, settings.dome_height)[0] - 6) < 0.0001,
    'Measured top-hole radius after resizing');
});

test('chandelier assembled preview seats the dome on the flange', t => {
  const mesh = inspectMesh(render(t, { ...fast, layout: 'assembled' }));
  checkBounds(mesh, [[-31.75, -31.75, 0], [31.75, 31.75, 45.2374]], 0.05);
  for (const z of [0.1, 4.1, 29.9, 45.1]) {
    assert.equal(mesh.contains([0, 0, z]), false, 'Assembled through-opening remains clear');
  }
});

test('chandelier threads mate without interference while seated and partially unscrewed', t => {
  render(t, fast, {
    program: collisionProgram(defaults, [0, 30, 90, 180, 360, 720], true),
    empty: true,
  });
});

test('chandelier resized threads retain matching advance and adjustable clearance', t => {
  render(t, resized, {
    program: collisionProgram(resized, [0, 60, 180], true),
    empty: true,
  });
});

test('chandelier misphased threads interfere rather than behaving as a loose smooth socket', t => {
  const vertices = render(t, fast, {
    program: collisionProgram(defaults, [180], false),
  });
  let volume = 0;
  for (let i = 0; i < vertices.length; i += 3) {
    const [a, b, c] = vertices.slice(i, i + 3);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) +
      a[1] * (b[2] * c[0] - b[0] * c[2]) +
      a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  assert.ok(Math.abs(volume) > 5, 'A half-turn without axial advance must produce real interference');
});

for (const [name, overrides, message] of [
  ['unknown part', { part: 'missing' }, /Unknown part/],
  ['removed ring selection', { part: 'ring' }, /Unknown part/],
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
  ['zero pitch', { part: 'base', thread_pitch: 0 }, /Connection dimensions must be positive/],
  ['negative thread clearance', { part: 'dome', thread_clearance: -0.1 },
    /Thread clearances and chamfer must be nonnegative/],
  ['nonnumeric clearance', { part: 'dome', thread_clearance: 'loose' },
    /Thread clearances and chamfer must be nonnegative/],
  ['negative axial clearance', { part: 'dome', thread_axial_clearance: -0.1 },
    /Thread clearances and chamfer must be nonnegative/],
  ['overdeep thread', { part: 'base', thread_depth: 2 }, /Thread depth must be less than half/],
  ['too few turns', { part: 'base', thread_pitch: 13 }, /Collar must accommodate/],
  ['thin male root wall', { part: 'base', thread_depth: 1.4 }, /Thread roots and male lead-in/],
  ['oversized chamfer', { part: 'base', thread_chamfer: 1.1 }, /Thread chamfer must not exceed/],
  ['thin socket wall', { part: 'dome', dome_diameter: 56 }, /Dome must retain the minimum wall/],
  ['oversized top hole', { part: 'dome', top_hole_diameter: 56 }, /Dome diameters must satisfy/],
  ['cavity exits dome top', { part: 'dome', dome_inner_height: 60 }, /Dome cavity must terminate below/],
  ['upper cavity crosses outer profile', {
    part: 'dome', dome_inner_diameter: 59.8, dome_inner_height: 39.8,
  }, /Dome wall must remain positive/],
  ['socket exits upper cavity', { part: 'dome', thread_axial_clearance: 11 },
    /Threaded socket and axial clearance must end below/],
  ['socket below cavity offset', {
    part: 'dome', base_height: 5, thread_pitch: 0.1, thread_depth: 0.04, thread_chamfer: 0,
  }, /Threaded socket must reach the upper cavity/],
]) {
  test(`chandelier rejects ${name}`, t => render(t, overrides, { errorPattern: message }));
}
