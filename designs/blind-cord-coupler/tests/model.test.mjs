import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  coupler_diameter: 15, floor_thickness: 3, hole_circle_diameter: 8.2,
  thin_cord_diameter: 1, pull_cord_diameter: 3, hole_clearance: 0.4,
  mouth_chamfer: 0.2, central_seat_height: 3, cover_height: 11.5,
  cover_top_thickness: 1.5, cavity_diameter: 10.8, thread_diameter: 13,
  thread_length: 3.6, thread_pitch: 1.2, thread_depth: 0.25,
  thread_clearance: 0.15, thread_axial_clearance: 0.2, minimum_wall: 0.8,
  print_gap: 4, radial_segments: 64,
};

function render(t, overrides = {}, { errorPattern, program, empty = false } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'blind-cord-coupler-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const output = join(temporary, 'coupler.stl');
  const before = readFileSync(source);
  const entry = program ? join(temporary, 'probe.scad') : source;
  if (program) writeFileSync(entry, `use <${source}>\n${program}\n`);
  const definitions = program ? { ...defaults, ...overrides } : overrides;
  const result = spawnSync(executable, [
    '-o', output, '--export-format', 'asciistl',
    ...Object.entries(definitions).flatMap(([key, value]) => ['-D', `${key}=${JSON.stringify(value)}`]),
    entry,
  ], {
    cwd: temporary, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, OPENSCADPATH: temporary },
  });
  assert.ifError(result.error);
  assert.deepEqual(readFileSync(source), before, 'Rendering must not change saved settings');
  const diagnostics = result.stdout + result.stderr;
  if (errorPattern) {
    assert.notEqual(result.status, 0, diagnostics);
    assert.match(diagnostics, /ERROR: Assertion/);
    assert.match(diagnostics, errorPattern);
    assert.doesNotMatch(diagnostics, /WARNING:/);
    assert.equal(existsSync(output), false, 'Invalid input must not produce an STL');
    return;
  }
  if (empty) {
    assert.equal(result.status, 1, diagnostics);
    assert.doesNotMatch(diagnostics, /ERROR:|WARNING:/);
    assert.match(diagnostics, /Current top level object is empty/);
    assert.equal(existsSync(output), false, 'Mating parts must have no solid interference');
    return;
  }
  assert.equal(result.status, 0, diagnostics);
  assert.doesNotMatch(diagnostics, /ERROR:|WARNING:|not a valid 2-manifold/i);
  return [...readFileSync(output, 'utf8').matchAll(
    /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi,
  )].map(match => match.slice(1).map(Number));
}

function checkBounds(mesh, expected) {
  mesh.bounds.flat().forEach((value, index) => {
    assert.ok(Math.abs(value - expected.flat()[index]) < 0.002,
      `Bound ${index}: expected ${expected.flat()[index]}, got ${value}`);
  });
}

