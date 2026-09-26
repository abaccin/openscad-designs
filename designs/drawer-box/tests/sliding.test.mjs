import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { readStlVertices } from '../scripts/export-lid-stls.mjs';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const executable = (process.env.OPENSCAD || 'openscad').replace(/openscad\.com$/i, 'openscad.exe');
const temporary = mkdtempSync(join(tmpdir(), 'drawer-sliding-test-'));
after(() => rmSync(temporary, { recursive: true, force: true }));
let sequence = 0;
const defaults = {
  boxLength: 100, boxWidth: 95, boxHeight: 50, wallThickness: 2.5, cornerRadius: 5,
  bottomThickness: 2, lidThickness: 2, lidClearance: 0.2, internalClearance: 0.5,
  slidingSkirtDepth: 6, slidingSkirtThickness: 1.4, slidingRailDepth: 0.4,
  slidingVerticalClearance: 0.2, slidingFloorRadius: 2, slidingEdgeChamfer: 0.5,
  withSlidingGrip: true, slidingGripProjection: 0.8,
  withSlidingLock: true, slidingLockInterference: 0.2,
  withNotch: true, withLid: true, lidStyle: 'sliding',
  withStacking: false, dividerCountX: 0, dividerCountY: 0,
  compartmentSizesX: [], compartmentSizesY: [], pullLedges: 'none',
  withLidArtwork: false, withLidLogo: false, withLidText: false, withColorInlay: false,
  itemsShown: 'box', colorShown: 'all',
};

function run(settings = {}, body, extension = 'stl') {
  const config = { ...defaults, ...settings };
  const output = join(temporary, `${sequence++}.${extension}`);
  let source = join(root, 'round_box_drawer.scad');
  if (body) {
    source = join(temporary, `${sequence}-fixture.scad`);
    writeFileSync(source, `include <round_box_drawer.scad>\nslidingChecks() { ${body} }\n`);
    config.withLid = false;
    config.itemsShown = 'lid';
  }
  const result = spawnSync(executable, [
    '-o', output, ...(extension === 'stl' ? ['--export-format', 'asciistl'] : []),
    ...Object.entries(config).flatMap(([key, value]) => ['-D', `${key}=${JSON.stringify(value)}`]), source,
  ], {
    cwd: root, encoding: 'utf8', timeout: 600_000, maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, OPENSCADPATH: [root, process.env.OPENSCADPATH].filter(Boolean).join(delimiter) },
  });
  assert.ifError(result.error);
  return { ...result, output, log: result.stdout + result.stderr };
}

function render(settings, body, shells = 1) {
  const result = run(settings, body);
  assert.equal(result.status, 0, result.log);
  assert.doesNotMatch(result.log, /ERROR:|WARNING:|not a valid 2-manifold/i);
  return inspectMesh(readStlVertices(readFileSync(result.output)), shells);
}

function empty(result) {
  assert.doesNotMatch(result.log, /ERROR:|WARNING:/i);
  if (!/Current top level object is empty/.test(result.log)) {
    assert.doesNotMatch(readFileSync(result.output, 'utf8'), /facet normal/);
  }
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.003, `${actual} must be near ${expected}`);
}

