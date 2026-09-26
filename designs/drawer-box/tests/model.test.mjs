import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configured = process.env.OPENSCAD || 'openscad';
// Bypass the Windows console wrapper so timeouts terminate the actual renderer.
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const temporary = mkdtempSync(join(tmpdir(), 'drawer-box-test-'));
let sequence = 0;
after(() => rmSync(temporary, { recursive: true, force: true }));

// Regression fixtures must not depend on the user's saved Customizer settings.
const historicalSettings = {
  itemsShown: 'both', colorShown: 'all', withColorInlay: false,
  boxColor: 'white', lidColor: 'white', robotColor: 'black', logoColor: 'black', textColor: 'green',
  boxLength: 160, boxWidth: 95, boxHeight: 50, cornerRadius: 5,
  wallThickness: 1, bottomThickness: 2,
  dividerCountX: 0, dividerCountY: 0, dividerHeight: 25, dividerThickness: 1.2,
  compartmentSizesX: [], compartmentSizesY: [],
  withStacking: true, stackingDepth: 3, stackingClearance: 0.25,
  withLid: false, lidStyle: 'sliding', lidThickness: 2, lidClearance: 0.2, withNotch: true,
  magneticLidThickness: 5, magnetDiameter: 3, magnetThickness: 3,
  magnetPocketClearance: 0.1, magnetRecess: 0.1, magneticLidClearance: 0.3,
  magneticLidLocatorDepth: 2, magneticLidLipThickness: 1.2,
  pullLedges: 'both', pullWidth: 30, pullProjection: 6, pullThickness: 3, pullTopOffset: 8,
  withLidArtwork: true, lidArtworkFile: 'robot-relief.svg', lidArtworkDepth: 0.5,
  lidArtworkMargin: 8, lidArtworkLineGrowth: 0.2, lidArtworkAspect: 939 / 453,
  withLidLogo: true, lidLogoFile: 'ab-logo-monochrome.svg',
  lidLogoSize: 12, lidLogoDepth: 0.5, lidLogoMargin: 4,
  withLidText: false, lidText: 'Tools', lidTextFont: 'Liberation Sans:style=Bold',
  lidTextSize: 8, lidTextDepth: 0.5, lidTextBandHeight: 20, lidTextMargin: 4,
  lidTextPositionX: undefined, lidTextPositionY: undefined, internalClearance: 0.5,
};
const slidingSettings = {
  wallThickness: 2.5, slidingSkirtDepth: 6, slidingSkirtThickness: 1.4,
  slidingRailDepth: 0.4, slidingVerticalClearance: 0.2, slidingFloorRadius: 2,
  slidingEdgeChamfer: 0.5, withSlidingGrip: true,
  slidingGripProjection: 0.8, withSlidingLock: true, slidingLockInterference: 0.2,
};

function run(settings, extension = 'stl', body, { previewFirst = false } = {}) {
  const output = join(temporary, `${sequence++}.${extension}`);
  const args = [];
  const preview = `${output}.png`;
  if (previewFirst) {
    assert.equal(extension, 'stl');
    // Both exports must share a process to exercise the F5 render() cache in F6.
    args.push('-o', preview, '--imgsize=128,128', '--viewall', '--autocenter');
  }
  args.push('-o', output);
  // --export-format applies to every output, so it would turn the PNG into an STL.
  if (extension === 'stl' && !previewFirst) args.push('--export-format', 'asciistl');
  const activeSliding = (settings.withLid ?? historicalSettings.withLid)
    && (settings.lidStyle ?? historicalSettings.lidStyle) === 'sliding';
  const fixtureSettings = {
    ...slidingSettings, ...historicalSettings,
    ...(activeSliding ? slidingSettings : {}), ...settings,
  };
  for (const [name, value] of Object.entries(fixtureSettings)) {
    args.push('-D', `${name}=${value === undefined ? 'undef' : JSON.stringify(value)}`);
  }
  let source = join(root, 'round_box_drawer.scad');
  if (body) {
    source = join(temporary, `${sequence}-fixture.scad`);
    writeFileSync(source, `include <round_box_drawer.scad>\n${body}\n`);
  }
  args.push(source);
  const result = spawnSync(executable, args, {
    cwd: root, encoding: 'utf8', timeout: 600_000, maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, OPENSCADPATH: [root, process.env.OPENSCADPATH].filter(Boolean).join(delimiter) },
  });
  assert.ifError(result.error);
  if (previewFirst) {
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual([...readFileSync(preview).subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10], 'The first export must produce an F5 preview PNG');
  }
  return { ...result, output, log: result.stdout + result.stderr };
}

function render(settings = {}, expectedShells = 1, body, options) {
  const result = run({ itemsShown: 'box', ...settings }, 'stl', body, options);
  assert.equal(result.status, 0, result.log);
  assert.doesNotMatch(result.log, /ERROR:|WARNING:|not a valid 2-manifold/i);
  const data = readFileSync(result.output);
  let vertices = [];
  // Mixed PNG/STL exports use the version's default STL format.
  if (data.length >= 84 && data.length === 84 + 50 * data.readUInt32LE(80)) {
    for (let offset = 84; offset < data.length; offset += 50) {
      for (let vertex = 0; vertex < 3; vertex++) {
        vertices.push([0, 1, 2].map(axis => data.readFloatLE(offset + 12 + vertex * 12 + axis * 4)));
      }
    }
  } else {
    vertices = [...data.toString('utf8').matchAll(
      /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi,
    )].map(match => match.slice(1).map(Number));
  }
  return inspectMesh(vertices, expectedShells);
}