function checkBody(mesh, s) {
  const radius = s.coupler_diameter / 2;
  const height = s.floor_thickness + Math.max(s.thread_length, s.central_seat_height);
  checkBounds(mesh, [[-radius, -radius, 0], [radius, radius, height]]);
  const holes = Array.from({ length: 6 }, (_, i) => [
    s.hole_circle_diameter / 2 * Math.cos(i * Math.PI / 3),
    s.hole_circle_diameter / 2 * Math.sin(i * Math.PI / 3),
    (s.thin_cord_diameter + s.hole_clearance) / 2, s.floor_thickness,
  ]);
  holes.push([0, 0, (s.pull_cord_diameter + s.hole_clearance) / 2,
    s.floor_thickness + s.central_seat_height]);
  const margin = 0.05;
  for (const [index, [x, y, bore, boreHeight]] of holes.entries()) {
    for (const z of [margin, boreHeight / 2, boreHeight - margin]) {
      assert.equal(mesh.contains([x, y, z]), false, `Hole ${index + 1} passes through its seat`);
      const mouth = bore + Math.max(0, s.mouth_chamfer - Math.min(z, boreHeight - z));
      for (let side = 0; side < 4; side++) {
        const angle = side * Math.PI / 2;
        for (const [delta, inside] of [[-margin, false], [margin, true]]) {
          assert.equal(mesh.contains([
            x + (mouth + delta) * Math.cos(angle),
            y + (mouth + delta) * Math.sin(angle), z,
          ]), inside, `Hole ${index + 1} radius, chamfers, and retaining material at Z=${z}`);
        }
      }
    }
    if (s.mouth_chamfer > 0) {
      const point = [x + bore + s.mouth_chamfer / 2, y];
      assert.equal(mesh.contains([...point, margin]), false, 'Entry mouth is chamfered');
      assert.equal(mesh.contains([...point, boreHeight - margin]), false, 'Knot mouth is chamfered');
      assert.equal(mesh.contains([...point, boreHeight / 2]), true, 'Retained straight bore');
    }
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i + 0.5) * Math.PI / 3;
    assert.equal(mesh.contains([
      s.hole_circle_diameter / 2 * Math.cos(angle),
      s.hole_circle_diameter / 2 * Math.sin(angle), s.floor_thickness / 2,
    ]), true, 'Material separates the six equally spaced radial holes');
    assert.equal(mesh.contains([
      holes[i][0], holes[i][1], s.floor_thickness + 0.2,
    ]), false, 'Each small knot has access to the chamber above the floor');
  }
  const pullMouth = (s.pull_cord_diameter + s.hole_clearance) / 2 + s.mouth_chamfer;
  if (s.central_seat_height > 0) {
    assert.equal(mesh.contains([
      pullMouth + s.minimum_wall / 2, 0, s.floor_thickness + s.central_seat_height / 2,
    ]), true, 'Raised central seat supports the large knot above the small knots');
  }
  const coreRadius = s.thread_diameter / 2 - s.thread_depth;
  for (const z of [s.floor_thickness + 0.2, height - 0.2]) {
    assert.equal(mesh.contains([s.cavity_diameter / 2 - 0.1, 0, z]), false,
      'Knot cavity remains hollow inside the threaded collar');
    assert.equal(mesh.contains([(s.cavity_diameter / 2 + coreRadius) / 2, 0, z]), true,
      'Thread roots have an attached continuous wall');
  }

  const threadVertices = mesh.triangles.flat().filter(([x, y, z]) =>
    x > 0 && Math.abs(y) < 0.0001 && z > s.floor_thickness + s.thread_pitch / 2
    && z < s.floor_thickness + s.thread_length - s.thread_pitch / 2
    && x >= coreRadius - 0.001);
  const radii = threadVertices.map(([x]) => x);
  assert.ok(Math.abs(Math.min(...radii) - coreRadius) < 0.002, 'Thread has actual roots');
  assert.ok(Math.abs(Math.max(...radii) - s.thread_diameter / 2) < 0.002,
    'Thread has actual crests, not a smooth collar');
}

function checkCover(mesh, s) {
  const radius = s.coupler_diameter / 2;
  checkBounds(mesh, [[-radius, -radius, 0], [radius, radius, s.cover_height]]);
  const chamberHeight = s.cover_height - s.cover_top_thickness;
  const atNative = (r, z) => mesh.contains([r, 0, s.cover_height - z]);
  for (const z of [0.05, s.thread_length / 2, chamberHeight - 0.1]) {
    assert.equal(atNative(0, z), false, 'Cover cavity is open up to the closed top');
    assert.equal(atNative(radius - 0.1, z), true, 'Cover has a continuous outside wall');
  }
  const cavityZ = (s.thread_length + s.thread_axial_clearance + chamberHeight) / 2;
  assert.equal(atNative(s.cavity_diameter / 2 - 0.1, cavityZ), false, 'Knot chamber diameter');
  assert.equal(atNative(s.cavity_diameter / 2 + 0.1, cavityZ), true, 'Material around knot chamber');
  for (const x of [0, s.hole_circle_diameter / 2, radius - 0.1]) {
    assert.equal(atNative(x, chamberHeight + 0.1), true, 'Closed cover conceals all seven knots');
    assert.equal(mesh.contains([x, 0, 0.05]), true, 'Flat closed top prints on the bed');
  }
  const pocketZ = s.thread_length + s.thread_axial_clearance / 2;
  assert.equal(atNative(s.thread_diameter / 2, pocketZ), false, 'Axial thread-tip clearance');
}