for (const [name, overrides] of [
  ['saved dimensions', {}],
  ['reference proportions', { boxLength: 76.8, boxWidth: 56.8, boxHeight: 19, cornerRadius: 8, wallThickness: 3.4 }],
  ['long custom fit', { boxLength: 180, boxWidth: 70, boxHeight: 35, cornerRadius: 7, wallThickness: 3,
    lidThickness: 2.4, lidClearance: 0.3, slidingSkirtDepth: 7.5, slidingSkirtThickness: 1.5,
    slidingRailDepth: 0.45, slidingVerticalClearance: 0.3, slidingFloorRadius: 1.5, slidingEdgeChamfer: 0.4 }],
  ['wider than long', { boxLength: 55, boxWidth: 100 }],
  ['short grip patch', { boxLength: 32, boxWidth: 28, boxHeight: 19 }],
]) {
  test(`sliding ${name}: raised footprint, skirt, rim, floor, and unlocked travel`, () => {
    const s = { ...defaults, ...overrides };
    const box = render(s), lid = render({ ...s, itemsShown: 'lid' });
    const { boxLength: l, boxWidth: w, boxHeight: h, lidThickness: t, wallThickness: wt,
      slidingSkirtDepth: depth, slidingSkirtThickness: skirt, slidingRailDepth: rail } = s;
    const inset = skirt + s.lidClearance / 2, seat = h - t, railZ = seat - depth / 3;
    const projection = s.slidingGripProjection;
    box.bounds.flat().forEach((v, i) => near(v, [0, -projection, 0, l, w + projection, seat - s.slidingVerticalClearance][i]));
    lid.bounds.flat().forEach((v, i) => near(v, [0, -w - 2 * wt - projection, 0, l, -2 * wt + projection, t + depth][i]));
    const lidPoint = (x, y, z) => [x, y - w - 2 * wt, z];
    assert.equal(box.contains([l / 2, w / 2, s.bottomThickness - 0.1]), true);
    assert.equal(box.contains([l / 2, w / 2, s.bottomThickness + 0.1]), false);
    assert.equal(box.contains([l / 2, inset - rail + 0.1, railZ]), true, 'External retaining bead');
    assert.equal(box.contains([l / 2, inset - 0.1, railZ - rail - 0.5]), false, 'Inset wall below bead');
    assert.equal(lid.contains(lidPoint(l / 2, skirt - rail + 0.1, t + depth / 3)), false, 'Matching groove');
    assert.equal(lid.contains(lidPoint(l / 2, skirt - rail + 0.1, t + 0.3)), true, 'Skirt above groove');
    assert.equal(lid.contains(lidPoint(s.cornerRadius - 0.1, 0.7, t + 1)), false, 'Open skirt end');
    assert.equal(lid.contains(lidPoint(s.cornerRadius + s.lidClearance / 2 + 0.2, 0.7, t + 1)), true);
    assert.equal(box.contains([s.cornerRadius - 0.1, 0.5, seat - s.slidingVerticalClearance - 0.1]), true, 'Rear stop');
    empty(run({ ...s, withSlidingLock: false }, `
      for (travel=[0,0.01,lidClearance/2,lidClearance,0.5,1,cornerRadius/2,cornerRadius,
                   boxLength/4,boxLength/2,boxLength])
        intersection() {
          slidingBox();
          slidingAssemblyPlacement(travel) slidingLidBody(false);
        }
    `));
  });
}

test('sliding print layout separates both parts and the closed assembly has the requested envelope', () => {
  const print = render({ itemsShown: 'both' }, undefined, 2);
  print.bounds.flat().forEach((v, i) => near(v, [0, -100.8, 0, 100, 95.8, 47.8][i]));
  const closed = render({}, `
    union() { slidingBox(); slidingAssemblyPlacement() slidingLidBody(false); }
  `, 2);
  closed.bounds.flat().forEach((v, i) => near(v, [0, -0.8, 0, 100, 95.8, 50][i]));
  empty(run({}, 'intersection() { slidingBox(); slidingAssemblyPlacement() slidingLidBody(false); }'));
});

test('large grips expand print spacing without changing assembly alignment', () => {
  const settings = { slidingGripProjection: 2.4 };
  render({ ...settings, itemsShown: 'both' }, undefined, 2);
  const lid = render({ ...settings, itemsShown: 'lid' });
  lid.bounds.flat().forEach((v, i) => near(v, [0, -104.2, 0, 100, -4.4, 8][i]));
  empty(run(settings, 'intersection() { slidingBox(); slidingLidBody(false); }'));
  empty(run(settings, 'intersection() { slidingBox(); slidingAssemblyPlacement() slidingLidBody(false); }'));
});