function near(actual, expected, tolerance = 0.03) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} must be near ${expected}`);
}

function assertEmpty(result, context) {
  assert.doesNotMatch(result.log, /ERROR:/, context);
  if (!/Current top level object is empty/.test(result.log)) {
    const stl = readFileSync(result.output, 'utf8');
    // CGAL may retain isolated contact vertices, but no printable facets.
    assert.doesNotMatch(stl, /facet normal/, `${context}: ${stl.slice(0, 1600)}`);
    assert.match(result.log, /Facets:\s+0/);
  } else {
    assert.doesNotMatch(result.log, /WARNING:/, context);
  }
}

test('default box remains undivided with the original floor, base, and ledges', () => {
  const mesh = render();
  mesh.bounds[1].forEach((v, i) => near(v, [160, 95, 50][i]));
  assert.equal(mesh.contains([80, 47.5, 4.9]), true);
  assert.equal(mesh.contains([80, 47.5, 5.1]), false);
  assert.equal(mesh.contains([4, 47.5, 41]), true);
  assert.equal(mesh.contains([0.5, 47.5, 1]), false);
});

test('equal grid makes six clear compartments with specified wall thickness and height', () => {
  const mesh = render({ dividerCountX: 2, dividerCountY: 1 });
  const sizeX = (158 - 2 * 1.2) / 3, sizeY = (93 - 1.2) / 2;
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 2; y++) {
      assert.equal(mesh.contains([1 + sizeX / 2 + x * (sizeX + 1.2),
        1 + sizeY / 2 + y * (sizeY + 1.2), 15]), false);
    }
  }
  for (const x of [1 + sizeX, 1 + 2 * sizeX + 1.2]) {
    assert.equal(mesh.contains([x - 0.1, 20, 15]), false);
    assert.equal(mesh.contains([x + 0.6, 20, 29.9]), true);
    assert.equal(mesh.contains([x + 0.6, 20, 30.1]), false);
    assert.equal(mesh.contains([x + 1.3, 20, 15]), false);
  }
  assert.equal(mesh.contains([80, 47.5, 15]), true);
});

test('custom sizes preserve clear measurements and allocate the final remainder', () => {
  const mesh = render({ dividerCountX: 2, dividerCountY: 1,
    compartmentSizesX: [40, 55], compartmentSizesY: [30] });
  for (const x of [41, 97.2]) {
    assert.equal(mesh.contains([x - 0.1, 20, 15]), false);
    assert.equal(mesh.contains([x + 0.6, 20, 15]), true);
    assert.equal(mesh.contains([x + 1.3, 20, 15]), false);
  }
  assert.equal(mesh.contains([80, 31.6, 15]), true);
  for (const x of [21, 69.7, 128.7]) {
    for (const y of [16, 62.1]) assert.equal(mesh.contains([x, y, 15]), false);
  }
});

for (const [axis, span, thickness, sizes, expected] of [
  ['X', 158, 1.2, [], Array(6).fill(152 / 6)],
  ['X', 158, 1.2, [40], [40, 22.4, 22.4, 22.4, 22.4, 22.4]],
  ['X', 158, 1.2, [40, 30], [40, 30, 20.5, 20.5, 20.5, 20.5]],
  ['X', 158, 1.2, [40, 30, 20, 15], [40, 30, 20, 15, 23.5, 23.5]],
  ['X', 158, 1.2, [40, 30, 20, 15, 10], [40, 30, 20, 15, 10, 37]],
  ['Y', 93, 1.2, [], Array(6).fill(14.5)],
  ['Y', 93, 1.2, [20], [20, 13.4, 13.4, 13.4, 13.4, 13.4]],
  ['Y', 93, 1.2, [20, 15], [20, 15, 13, 13, 13, 13]],
  ['Y', 93, 1.2, [20, 15, 10, 8], [20, 15, 10, 8, 17, 17]],
  ['Y', 93, 1.2, [20, 15, 10, 8, 7], [20, 15, 10, 8, 7, 27]],
  ['X', 176.8, 2.4, [35, 25], [35, 25, 26.2, 26.2, 26.2, 26.2]],
  ['Y', 106.8, 2.4, [10, 20], [10, 20, 16.2, 16.2, 16.2, 16.2]],
  ['X', 158, 1.2, [151.95], [151.95, 0.01, 0.01, 0.01, 0.01, 0.01]],
  ['Y', 93, 1.2, [86.95], [86.95, 0.01, 0.01, 0.01, 0.01, 0.01]],
]) {
  test(`compartment sizes along ${axis} preserve ${JSON.stringify(sizes)} within ${span} mm`, () => {
    let offset = 0;
    const expectedPositions = expected.slice(0, -1).map(size => {
      const position = offset + size;
      offset = position + thickness;
      return position;
    });
    const result = run({ itemsShown: 'lid' }, 'csg', `
      positions=dividerPositions(${span},5,${thickness},${JSON.stringify(sizes)},"${axis}");
      expectedPositions=${JSON.stringify(expectedPositions)};
      expectedSizes=${JSON.stringify(expected)};
      assert(len(positions)==5);
      for (i=[0:4]) assert(abs(positions[i]-expectedPositions[i])<1e-8);
      actualSizes=concat([positions[0]],
        [for (i=[1:4]) positions[i]-positions[i-1]-${thickness}],
        [${span}-positions[4]-${thickness}]);
      assert(len(actualSizes)==6);
      for (i=[0:5]) assert(abs(actualSizes[i]-expectedSizes[i])<1e-8);
      assert(abs(sizeSum(actualSizes,6)+5*${thickness}-${span})<1e-8);
    `);
    assert.equal(result.status, 0, result.log);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/i);
  });
}

test('compartment sizes with zero dividers produce no wall positions on either axis', () => {
  const result = run({ itemsShown: 'lid' }, 'csg', `
    assert(dividerPositions(158,0,1.2,[],"X")==[]);
    assert(dividerPositions(93,0,1.2,[],"Y")==[]);
  `);
  assert.equal(result.status, 0, result.log);
  assert.doesNotMatch(result.log, /ERROR:|WARNING:/i);
});

for (const [sizesX, sizesY, expectedX, expectedY] of [
  [[40], [20, 15], [40, 22.4, 22.4, 22.4, 22.4, 22.4], [20, 15, 13, 13, 13, 13]],
  [[40, 30], [20], [40, 30, 20.5, 20.5, 20.5, 20.5], [20, 13.4, 13.4, 13.4, 13.4, 13.4]],
]) {
  test(`partial grid preserves ${sizesX.length} X and ${sizesY.length} Y sizes and fills the remainder`, () => {
    const mesh = render({ dividerCountX: 5, dividerCountY: 5,
      compartmentSizesX: sizesX, compartmentSizesY: sizesY });
    const centers = [expectedX, expectedY].map((sizes, axis) => {
      let start = 1;
      return sizes.map((size, i) => {
        const center = start + size / 2;
        const face = start + size;
        if (i < sizes.length - 1) {
          const point = coordinate => axis === 0
            ? [coordinate, 1 + expectedY[0] / 2, 15]
            : [1 + expectedX[0] / 2, coordinate, 15];
          assert.equal(mesh.contains(point(face - 0.1)), false);
          assert.equal(mesh.contains(point(face + 0.6)), true);
          assert.equal(mesh.contains(point(face + 1.3)), false);
        }
        start = face + 1.2;
        return center;
      });
    });
    for (const x of centers[0]) {
      for (const y of centers[1]) assert.equal(mesh.contains([x, y, 15]), false);
    }
  });
}

for (const [name, settings, floor, height, point] of [
  ['stacking', { dividerCountX: 1 }, 5, 41.5, [80, 20]],
  ['sliding plate', { withLid: true, dividerCountY: 1 }, 2, 45.5, [80, 47.5]],
  ['flat full-height box', { withStacking: false, dividerCountX: 1 }, 2, 48, [80, 20]],
]) {
  test(`dividers respect the exact maximum height for ${name}`, () => {
    const mesh = render({ ...settings, dividerHeight: height, pullLedges: 'none' });
    assert.equal(mesh.contains([...point, floor + height - 0.1]), true);
    assert.equal(mesh.contains([...point, floor + height + 0.1]), false);
  });
}

test('near-corner divisions stay within the rounded shell and fuse to the floor', () => {
  const mesh = render({ dividerCountX: 1, compartmentSizesX: [0.1] });
  assert.equal(mesh.contains([1.7, 20, 15]), true);
  assert.equal(mesh.contains([1.7, 0.1, 15]), false);
});

test('divider thickness and raised-floor height follow non-default settings', () => {
  const mesh = render({ dividerCountX: 1, dividerThickness: 2.4, dividerHeight: 12,
    bottomThickness: 3, stackingDepth: 4 });
  assert.equal(mesh.contains([78.7, 20, 10]), false);
  assert.equal(mesh.contains([78.9, 20, 10]), true);
  assert.equal(mesh.contains([81.1, 20, 18.9]), true);
  assert.equal(mesh.contains([81.3, 20, 10]), false);
  assert.equal(mesh.contains([80, 20, 19.1]), false);
});

const lidSettings = { withLid: true, itemsShown: 'lid' };

test('personal logo engraves the correct depth and preserves transparent letter cutouts', () => {
  const mesh = render({ ...lidSettings, withLidArtwork: false });
  const logoPoint = (x, y, z) => [10 + (x - 50) * 12 / 89, -52.5 - (50 - y) * 12 / 89, z];
  assert.equal(mesh.contains(logoPoint(16, 40, 0.25)), false);
  assert.equal(mesh.contains(logoPoint(16, 40, 0.75)), true);
  assert.equal(mesh.contains(logoPoint(30, 30, 0.25)), true);
  mesh.bounds[0].forEach((v, i) => near(v, [0, -100.8, 0][i]));
  mesh.bounds[1].forEach((v, i) => near(v, [160, -4.2, 8][i]));
});

test('both engravings share the lid without overlap or through-holes', () => {
  const mesh = render(lidSettings);
  const engraved = mesh.triangles.filter(triangle => triangle.every(v => Math.abs(v[2] - 0.5) < 1e-5));
  const logo = engraved.filter(triangle => triangle.every(v => v[0] < 20));
  const robot = engraved.filter(triangle => triangle.every(v => v[0] > 20));
  assert.ok(logo.length > 0 && robot.length > 0, 'Both SVGs must actually be engraved');
  for (const triangle of logo) for (const vertex of triangle) {
    assert.ok(vertex[0] >= 3.99 && vertex[0] <= 16.01);
  }
  for (const triangle of robot) for (const vertex of triangle) assert.ok(vertex[0] >= 27.9);
  assert.equal(mesh.contains([10, -52.5, 1]), true);
  assert.equal(mesh.contains([80, -52.5, 1]), true);
});

test('disabled engravings do not import their SVGs', () => {
  const mesh = render({ ...lidSettings, withLidArtwork: false, withLidLogo: false,
    lidArtworkFile: 'missing-robot.svg', lidLogoFile: 'missing-logo.svg' });
  assert.equal(mesh.contains([10, -52.5, 0.25]), true);
  assert.equal(mesh.contains([80, -52.5, 0.25]), true);
});

test('logo size and depth are independently parametric', () => {
  const mesh = render({ ...lidSettings, withLidArtwork: false, lidLogoSize: 18, lidLogoDepth: 0.8 });
  const engraved = mesh.triangles.filter(t => t.every(v => Math.abs(v[2] - 0.8) < 1e-5)).flat();
  assert.ok(engraved.length > 0);
  near(Math.min(...engraved.map(v => v[0])), 4);
  near(Math.max(...engraved.map(v => v[0])), 22);
});

const invalid = [
  [{ dividerCountX: -1 }, /dividerCountX must be a nonnegative integer/],
  [{ dividerCountY: 1.5 }, /dividerCountY must be a nonnegative integer/],
  [{ dividerCountX: '2' }, /dividerCountX must be a nonnegative integer/],
  [{ compartmentSizesX: [20] }, /at most 0 clear sizes/],
  [{ compartmentSizesY: [20] }, /at most 0 clear sizes/],
  [{ dividerCountX: 2, compartmentSizesX: [40, 30, 20] }, /at most 2 clear sizes/],
  [{ dividerCountY: 2, compartmentSizesY: [20, 15, 10] }, /at most 2 clear sizes/],
  [{ dividerCountX: 5, compartmentSizesX: 40 }, /must be a list/],
  [{ dividerCountY: 1, compartmentSizesY: 30 }, /must be a list/],
  [{ dividerCountY: 1, compartmentSizesY: [0] }, /positive numbers/],
  [{ dividerCountX: 1, compartmentSizesX: ['40'] }, /positive numbers/],
  [{ dividerCountX: 5, compartmentSizesX: [40, 0] }, /positive numbers/],
  [{ dividerCountY: 5, compartmentSizesY: [20, -1] }, /positive numbers/],
  [{ dividerCountY: 5, compartmentSizesY: [20, '15'] }, /positive numbers/],
  [{ dividerCountX: 1, compartmentSizesX: [156.8] }, /positive space for remaining compartments/],
  [{ dividerCountY: 1, compartmentSizesY: [94] }, /positive space for remaining compartments/],
  [{ dividerCountX: 5, compartmentSizesX: [152] }, /positive space for remaining compartments/],
  [{ dividerCountY: 5, compartmentSizesY: [87] }, /positive space for remaining compartments/],
  [{ dividerCountX: 5, compartmentSizesX: [100, 53] }, /positive space for remaining compartments/],
  [{ dividerCountY: 5, compartmentSizesY: [50, 38] }, /positive space for remaining compartments/],
  [{ dividerCountX: 1, dividerThickness: 0 }, /dividerThickness must be positive/],
  [{ dividerCountY: 100 }, /no compartment space along Y/],
  [{ dividerCountX: 1, dividerHeight: 0 }, /dividerHeight must be positive/],
  [{ dividerCountX: 1, dividerHeight: 41.51 }, /must not exceed 41.5/],
  [{ withLid: true, dividerCountY: 1, dividerHeight: 45.51 }, /must not exceed 45.5/],
  [{ withStacking: false, dividerCountX: 1, dividerHeight: 48.01 }, /must not exceed 48/],
  [{ internalClearance: 0 }, /internalClearance must be positive/],
  [{ ...lidSettings, lidLogoDepth: 2 }, /Lid logo depth/],
  [{ ...lidSettings, lidLogoSize: 0 }, /Lid logo size/],
  [{ ...lidSettings, lidLogoMargin: 0.99 }, /Lid logo margin must clear/],
  [{ ...lidSettings, withLidArtwork: false, lidLogoSize: 100 }, /too small for the logo/],
  [{ ...lidSettings, lidArtworkAspect: 0 }, /aspect ratio must be positive/],
];

test('invalid parameters fail with actionable assertions rather than broken geometry', () => {
  for (const [settings, expected] of invalid) {
    const result = run({ itemsShown: 'box', ...settings }, 'csg');
    assert.match(result.log, /ERROR: Assertion/, JSON.stringify(settings));
    assert.match(result.log, expected, JSON.stringify(settings));
  }
});

const magneticSettings = { withLid: true, lidStyle: 'magnetic',
  withLidArtwork: false, withLidLogo: false };

function magneticDimensions(settings) {
  const l = settings.boxLength ?? 160, w = settings.boxWidth ?? 95, h = settings.boxHeight ?? 50;
  const wt = settings.wallThickness ?? 1, r = settings.cornerRadius ?? 5;
  const t = settings.magneticLidThickness ?? 5;
  const radius = (settings.magnetDiameter ?? 3) / 2 + (settings.magnetPocketClearance ?? 0.1);
  const depth = (settings.magnetThickness ?? 3) + (settings.magnetRecess ?? 0.1);
  const pad = radius + 1.2, seat = h - t;
  const gap = settings.magneticLidClearance ?? 0.3, insertion = settings.magneticLidLocatorDepth ?? 2;
  const lip = settings.magneticLidLipThickness ?? 1.2;
  const centers = [r + pad, l - r - pad].flatMap(x => [wt + pad, w - wt - pad].map(y => [x, y]));
  const corner = r - (r - wt - gap - lip / 2) / Math.sqrt(2);
  const lipPoints = [
    [l / 2, wt + gap + lip / 2], [l / 2, w - wt - gap - lip / 2],
    [(r + 2 * pad + gap + l / 2) / 2, wt + gap + lip / 2],
    [wt + gap + lip / 2, w / 2],
    [l - Math.max(wt, settings.withNotch === false ? 0 : 3) - gap - lip / 2, w / 2],
    [corner, corner], [r + pad, wt + 2 * pad + gap + lip / 2],
  ];
  return { l, w, h, wt, r, t, radius, depth, pad, seat, gap, insertion, lip, centers, lipPoints,
    printPoint: ([x, y, z]) => [x, y - w - 2 * wt, z],
    seatedPoint: ([x, y, z]) => [x, w - y, h - z] };
}

for (const [name, settings] of [
  ['default', {}],
  ['large', { boxLength: 300, boxWidth: 200, boxHeight: 70, cornerRadius: 12 }],
  ['compact limit', { boxLength: 24.6, boxWidth: 24.2, pullLedges: 'none' }],
  ['custom fit', { boxLength: 180, boxWidth: 110, wallThickness: 1.6, cornerRadius: 8,
    magnetDiameter: 6, magnetThickness: 2, magnetPocketClearance: 0.2, magnetRecess: 0.2,
    magneticLidThickness: 4, magneticLidClearance: 0.6, magneticLidLocatorDepth: 3,
    magneticLidLipThickness: 1.8, withNotch: false }],
]) {
  test(`magnetic ${name} pair has exact pockets, supports, inset lip, and closed dimensions`, () => {
    const config = { ...magneticSettings, ...settings };
    const box = render(config), lid = render({ ...config, itemsShown: 'lid' });
    const d = magneticDimensions(config);
    box.bounds[0].forEach(v => near(v, 0));
    box.bounds[1].forEach((v, i) => near(v, [d.l, d.w, d.seat][i]));
    lid.bounds[0].forEach((v, i) => near(v, [0, -d.w - 2 * d.wt, 0][i]));
    lid.bounds[1].forEach((v, i) => near(v, [d.l, -2 * d.wt, d.t + d.insertion][i]));
    near(d.seat + d.t, d.h);
    assert.equal(box.contains([d.wt / 2, d.w / 2, 1]), true, 'No inset stacking base');
    assert.equal(box.contains([d.l / 2, d.wt + 0.1, d.seat - 0.1]), false, 'No sliding rail');
    for (const [x, y] of d.centers) {
      for (const [mesh, top, point] of [[box, d.seat, p => p], [lid, d.t, d.printPoint]]) {
        assert.equal(mesh.contains(point([x, y, top - 0.1])), false, 'Pocket opens at seating face');
        assert.equal(mesh.contains(point([x, y, top - d.depth + 0.05])), false, 'Pocket reaches exact depth');
        assert.equal(mesh.contains(point([x, y, top - d.depth - 0.05])), true, 'Blind pocket has a floor');
        assert.equal(mesh.contains(point([x, y, top - d.depth - 0.95])), true, 'At least 1 mm skin/floor');
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          assert.equal(mesh.contains(point([x + dx * (d.radius - 0.03),
            y + dy * (d.radius - 0.03), top - 0.5])), false, 'Full pocket diameter is clear');
          assert.equal(mesh.contains(point([x + dx * (d.radius + 0.03),
            y + dy * (d.radius + 0.03), top - 0.5])), true, 'Pocket diameter is not oversized');
          assert.equal(mesh.contains(point([x + dx * (d.pad - 0.05),
            y + dy * (d.pad - 0.05), top - 0.5])), true, 'Pocket retains 1.2 mm side wall');
        }
      }
      const assembled = d.seatedPoint([x, y, d.t]);
      assert.ok(d.centers.some(p => Math.abs(p[0] - assembled[0]) < 1e-8 &&
        Math.abs(p[1] - assembled[1]) < 1e-8), 'Flipped lid pockets align with box pockets');
      near(assembled[2], d.seat);
    }
    for (const [x, y] of d.lipPoints) {
      const center = [x, y, d.t + d.insertion - 0.05];
      assert.equal(lid.contains(d.printPoint(center)), true);
      assert.equal(lid.contains(d.printPoint([center[0], center[1], d.t + d.insertion + 0.05])), false);
      for (const lift of [0, d.insertion / 2, d.insertion]) {
        const seated = d.seatedPoint(center);
        seated[2] += lift;
        assert.equal(box.contains(seated), false, 'Perimeter lip clears box during vertical insertion');
      }
    }
    // Probe both lip boundaries and the gap to the wall.
    for (const offset of [d.gap / 2, d.gap - 0.03, d.gap + 0.03, d.gap + d.lip - 0.03, d.gap + d.lip + 0.03]) {
      assert.equal(lid.contains(d.printPoint([d.l / 2, d.wt + offset, d.t + 0.5])),
        offset > d.gap && offset < d.gap + d.lip);
      assert.equal(box.contains([d.l / 2, d.wt + offset, d.seat - 0.5]), false);
    }
    assert.equal(lid.contains(d.printPoint([d.l - 0.5, d.w / 2, d.t - 0.1])), config.withNotch === false);
    assert.equal(lid.contains(d.printPoint([d.l - 0.5, d.w / 2, d.t - 1.6])), true);
    const lip = render(config, 1, '!linear_extrude(height=1) magneticLipProfile();');
    assert.equal(lip.contains([d.l / 2, d.w / 2, 0.5]), false, 'Lip is a connected perimeter ring, not a solid plug');
    for (const [x, y] of d.centers) {
      assert.equal(lip.contains([x, y, 0.5]), false, 'Lip leaves magnets accessible');
    }
  });
}

for (const [name, settings] of [
  ['default', { dividerCountX: 2, dividerCountY: 2, compartmentSizesX: [6.8, 140],
    compartmentSizesY: [2.8, 82], dividerHeight: 40.5, pullTopOffset: 7.5 }],
  ['large', { boxLength: 300, boxWidth: 200, boxHeight: 70, cornerRadius: 12,
    dividerCountX: 1, dividerCountY: 1, dividerHeight: 60.5, pullTopOffset: 7.5 }],
  ['compact limit', { boxLength: 24.6, boxWidth: 24.2, pullLedges: 'none',
    dividerCountX: 1, dividerCountY: 1, dividerHeight: 40.5 }],
]) {
  test(`magnetic ${name} seated lid and insertion sweep have no solid intersection with the box`, () => {
    const result = run({ ...magneticSettings, ...settings }, 'stl', `
    !intersection() {
      magneticBox();
      // The constant lip cross-section sweeps exactly this volume below the rim.
      union() {
        translate([0,boxWidth,boxHeight]) rotate([180,0,0]) magneticLid();
        translate([0,boxWidth,boxHeight-magneticLidThickness])
          rotate([180,0,0]) linear_extrude(height=magneticLidLocatorDepth)
            magneticLipProfile();
      }
      // Exclude the intended zero-volume seating face within 0.001 mm.
      translate([-1,-1,-1])
        cube([boxLength+2,boxWidth+2,boxHeight-magneticLidThickness+1-0.001]);
    }
    `);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/i);
    assert.match(result.log, /Current top level object is empty/, result.log);
  });
}

test('magnetic dividers obey the exact height limit and cannot refill magnet pockets', () => {
  const config = { ...magneticSettings, dividerCountX: 1, dividerCountY: 1, dividerHeight: 40.5,
    compartmentSizesX: [6.2], compartmentSizesY: [2.2] };
  const mesh = render(config), d = magneticDimensions(config);
  assert.equal(mesh.contains([7.8, 20, 42.4]), true);
  assert.equal(mesh.contains([7.8, 20, 42.6]), false);
  assert.equal(mesh.contains([20, 3.8, 42.4]), true);
  assert.equal(mesh.contains([20, 3.8, 42.6]), false);
  assert.equal(mesh.contains([7.8, 3.8, d.seat - d.depth + 0.1]), false, 'Dividers cannot refill pocket');
  assert.equal(mesh.contains([7.8, 3.8, d.seat - d.depth - 0.1]), true);
});

test('magnetic engravings combine real artwork, logo, and text on the exterior and retain pocket skin', () => {
  const mesh = render({ ...magneticSettings, itemsShown: 'lid', withLidArtwork: true, withLidLogo: true,
    withLidText: true, lidText: 'Tools' });
  const engraved = mesh.triangles.filter(t => t.every(v => Math.abs(v[2] - 0.5) < 1e-5));
  assert.ok(engraved.some(t => t.every(v => v[0] < 20)), 'Personal logo is engraved into exterior Z=0');
  assert.ok(engraved.some(t => t.every(v => v[0] > 20 && v[1] < -22)), 'Robot stays outside the text band');
  assert.ok(engraved.some(t => t.every(v => v[0] > 20)), 'Text is engraved on the exterior face');
  const d = magneticDimensions({});
  const logoPoint = (x, y, z) => d.printPoint([10 + (x - 50) * 12 / 89,
    47.5 - (50 - y) * 12 / 89, z]);
  assert.equal(mesh.contains(logoPoint(16, 40, 0.25)), false);
  assert.equal(mesh.contains(logoPoint(16, 40, 0.75)), true);
  assert.equal(mesh.contains(logoPoint(30, 30, 0.25)), true);
});

test('magnetic logo uses flat-edge margins and works without robot artwork', () => {
  const mesh = render({ ...magneticSettings, itemsShown: 'lid', withLidLogo: true,
    lidLogoMargin: 0.5, lidLogoDepth: 0.9, lidArtworkFile: 'missing-robot.svg' });
  assert.ok(mesh.triangles.some(t => t.every(v => Math.abs(v[2] - 0.9) < 1e-5)));
});

test('magnetic print layout separates the two parts', () => {
  const mesh = render({ ...magneticSettings, itemsShown: 'both' }, 2);
  near(mesh.bounds[0][1], -97);
  near(mesh.bounds[1][1], 95);
  near(mesh.bounds[1][2], 45);
});

test('explicit sliding selection preserves both existing geometry definitions', () => {
  for (const itemsShown of ['box', 'lid']) {
    const settings = { withLid: true, itemsShown, withLidArtwork: false, withLidLogo: false };
    const explicit = run({ ...settings, lidStyle: 'sliding' }, 'csg'), implicit = run(settings, 'csg');
    assert.equal(explicit.status, 0, explicit.log);
    assert.equal(implicit.status, 0, implicit.log);
    assert.equal(readFileSync(explicit.output, 'utf8'), readFileSync(implicit.output, 'utf8'));
  }
});

test('inactive magnetic parameters are ignored by lidless and sliding modes', () => {
  for (const settings of [{ withLid: false, lidStyle: 'magnetic' }, { withLid: true, lidStyle: 'sliding' }]) {
    const base = { ...settings, itemsShown: 'both', withLidArtwork: false, withLidLogo: false };
    const original = run(base, 'csg');
    const modified = run({ ...base, magneticLidThickness: -1, magnetDiameter: 'unused',
      magnetThickness: 0, magnetPocketClearance: -5, magnetRecess: -3, magneticLidClearance: 0,
      magneticLidLocatorDepth: 'unused', magneticLidLipThickness: 'unused' }, 'csg');
    assert.doesNotMatch(modified.log, /ERROR:|WARNING:/i);
    assert.equal(readFileSync(modified.output, 'utf8'), readFileSync(original.output, 'utf8'));
  }
  const disabled = run({ withLid: false, lidStyle: 'magnetic', itemsShown: 'lid' }, 'csg');
  assert.match(disabled.log, /Lid disabled: set withLid=true/);
});

test('magnetic disabled engravings do not import SVGs', () => {
  render({ ...magneticSettings, itemsShown: 'lid',
    lidArtworkFile: 'missing-robot.svg', lidLogoFile: 'missing-logo.svg' });
});

test('magnetic invalid parameters fail with actionable assertions', () => {
  for (const [settings, expected] of [
    [{ lidStyle: 'hinged' }, /lidStyle must be sliding or magnetic/],
    [{ magneticLidThickness: 0 }, /magneticLidThickness must be positive/],
    [{ magneticLidThickness: '5' }, /magneticLidThickness must be positive/],
    [{ magnetDiameter: '3' }, /magnetDiameter must be positive/],
    [{ magnetDiameter: 0 }, /magnetDiameter must be positive/],
    [{ magnetThickness: -1 }, /magnetThickness must be positive/],
    [{ magnetThickness: '3' }, /magnetThickness must be positive/],
    [{ magnetPocketClearance: -0.1 }, /magnetPocketClearance must be nonnegative/],
    [{ magnetRecess: -0.1 }, /magnetRecess must be nonnegative/],
    [{ magnetRecess: '0.1' }, /magnetRecess must be nonnegative/],
    [{ magneticLidClearance: 0 }, /magneticLidClearance must be positive/],
    [{ magneticLidLocatorDepth: '2' }, /magneticLidLocatorDepth must be positive/],
    [{ magneticLidLocatorDepth: 0 }, /magneticLidLocatorDepth must be positive/],
    [{ magneticLidLipThickness: 0 }, /magneticLidLipThickness must be positive/],
    [{ magneticLidLipThickness: 'thin' }, /magneticLidLipThickness must be positive/],
    [{ magneticLidThickness: 4 }, /1 mm of skin above the magnet pockets/],
    [{ boxLength: 20 }, /pads and inset lip must fit/],
    [{ boxWidth: 20 }, /pads and inset lip must fit/],
    [{ boxLength: 24.59, pullLedges: 'none' }, /pads and inset lip must fit/],
    [{ boxWidth: 24.19, pullLedges: 'none' }, /pads and inset lip must fit/],
    [{ cornerRadius: 43 }, /pads and inset lip must fit/],
    [{ magneticLidClearance: 100 }, /pads and inset lip must fit/],
    [{ boxHeight: 12, pullLedges: 'none' }, /pad undersides must clear the floor/],
    [{ magneticLidLocatorDepth: 50, pullLedges: 'none' }, /inset lip must clear the floor/],
    [{ pullTopOffset: 7.49 }, /pullTopOffset must clear the magnetic lip/],
    [{ dividerCountX: 1, dividerHeight: 40.51 }, /dividerHeight must not exceed 40.5/],
    [{ itemsShown: 'lid', withLidLogo: true, lidLogoDepth: 0.91 }, /engraving must leave at least 1 mm/],
    [{ itemsShown: 'lid', withLidArtwork: true, lidArtworkDepth: 'deep' }, /depth must be positive and numeric/],
    [{ itemsShown: 'lid', withLidArtwork: true, lidArtworkDepth: 0.91 }, /engraving must leave at least 1 mm/],
    [{ itemsShown: 'lid', withLidLogo: true, lidLogoMargin: 0.49 }, /margin must clear the lid edge/],
  ]) {
    const result = run({ ...magneticSettings, itemsShown: 'box', ...settings }, 'csg');
    assert.match(result.log, /ERROR: Assertion/, JSON.stringify(settings));
    assert.match(result.log, expected, JSON.stringify(settings));
    assert.doesNotMatch(result.log, /WARNING:/i, JSON.stringify(settings));
  }
});

function planeVertices(mesh, z) {
  return mesh.triangles.filter(t => t.every(v => Math.abs(v[2] - z) < 1e-5)).flat();
}

for (const style of ['sliding', 'magnetic']) {
  test(`${style} lid text respects the selected font, size, depth, and exterior orientation`, () => {
    const widths = [];
    for (const font of ['Liberation Sans:style=Bold', 'Liberation Mono:style=Regular']) {
      const settings = { ...magneticSettings, lidStyle: style, itemsShown: 'lid',
        withLidText: true, lidText: 'Tools', lidTextFont: font, lidTextDepth: 0.6 };
      const mesh = render(settings);
      const bottom = 0.6;
      const vertices = planeVertices(mesh, bottom);
      assert.ok(vertices.length > 0, 'The label must actually be engraved');
      const xs = vertices.map(v => v[0]), ys = vertices.map(v => v[1]);
      widths.push(Math.max(...xs) - Math.min(...xs));
      const xCenter = 80;
      const yCenter = style === 'magnetic' ? -49.5 : -52.5;
      near((Math.min(...xs) + Math.max(...xs)) / 2, xCenter, 0.5);
      near((Math.min(...ys) + Math.max(...ys)) / 2, yCenter, 1.5);
      const triangle = mesh.triangles.find(t => t.every(v => Math.abs(v[2] - bottom) < 1e-5));
      const x = triangle.reduce((sum, v) => sum + v[0], 0) / 3;
      const y = triangle.reduce((sum, v) => sum + v[1], 0) / 3;
      assert.equal(mesh.contains([x, y, bottom - 0.1]), false);
      assert.equal(mesh.contains([x, y, bottom + 0.1]), true, 'Text does not cut through');
    }
    assert.ok(Math.abs(widths[0] - widths[1]) > 0.5, 'Selecting a different installed font changes glyph geometry');
  });
}

for (const style of ['sliding', 'magnetic']) {
  test(`${style} lid text positions default to center and honor X/Y coordinates`, () => {
    const base = { ...magneticSettings, lidStyle: style, itemsShown: 'lid',
      withLidText: true, lidText: 'AB', withLidArtwork: false, withLidLogo: false };
    const positions = [[undefined, undefined], [30, 25], [130, 70]];
    const bounds = positions.map(([lidTextPositionX, lidTextPositionY]) => {
      const settings = { ...base };
      if (lidTextPositionX !== undefined) settings.lidTextPositionX = lidTextPositionX;
      if (lidTextPositionY !== undefined) settings.lidTextPositionY = lidTextPositionY;
      const mesh = render(settings);
      const vertices = planeVertices(mesh, 0.5);
      return [Math.min(...vertices.map(v => v[0])), Math.max(...vertices.map(v => v[0])),
        Math.min(...vertices.map(v => v[1])), Math.max(...vertices.map(v => v[1]))];
    });
    const [centered, first, second] = bounds;
    const expectedCenter = style === 'magnetic' ? [80, -49.5] : [80, -52.5];
    near((centered[0] + centered[1]) / 2, expectedCenter[0], 0.1);
    near((centered[2] + centered[3]) / 2, expectedCenter[1], 1.5);
    near((first[0] + first[1] - centered[0] - centered[1]) / 2, 30 - expectedCenter[0], 0.001);
    near((first[2] + first[3] - centered[2] - centered[3]) / 2,
      47.5 - 25, 0.001);
    near((second[0] + second[1] - first[0] - first[1]) / 2, 100, 0.001);
    near((second[2] + second[3] - first[2] - first[3]) / 2, -45, 0.001);
  });
}

test('text size is adjustable for longer labels without distorting the font', () => {
  const label = 'Small tools - metric screws';
  const meshes = [4, 6].map(size => render({ ...magneticSettings, itemsShown: 'lid',
    withLidText: true, lidText: label, lidTextSize: size }));
  const widths = meshes.map(mesh => {
    const xs = planeVertices(mesh, 0.5).map(v => v[0]);
    return Math.max(...xs) - Math.min(...xs);
  });
  near(widths[1] / widths[0], 1.5, 0.002);
  assert.ok(widths[1] < 152, 'Long test label fits at the selected smaller size');
});

const layoutArtwork = join(temporary, 'layout-artwork.svg');
writeFileSync(layoutArtwork, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 40">' +
  '<path d="M4 4H16V36H4ZM8 8V32H12V8Z" fill-rule="evenodd"/></svg>');

for (const style of ['sliding', 'magnetic']) {
  test(`${style} lid supports every independent artwork, logo, and text combination`, () => {
    for (let mask = 0; mask < 8; mask++) {
      const settings = { ...magneticSettings, lidStyle: style, itemsShown: 'lid',
        withLidArtwork: Boolean(mask & 1), withLidLogo: Boolean(mask & 2), withLidText: Boolean(mask & 4),
        lidArtworkFile: layoutArtwork, lidArtworkAspect: 2, lidArtworkDepth: 0.4,
        lidLogoDepth: 0.5, lidTextDepth: 0.6, lidText: 'Tools' };
      const mesh = render(settings);
      for (const [flag, depth] of [[1, 0.4], [2, 0.5], [4, 0.6]]) {
        const vertices = planeVertices(mesh, depth);
        assert.equal(vertices.length > 0, Boolean(mask & flag), `style=${style}, mask=${mask}, feature=${flag}`);
        if (mask & 4 && flag === 1) {
          const boundary = style === 'magnetic' ? -22 : -25;
          assert.ok(vertices.every(v => v[1] < boundary),
            'Artwork is fitted outside the reserved text band');
        }
      }
    }
  });
}

test('disabled text leaves the other decorations unchanged and ignores unused settings', () => {
  for (const style of ['sliding', 'magnetic']) {
    const settings = { withLid: true, lidStyle: style, itemsShown: 'lid', withLidArtwork: false };
    const base = run(settings, 'csg');
    const disabled = run({ ...settings, withLidText: false, lidText: 123,
      lidTextFont: '', lidTextSize: -1, lidTextDepth: 'unused',
      lidTextBandHeight: -1, lidTextMargin: -1, lidTextPositionX: 'unused',
      lidTextPositionY: 'unused' }, 'csg');
    assert.doesNotMatch(disabled.log, /ERROR:|WARNING:|Text uses font/i);
    assert.equal(readFileSync(base.output, 'utf8'), readFileSync(disabled.output, 'utf8'));
  }
  for (const settings of [{ withLid: false, itemsShown: 'both' },
    { withLid: true, lidStyle: 'sliding', itemsShown: 'box' },
    { withLid: true, lidStyle: 'magnetic', itemsShown: 'box' }]) {
    const result = run({ ...settings, withLidText: true, lidText: '', lidTextFont: '', lidTextSize: -1 }, 'csg');
    assert.doesNotMatch(result.log, /ERROR:|WARNING:|Text uses font/i);
  }
});

test('invalid lid text settings fail explicitly without geometry warnings', () => {
  for (const [settings, expected] of [
    [{ lidText: '' }, /lidText must be a nonempty string/],
    [{ lidText: 123 }, /lidText must be a nonempty string/],
    [{ lidText: '   ' }, /lidText must contain visible characters/],
    [{ lidText: 'Two\nlines' }, /single line without tabs or line breaks/],
    [{ lidTextFont: '' }, /lidTextFont must name an installed font/],
    [{ lidTextSize: 0 }, /lidTextSize must be positive/],
    [{ lidTextSize: '8' }, /lidTextSize must be positive/],
    [{ lidTextDepth: 0 }, /lidTextDepth must be positive/],
    [{ lidTextDepth: 5 }, /less than the active lid thickness/],
    [{ lidTextDepth: 0.91 }, /engraving must leave at least 1 mm/],
    [{ lidTextBandHeight: 0 }, /lidTextBandHeight must be positive/],
    [{ lidTextBandHeight: 95 }, /smaller than the lid width/],
    [{ lidTextBandHeight: 19.99 }, /at least 1.5\*lidTextSize/],
    [{ lidTextMargin: -1 }, /lidTextMargin must clear/],
    [{ lidTextMargin: '4' }, /lidTextMargin must clear/],
    [{ lidTextPositionX: '80' }, /lidTextPositionX must be a number or undef/],
    [{ lidTextPositionY: [] }, /lidTextPositionY must be a number or undef/],
    [{ lidStyle: 'sliding', lidTextMargin: 0.99 }, /lidTextMargin must clear/],
    [{ lidStyle: 'sliding', lidTextDepth: 2 }, /less than the active lid thickness/],
    [{ withLidArtwork: true, lidTextBandHeight: 90 }, /too small for the artwork margins/],
  ]) {
    const result = run({ ...magneticSettings, itemsShown: 'lid', withLidText: true, ...settings }, 'csg');
    assert.match(result.log, /ERROR: Assertion/, JSON.stringify(settings));
    assert.match(result.log, expected, JSON.stringify(settings));
    assert.doesNotMatch(result.log, /WARNING:/i, JSON.stringify(settings));
  }
});

const suppliedInlaySettings = {
  itemsShown: 'both', colorShown: 'all', withColorInlay: true,
  boxLength: 100, boxWidth: 95, boxHeight: 50, cornerRadius: 5,
  wallThickness: 2.5, bottomThickness: 2,
  dividerCountX: 0, dividerCountY: 5, dividerHeight: 25, dividerThickness: 1.2,
  compartmentSizesX: [], compartmentSizesY: [18],
  withStacking: false, withLid: true, lidStyle: 'magnetic',
  lidThickness: 2, lidClearance: 0.2, lidEdgeThickness: 0.5, withNotch: true,
  magneticLidThickness: 5, magnetDiameter: 3, magnetThickness: 3,
  magnetPocketClearance: 0.1, magnetRecess: 0.1, magneticLidClearance: 0.3,
  magneticLidLocatorDepth: 2, magneticLidLipThickness: 1.2, pullLedges: 'none',
  withLidArtwork: false, withLidLogo: true, lidLogoFile: join(root, 'ab-logo-monochrome.svg'),
  lidLogoSize: 25, lidLogoDepth: 0.5, lidLogoMargin: 4,
  withLidText: true, lidText: '         Manual Drill',
  lidTextFont: 'Liberation Sans:style=Bold', lidTextSize: 8, lidTextDepth: 0.5,
  lidTextBandHeight: 20, lidTextMargin: 4,
  internalClearance: 0.5,
};

for (const lidStyle of ['sliding', 'magnetic']) {
  test(`${lidStyle} supplied color inlays remain manifold after F5 preview then F6`, () => {
    const settings = { ...suppliedInlaySettings, lidStyle,
      itemsShown: lidStyle === 'magnetic' ? 'both' : 'lid' };
    const shells = lidStyle === 'magnetic' ? 2 : 1;
    const cold = render(settings, shells);
    const warm = render(settings, shells, undefined, { previewFirst: true });
    warm.bounds.flat().forEach((v, i) => near(v, cold.bounds.flat()[i], 0.001));
    assert.equal(warm.triangles.length, cold.triangles.length,
      'Preview-cached inlays must not introduce extra surfaces into the filled lid');

    const lid = render({ ...settings, itemsShown: 'lid' }, 1, undefined, { previewFirst: true });
    const body = render({ ...settings, colorShown: 'lid' }, 1, undefined, { previewFirst: true });
    const engraved = render({ ...settings, itemsShown: 'lid', withColorInlay: false });
    assert.deepEqual(body.bounds, engraved.bounds);
    assert.equal(body.triangles.length, engraved.triangles.length);
    for (const [part, shells] of [['logo', 9], ['text', 12]]) {
      const mesh = render({ ...settings, colorShown: part }, shells, undefined, { previewFirst: true });
      const low = 0;
      near(mesh.bounds[0][2], low, 0.001);
      near(mesh.bounds[1][2], low + 0.5, 0.001);
      for (const triangle of mesh.triangles.filter(t => t.every(v => Math.abs(v[2] - low) < 1e-5))) {
        const point = [0, 1].map(axis => triangle.reduce((sum, v) => sum + v[axis], 0) / 3);
        point.push(low + 0.25);
        assert.equal(body.contains(point), false, 'Body must leave space for the aligned color part');
        assert.equal(lid.contains(point), true, 'Combined lid must fill each color cavity');
      }
    }
  });

  test(`${lidStyle} supplied color partitions reconstruct the lid without gaps or overlaps`, () => {
    const magnetic = lidStyle === 'magnetic';
    const bodyModule = magnetic ? 'magneticLidBody' : 'slidingLidBody';
    const settings = { ...suppliedInlaySettings, lidStyle, withLid: false, itemsShown: 'lid' };
    for (const [name, body] of [
      ['body/inlay overlap', `intersection() { ${bodyModule}(); lidInlays(${magnetic}, "all"); }`],
      ['logo/text overlap', `intersection() { lidInlays(${magnetic}, "logo"); lidInlays(${magnetic}, "text"); }`],
      ['overflow', `difference() {
        union() { ${bodyModule}(); lidInlays(${magnetic}, "all"); }
        ${bodyModule}(decorated=false);
      }`],
      ['unfilled cavity', `difference() {
        ${bodyModule}(decorated=false);
        union() { ${bodyModule}(); lidInlays(${magnetic}, "all"); }
      }`],
    ]) assertEmpty(run(settings, 'stl', body), name);
  });
}

test('color settings and colorShown options validate and support individual part exports', () => {
  const invalid = run({ colorShown: 'unknown' }, 'csg');
  assert.match(invalid.log, /ERROR: Assertion.*colorShown must be all, box, lid, robot, logo, or text/);

  for (const colors of [
    { boxColor: 'DodgerBlue', lidColor: '#ff8800', robotColor: [0.1, 0.8, 0.2], logoColor: 'Gold', textColor: 'White' },
    { boxColor: [0.5, 0.5, 0.5, 1], lidColor: 'SlateGray', robotColor: '#00ffff', logoColor: '#ff00ff', textColor: [1, 1, 0] },
  ]) {
    const result = run({ withLid: true, withLidText: true, lidText: 'AB',
      withColorInlay: true, lidArtworkFile: layoutArtwork, ...colors }, 'csg');
    assert.equal(result.status, 0, result.log);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/i);
    assert.match(readFileSync(result.output, 'utf8'), /render\s*\(/,
      'Resolve clipped inlays before F5 to avoid coloring the entire lid');
    const fullRender = run({ withLid: true, withLidText: true, lidText: 'AB',
      withColorInlay: true, lidArtworkFile: layoutArtwork, ...colors, $preview: false }, 'csg');
    assert.equal(fullRender.status, 0, fullRender.log);
    assert.doesNotMatch(fullRender.log, /ERROR:|WARNING:/i);
    assert.doesNotMatch(readFileSync(fullRender.output, 'utf8'), /render\s*\(/,
      'F6 must use exact boolean inlays instead of F5-cached render meshes');
  }

  for (const style of ['sliding', 'magnetic']) {
    for (const part of ['box', 'lid', 'robot', 'logo', 'text']) {
      const settings = {
        ...magneticSettings,
        lidStyle: style,
        withLid: true,
        withLidArtwork: true,
        lidArtworkFile: layoutArtwork,
        withLidLogo: true,
        withLidText: true,
        lidText: 'AB',
        withColorInlay: true,
        colorShown: part,
      };
      const result = run(settings, 'stl');
      assert.equal(result.status, 0, result.log);
      assert.doesNotMatch(result.log, /ERROR:|WARNING:|not a valid 2-manifold/i);
    }
  }
});

for (const style of ['sliding', 'magnetic']) {
  test(`${style} color inlays fill cavities flush and preserve alignment across parts`, () => {
    const baseSettings = {
      ...magneticSettings,
      lidStyle: style,
      withLid: true,
      withLidArtwork: true,
      lidArtworkFile: layoutArtwork,
      withLidLogo: true,
      withLidText: true,
      lidText: 'T',
      lidTextPositionX: 80,
      lidTextPositionY: 10,
      withColorInlay: true,
      lidLogoDepth: 0.5,
      lidTextDepth: 0.5,
    };

    const lidMesh = render({ ...baseSettings, colorShown: 'lid' }, 1);
    const textMesh = render({ ...baseSettings, colorShown: 'text' }, 1);
    const logoMesh = render({ ...baseSettings, colorShown: 'logo' }, 9);
    const robotMesh = render({ ...baseSettings, colorShown: 'robot' }, 1);
    const filled = render({ ...baseSettings, itemsShown: 'lid', colorShown: 'all' });
    const low = 0, high = 0.5;
    for (const mesh of [textMesh, logoMesh, robotMesh]) {
      near(mesh.bounds[0][2], low, 0.001);
      near(mesh.bounds[1][2], high, 0.001);
      for (const triangle of mesh.triangles.filter(t => t.every(v => Math.abs(v[2] - low) < 1e-5)).slice(0, 12)) {
        const point = [0, 1].map(axis => triangle.reduce((sum, v) => sum + v[axis], 0) / 3);
        point.push((low + high) / 2);
        assert.equal(mesh.contains(point), true);
        assert.equal(lidMesh.contains(point), false, 'Body must leave space for each inlay');
        assert.equal(filled.contains(point), true, 'Assembled inlay fills that same cavity');
      }
    }
    filled.bounds.flat().forEach((v, i) => near(v, lidMesh.bounds.flat()[i], 0.001));
  });
}

test('color vectors reject invalid lengths, types and ranges', () => {
  for (const name of ['boxColor', 'lidColor', 'robotColor', 'logoColor', 'textColor']) {
    for (const value of ['', 42, [], [1, 0], [1, 0, 0, 1, 0], ['red', 0, 0], [1.1, 0, 0], [0, -0.1, 0]]) {
      const result = run({ [name]: value }, 'csg');
      assert.match(result.log, new RegExp(`${name} must be a nonempty color`));
      assert.match(result.log, /ERROR: Assertion/);
      assert.doesNotMatch(result.log, /WARNING:/);
    }
  }
  const result = run({ withColorInlay: 'yes' }, 'csg');
  assert.match(result.log, /withColorInlay must be true or false/);
});

test('color selectors honor enable flags and explain empty selections without importing SVGs', () => {
  for (const part of ['lid', 'robot', 'logo', 'text']) {
    const result = run({ colorShown: part, withLid: false,
      lidArtworkFile: 'missing.svg', lidLogoFile: 'missing.svg' }, 'csg');
    assert.match(result.log, /Lid disabled/);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/);
    assert.doesNotMatch(readFileSync(result.output, 'utf8'), /import\(|linear_extrude\(|cube\(/);
  }
  for (const part of ['robot', 'logo', 'text']) {
    for (const withColorInlay of [false, true]) {
      const result = run({ withLid: true, withColorInlay, colorShown: part,
        withLidArtwork: false, withLidLogo: false, withLidText: false,
        lidArtworkFile: 'missing.svg', lidLogoFile: 'missing.svg' }, 'csg');
      assert.match(result.log, withColorInlay ? /Decoration disabled/ : /Color inlays disabled/);
      assert.doesNotMatch(result.log, /ERROR:|WARNING:/);
      assert.doesNotMatch(readFileSync(result.output, 'utf8'), /import\(|linear_extrude\(|cube\(/);
    }
  }
});

for (const style of ['sliding', 'magnetic']) {
  test(`${style} color partitions have no overlap or overflow and reconstruct the undecorated lid`, () => {
    const magnetic = style === 'magnetic';
    const bodyModule = magnetic ? 'magneticLidBody' : 'slidingLidBody';
    const settings = { withLid: false, lidStyle: style, itemsShown: 'lid', withColorInlay: true,
      withLidArtwork: true, lidArtworkFile: layoutArtwork,
      withLidLogo: true, lidLogoFile: layoutArtwork, lidLogoSize: 40,
      withLidText: true, lidText: 'MMMMMMMM', lidTextSize: 20, lidTextBandHeight: 40,
      lidTextPositionX: 8, lidTextPositionY: 47.5,
      lidArtworkDepth: 0.4, lidLogoDepth: 0.5, lidTextDepth: 0.6 };
    const probes = [
      ['robot/logo overlap', `
        intersection() {
          lidInlays(${magnetic}, "robot");
          lidInlays(${magnetic}, "logo");
        }`],
      ['robot/text overlap', `
        intersection() {
          lidInlays(${magnetic}, "robot");
          lidInlays(${magnetic}, "text");
        }`],
      ['logo/text overlap', `
        intersection() {
          lidInlays(${magnetic}, "logo");
          lidInlays(${magnetic}, "text");
        }`],
      ['body/inlay overlap', `
        intersection() {
          ${bodyModule}();
          lidInlays(${magnetic}, "all");
        }`],
      ['overflow', `
        difference() {
          union() { ${bodyModule}(); lidInlays(${magnetic}, "all"); }
          ${bodyModule}(decorated=false);
        }`],
      ['unfilled cavity', `
        difference() {
          ${bodyModule}(decorated=false);
          union() { ${bodyModule}(); lidInlays(${magnetic}, "all"); }
        }`],
    ];
    for (const [name, body] of probes) {
      assertEmpty(run(settings, 'stl', body), name);
    }
    render({ ...settings, withLid: true, itemsShown: 'lid', colorShown: 'all' },
      1, undefined, { previewFirst: true });
  });
}