for (const [name, overrides] of [
  ['15 mm defaults', {}],
  ['resized cords and enclosure', {
    coupler_diameter: 20, floor_thickness: 3.5, hole_circle_diameter: 10.8,
    thin_cord_diameter: 1.5, pull_cord_diameter: 4, mouth_chamfer: 0.25,
    central_seat_height: 4, cover_height: 14, cover_top_thickness: 1.8,
    cavity_diameter: 14.6, thread_diameter: 17.4, thread_length: 4.8,
    thread_pitch: 1.6, thread_depth: 0.35, thread_clearance: 0.2,
    thread_axial_clearance: 0.3, minimum_wall: 1, print_gap: 6,
  }],
]) {
  test(`round covered coupler ${name}: two printable parts and seven radial bores`, t => {
    const vertices = render(t, overrides);
    const s = { ...defaults, ...overrides };
    const radius = s.coupler_diameter / 2;
    const coverX = s.coupler_diameter + s.print_gap;
    inspectMesh(vertices, 2);
    const body = inspectMesh(vertices.filter(([x]) => x < radius + 0.001));
    const cover = inspectMesh(vertices.filter(([x]) => x > coverX - radius - 0.001)
      .map(([x, y, z]) => [x - coverX, y, z]));
    checkBody(body, s);
    checkCover(cover, s);
    assert.ok(Math.abs(coverX + cover.bounds[0][0] - body.bounds[1][0] - s.print_gap) < 0.002,
      'Print layout maintains the requested edge-to-edge gap');
  });
}

test('round covered coupler exports an unchamfered body without the raised seat', t => {
  const overrides = { part: 'body', mouth_chamfer: 0, central_seat_height: 0 };
  checkBody(inspectMesh(render(t, overrides)), { ...defaults, ...overrides });
});

test('round covered coupler exports the cover alone with its closed top on the bed', t => {
  checkCover(inspectMesh(render(t, { part: 'cover' })), defaults);
});

test('round covered coupler assembled preview is 15 mm across with the knots enclosed', t => {
  const mesh = inspectMesh(render(t, { layout: 'assembled' }));
  checkBounds(mesh, [[-7.5, -7.5, 0], [7.5, 7.5, 14.5]]);
  assert.equal(mesh.contains([0, 0, 13.8]), true, 'Closed cover above the central knot');
  assert.equal(mesh.contains([0, 0, 8]), false, 'Headroom above the raised central seat');
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    assert.equal(mesh.contains([4.1 * Math.cos(angle), 4.1 * Math.sin(angle), 4]), false,
      'All six small knots are inside the assembled cavity');
  }
});

for (const turn of [0, 90]) {
  test(`round covered coupler threads have no interference at ${turn} degrees of unscrewing`, t => {
    render(t, {}, {
      empty: true,
      program: `intersection() {
        body();
        translate([0, 0, floor_thickness + thread_pitch * ${turn} / 360])
          rotate([0, 0, ${turn}]) cover();
        translate([-coupler_diameter, -coupler_diameter, floor_thickness + 0.02])
          cube([2 * coupler_diameter, 2 * coupler_diameter,
            thread_length + central_seat_height]);
      }`,
    });
  });
}