test('sliding rails capture the lid vertically and the rear stop prevents overclosing', () => {
  for (const transform of [
    'translate([0,0,0.8]) slidingAssemblyPlacement()',
    'slidingAssemblyPlacement(-0.3)',
  ]) {
    const result = run({}, `intersection() { slidingBox(); ${transform} slidingLidBody(false); }`);
    assert.equal(result.status, 0, result.log);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/i);
    assert.ok(readStlVertices(readFileSync(result.output)).length > 0, 'Retaining features must physically engage');
  }
});

test('sliding tall dividers and pull ledges stay out of the moving skirt', () => {
  const settings = { dividerCountX: 1, dividerCountY: 1, dividerHeight: 45.5,
    pullLedges: 'both', pullWidth: 20, pullProjection: 4, pullTopOffset: 2.5 };
  render(settings);
  empty(run({ ...settings, withSlidingLock: false }, `
    for (travel=[0,0.1,1,10,50,100])
      intersection() { slidingBox(); slidingAssemblyPlacement(travel) slidingLidBody(false); }
  `));
  empty(run(settings, `
    for (travel=[0,5,10,50,100])
      intersection() { slidingBox(); slidingAssemblyPlacement(travel) slidingLidBody(false); }
  `));
});

test('sliding finishing features round the floor and soften edges without short-end grip cuts', () => {
  const plain = { slidingFloorRadius: 0, slidingEdgeChamfer: 0, withSlidingGrip: false, withNotch: false };
  const box = render(), plainBox = render(plain);
  const lid = render({ itemsShown: 'lid' }), plainLid = render({ ...plain, itemsShown: 'lid' });
  for (const [point, decorated, undecorated] of [
    [[2.75, 47.5, 2.25], true, false],
    [[0.1, 47.5, 0.1], false, true],
    [[99.9, 48.5, 38.8], true, true],
  ]) {
    assert.equal(box.contains(point), decorated);
    assert.equal(plainBox.contains(point), undecorated);
  }
  for (const point of [[99.5, -52.5, 7.5], [0.1, -52.5, 0.1]]) {
    assert.equal(lid.contains(point), false);
    assert.equal(plainLid.contains(point), true);
  }
  assert.equal(lid.contains([99.9, -51.5, 2.5]), true, 'Old short-end grip cuts are gone');
});

test('raised grips project from both long sides of both parts and toggle independently of the lock', () => {
  for (const withSlidingLock of [false, true]) {
    const box = render({ withSlidingLock });
    const lid = render({ withSlidingLock, itemsShown: 'lid' });
    const plainBox = render({ withSlidingLock, withSlidingGrip: false });
    const plainLid = render({ withSlidingLock, withSlidingGrip: false, itemsShown: 'lid' });
    for (const y of [-0.7, 95.7]) {
      assert.equal(box.contains([93.4, y, 36]), true);
      assert.equal(plainBox.contains([93.4, y, 36]), false);
      assert.equal(lid.contains([93.4, y - 100, 5]), true);
      assert.equal(plainLid.contains([93.4, y - 100, 5]), false);
      assert.equal(box.contains([91.9, y, 36]), false, 'Ribs have finger-catching gaps');
      assert.equal(lid.contains([91.9, y - 100, 5]), false);
    }
    plainBox.bounds.flat().forEach((v, i) => near(v, [0, 0, 0, 100, 95, 47.8][i]));
    plainLid.bounds.flat().forEach((v, i) => near(v, [0, -100, 0, 100, -5, 8][i]));
  }
});

test('snap bumps mate with seated pockets on connected, relieved skirt tabs', () => {
  const box = render(), lid = render({ itemsShown: 'lid' });
  const plainBox = render({ withSlidingLock: false });
  const plainLid = render({ withSlidingLock: false, itemsShown: 'lid' });
  for (const side of [0, 1]) {
    const y = value => side ? 95 - value : value;
    const boxPoint = [8.1, y(1.3), 42.85];
    assert.equal(box.contains(boxPoint), true, 'Bump projects beyond the sliding clearance');
    assert.equal(plainBox.contains(boxPoint), false);
    const pocket = [8.1, y(1.3) - 100, 7.15];
    assert.equal(lid.contains(pocket), false, 'Pocket receives the bump');
    assert.equal(plainLid.contains(pocket), true);
    assert.equal(lid.contains([8.1, y(0.9) - 100, 7.15]), true, 'Pocket has remaining wall skin');
    assert.equal(lid.contains([10.1, y(1.3) - 100, 7.15]), true, 'Pocket is localized');
    assert.equal(lid.contains([13.1, y(0.7) - 100, 6]), false, 'Relief slot frees the tab');
    assert.equal(plainLid.contains([13.1, y(0.7) - 100, 6]), true);
    assert.equal(lid.contains([22.1, y(0.7) - 100, 6]), true, 'Spring root remains attached');
    assert.equal(lid.contains([13.1, y(0.7) - 100, 7.15]), true, 'Tab is solid below the slot');
  }
});

for (const settings of [
  {},
  { lidClearance: 0.3, slidingLockInterference: 0.1, withSlidingGrip: false },
  { slidingLockInterference: 0.3, withNotch: false },
]) {
  test(`snap engagement confines interference to the flexible tabs: ${JSON.stringify(settings)}`, () => {
    const overlap = travel => `intersection() {
      slidingBox(); slidingAssemblyPlacement(${travel}) slidingLidBody(false);
    }`;
    empty(run(settings, `
      for (travel=[0,0.05,0.1,4.6,5,10,boxLength/4,boxLength/2,boxLength])
        ${overlap('travel')}
    `));
    const engaged = render(settings, overlap(2), 2);
    const s = { ...defaults, ...settings };
    const maxIntrusion = s.slidingSkirtThickness;
    const minIntrusion = maxIntrusion - s.slidingLockInterference;
    near(engaged.bounds[0][1], minIntrusion);
    near(engaged.bounds[1][1], s.boxWidth - minIntrusion);
    for (const triangle of engaged.triangles) for (const [, y] of triangle) {
      assert.ok((y >= minIntrusion - 0.001 && y <= maxIntrusion + 0.001)
        || (y >= s.boxWidth - maxIntrusion - 0.001 && y <= s.boxWidth - minIntrusion + 0.001),
      'Interference cannot exceed the configured lateral tab deflection');
    }
    render(settings, `
      for (travel=[0.5:0.5:4])
        translate([travel*boxLength,0,0]) ${overlap('travel')}
    `, 16);
    empty(run(settings, `
      for (travel=[0:0.1:4.6]) {
        difference() { ${overlap('travel')} slidingLockBumps(); }
        difference() {
          ${overlap('travel')}
          slidingAssemblyPlacement(travel) slidingPrintPlacement()
          slidingSides()
            translate([slidingOpenX(),-1,slidingLockSlotZ()+0.3])
            cube([16,slidingSkirtThickness+2,slidingLockTabHeight()+0.01]);
        }
      }
    `));
  });
}

test('disabled grip and lock tuning controls are ignored', () => {
  const settings = { withSlidingGrip: false, withSlidingLock: false };
  const normal = run(settings, undefined, 'csg');
  const ignored = run({ ...settings, slidingGripProjection: 'unused', slidingLockInterference: 'unused' }, undefined, 'csg');
  assert.doesNotMatch(ignored.log, /ERROR:|WARNING:/i);
  assert.equal(readFileSync(normal.output, 'utf8'), readFileSync(ignored.output, 'utf8'));
});