test('round covered coupler threads engage rather than forming a loose smooth socket', t => {
  const vertices = render(t, {}, {
    program: `intersection() {
      body();
      translate([0, 0, floor_thickness + thread_pitch / 2]) cover();
    }`,
  });
  assert.ok(vertices.length > 0, 'Incorrect half-pitch phase must intersect the real threads');
  assert.ok(vertices.every(([x, y]) =>
    Math.hypot(x, y) > defaults.thread_diameter / 2 - defaults.thread_depth - 0.01),
  'Deliberate interference occurs at the threads, not inside the knot chamber');
});

for (const [name, overrides, message] of [
  ['unknown part', { part: 'lid' }, /Part must be all, body, or cover/],
  ['unknown layout', { layout: 'source' }, /Layout must be print or assembled/],
  ['zero print gap', { print_gap: 0 }, /Print gap must be positive/],
  ['zero outside diameter', { coupler_diameter: 0 }, /Coupler diameter and floor thickness must be positive/],
  ['zero floor thickness', { floor_thickness: 0 }, /Coupler diameter and floor thickness must be positive/],
  ['zero thin-cord diameter', { thin_cord_diameter: 0 }, /Both cord diameters must be positive/],
  ['negative pull-cord diameter', { pull_cord_diameter: -1 }, /Both cord diameters must be positive/],
  ['negative clearance', { hole_clearance: -0.1 }, /Hole clearance must be nonnegative/],
  ['zero hole circle', { hole_circle_diameter: 0 }, /Hole circle diameter must be positive/],
  ['negative chamfer', { mouth_chamfer: -0.1 }, /Mouth chamfer must be nonnegative/],
  ['chamfers consuming the floor', { mouth_chamfer: 1.5 }, /leave a straight bore section/],
  ['zero minimum wall', { minimum_wall: 0 }, /Minimum wall must be positive/],
  ['low resolution', { radial_segments: 32 }, /multiple of four and at least 48/],
  ['non-cardinal resolution', { radial_segments: 50 }, /multiple of four and at least 48/],
  ['thin cover top', { cover_top_thickness: 0.5 }, /closed top must retain minimum_wall/],
  ['negative central seat', { central_seat_height: -1 }, /Central seat height must be nonnegative/],
  ['central seat entering the cover', { central_seat_height: 10 }, /below the cover ceiling/],
  ['zero thread pitch', { thread_pitch: 0 }, /Thread diameter, length, pitch, and depth must be positive/],
  ['negative radial thread clearance', { thread_clearance: -0.1 }, /Thread clearances must be nonnegative/],
  ['negative axial thread clearance', { thread_axial_clearance: -0.1 }, /Thread clearances must be nonnegative/],
  ['thread depth consuming crests', { thread_depth: 0.6 }, /less than half the pitch/],
  ['short thread', { thread_length: 2 }, /at least two full pitches/],
  ['thread socket entering the top', { cover_height: 5 }, /socket must end below the knot chamber ceiling/],
  ['thin male wall', { cavity_diameter: 12 }, /Male thread roots must retain minimum_wall/],
  ['thin cover wall', { thread_diameter: 14 }, /Cover must retain minimum_wall/],
  ['thin holes outside the chamber', { hole_circle_diameter: 10.5 }, /six thin-hole mouths must open inside/],
  ['thin holes entering the central hole', { hole_circle_diameter: 5 }, /minimum_wall around the central pull hole/],
  ['adjacent thin mouths too close', {
    coupler_diameter: 20, thread_diameter: 17, cavity_diameter: 14,
    thin_cord_diameter: 2.6, pull_cord_diameter: 0.5,
  }, /Adjacent thin holes must retain minimum_wall/],
  ['raised seat touching the thin mouths', {
    hole_clearance: 0, mouth_chamfer: 0, minimum_wall: 0.75, hole_circle_diameter: 5.5,
  }, /Raised central seat must not cover/],
]) {
  test(`round covered coupler rejects ${name}`, t => {
    render(t, overrides, { errorPattern: message });
  });
}