test('sliding limits reject invalid fits and preserve the minimum rim skin', () => {
  render({ wallThickness: 2.3 });
  render({ slidingSkirtThickness: 1.2 });
  for (const [settings, message] of [
    [{ wallThickness: 2.299 }, /rim must retain 0.8/],
    [{ lidClearance: 0 }, /lidClearance must be positive/],
    [{ lidClearance: 0.8, wallThickness: 3, cornerRadius: 6 }, /must exceed lidClearance/],
    [{ slidingVerticalClearance: -0.1 }, /slidingVerticalClearance must be positive/],
    [{ slidingSkirtThickness: 1.199 }, /groove must retain 0.8/],
    [{ slidingSkirtDepth: 4 }, /rail must retain 0.8 mm below/],
    [{ slidingSkirtDepth: 50 }, /shoulder must clear/],
    [{ slidingRailDepth: 'deep' }, /slidingRailDepth must be positive/],
    [{ slidingFloorRadius: -1 }, /slidingFloorRadius must be nonnegative/],
    [{ slidingFloorRadius: 3 }, /corner radius must exceed/],
    [{ slidingEdgeChamfer: 2 }, /chamfer must be smaller/i],
    [{ withSlidingGrip: 'yes' }, /withSlidingGrip must be true or false/],
    [{ slidingGripProjection: 0 }, /slidingGripProjection must be positive/],
    [{ slidingGripProjection: 'wide' }, /slidingGripProjection must be positive/],
    [{ slidingGripProjection: 3 }, /grip ramps need more height/],
    [{ boxLength: 30.1 }, /grips need 1.2 mm/],
    [{ withSlidingLock: 'yes' }, /withSlidingLock must be true or false/],
    [{ slidingLockInterference: 0 }, /slidingLockInterference must be positive/],
    [{ slidingLockInterference: 'tight' }, /slidingLockInterference must be positive/],
    [{ boxLength: 29, withSlidingGrip: false }, /lock needs a 16 mm spring/],
    [{ slidingSkirtDepth: 5.5 }, /lock slot must clear the groove/],
    [{ slidingLockInterference: 0.4 }, /lock bump ramps need more tab height/],
    [{ slidingSkirtThickness: 1.2, slidingLockInterference: 0.3 }, /lock pocket must retain 0.8/],
    [{ slidingSkirtThickness: 8, wallThickness: 10, cornerRadius: 15, withSlidingGrip: false },
      /lock deflection exceeds the conservative spring strain limit/],
    [{ dividerCountX: 1, dividerHeight: 45.51 }, /dividerHeight must not exceed 45.5/],
    [{ pullLedges: 'both', pullTopOffset: 2.49 }, /pullTopOffset must clear the sliding plate/],
  ]) {
    const result = run(settings, undefined, 'csg');
    assert.match(result.log, /ERROR: Assertion/, JSON.stringify(settings));
    assert.match(result.log, message, JSON.stringify(settings));
    assert.doesNotMatch(result.log, /WARNING:/i);
  }
});

test('inactive sliding controls and the retired bevel do not alter other modes', () => {
  for (const settings of [{ withLid: false }, { withLid: true, lidStyle: 'magnetic' }]) {
    const normal = run(settings, undefined, 'csg');
    const ignored = run({ ...settings, slidingSkirtDepth: -1, slidingSkirtThickness: 'unused',
      slidingRailDepth: -1, slidingVerticalClearance: -1, slidingFloorRadius: -1,
      slidingEdgeChamfer: -1, withSlidingGrip: 'unused', slidingGripProjection: 'unused',
      withSlidingLock: 'unused', slidingLockInterference: 'unused', lidEdgeThickness: 'unused' }, undefined, 'csg');
    assert.doesNotMatch(ignored.log, /ERROR:|WARNING:/i);
    assert.equal(readFileSync(normal.output, 'utf8'), readFileSync(ignored.output, 'utf8'));
  }
  const normal = run({}, undefined, 'csg');
  const ignored = run({ lidEdgeThickness: 'unused' }, undefined, 'csg');
  assert.doesNotMatch(ignored.log, /ERROR:|WARNING:/i);
  assert.equal(readFileSync(normal.output, 'utf8'), readFileSync(ignored.output, 'utf8'));
});
