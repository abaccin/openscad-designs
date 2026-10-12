import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { inspectMesh } from '../../../tests/helpers/mesh.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'boston_hs40_foot.scad');
const configured = process.env.OPENSCAD || 'openscad';
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const defaults = {
  overall_length: 118.4, body_width: 30, base_width: 40, plate_thickness: 5,
  flare_start_from_top: 90, bottom_rise: 3, toe_radius: 5,
  large_hole_diameter: 12, large_hole_from_top: 56,
  recess_width: 12.5, recess_length: 28, recess_depth: 3,
  recess_start_from_top: 8, small_hole_diameter: 6.3,
};

function render(t, overrides) {
  const temporary = mkdtempSync(join(tmpdir(), 'boston-hs40-foot-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const output = join(temporary, 'foot.stl');
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

for (const [name, overrides, expectedBounds] of [
  ['measured defaults', {}, [[-20, 0, 0], [20, 118.4, 5]]],
  ['resized foot', {
    overall_length: 130, body_width: 34, base_width: 46, plate_thickness: 6,
    flare_start_from_top: 94, bottom_rise: 4, toe_radius: 6,
    large_hole_diameter: 14, large_hole_from_top: 55,
    recess_width: 14, recess_length: 32, recess_depth: 3.5,
    recess_start_from_top: 78, small_hole_diameter: 7, curve_steps: 64, $fn: 128,
  }, [[-23, 0, 0], [23, 130, 6]]],
  ['repositioned recess and flat bottom', {
    recess_start_from_top: 20, bottom_rise: 0, toe_radius: 7,
  }, [[-20, 0, 0], [20, 118.4, 5]]],
]) {
  test(`Boston HS 40 foot ${name}: outline, through-holes, and capsule recess`, t => {
    const { result, output } = render(t, overrides);
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
    const topRadius = s.body_width / 2;
    const topY = s.overall_length - topRadius;
    const flareY = s.overall_length - s.flare_start_from_top;
    const toeX = s.base_width / 2 - s.toe_radius;
    const midZ = s.plate_thickness / 2;
    const floorZ = s.plate_thickness - s.recess_depth;
    const recessRadius = s.recess_width / 2;
    const upperY = s.overall_length - s.recess_start_from_top - recessRadius;
    const lowerY = s.overall_length - s.recess_start_from_top - s.recess_length + recessRadius;
    const recessMidY = (upperY + lowerY) / 2;
    const largeY = s.overall_length - s.large_hole_from_top;
    const margin = 0.08;
    const expectPoint = (point, expected, message) => {
      assert.equal(mesh.contains(point), expected, `${message}: ${point.join(', ')}`);
    };

    if (name === 'measured defaults') {
      assert.equal(s.overall_length - largeY, 56);
      assert.equal(s.recess_start_from_top, 8);
      assert.equal(s.recess_start_from_top + s.recess_length, 36);
      assert.ok(Math.abs(s.overall_length - upperY - 14.25) < 1e-9);
      assert.ok(Math.abs(s.overall_length - lowerY - 29.75) < 1e-9);
      assert.equal(floorZ, 2);
    }

    for (const angle of [0, 45, 90, 135, 180]) {
      const direction = [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
      for (const [delta, inside] of [[-margin, true], [margin, false]]) {
        expectPoint([
          (topRadius + delta) * direction[0],
          topY + (topRadius + delta) * direction[1],
          midZ,
        ], inside, 'Semicircular top radius');
      }
    }
    for (const side of [-1, 1]) {
      for (const y of [flareY, (flareY + topY) / 2]) {
        expectPoint([side * (topRadius - margin), y, midZ], true, 'Straight body width');
        expectPoint([side * (topRadius + margin), y, midZ], false, 'Outside straight body');
      }
      const middleFlareY = (flareY + s.toe_radius) / 2;
      const middleFlareX = (s.body_width + s.base_width) / 4;
      expectPoint([side * (middleFlareX - margin), middleFlareY, midZ], true, 'Smooth flare');
      expectPoint([side * (middleFlareX + margin), middleFlareY, midZ], false, 'Outside flare');
      expectPoint([side * (s.base_width / 2 - margin), s.toe_radius, midZ], true, 'Base width');
      expectPoint([side * (s.base_width / 2 + margin), s.toe_radius, midZ], false,
        'Outside maximum base width');
      expectPoint([side * toeX, margin, midZ], true, 'Lowest toe retains material');
      expectPoint([side * toeX, -margin, midZ], false, 'Toe rests at Y=0');

      const toeAngle = side === 1 ? -Math.PI / 4 : 5 * Math.PI / 4;
      for (const [delta, inside] of [[-margin, true], [margin, false]]) {
        expectPoint([
          side * toeX + (s.toe_radius + delta) * Math.cos(toeAngle),
          s.toe_radius + (s.toe_radius + delta) * Math.sin(toeAngle),
          midZ,
        ], inside, 'Rounded toe radius');
      }
    }
    expectPoint([0, s.bottom_rise - margin, midZ], false, 'Bottom-center inward rise');
    expectPoint([0, s.bottom_rise + margin, midZ], true, 'Material above bottom-center rise');
    const solidY = (flareY + topY) / 2;
    for (const z of [margin, s.plate_thickness - margin]) {
      expectPoint([topRadius - 1, solidY, z], true, 'Constant plate thickness');
    }
    for (const z of [-margin, s.plate_thickness + margin]) {
      expectPoint([topRadius - 1, solidY, z], false, 'Flat front and back faces');
    }

    function checkHole(y, diameter, zValues) {
      for (const z of zValues) {
        expectPoint([0, y, z], false, 'Through-hole center');
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          for (const [delta, inside] of [[-margin, false], [margin, true]]) {
            const radius = diameter / 2 + delta;
            expectPoint([radius * Math.cos(angle), y + radius * Math.sin(angle), z],
              inside, 'Hole diameter and surrounding material');
          }
        }
      }
    }
    checkHole(largeY, s.large_hole_diameter, [margin, midZ, s.plate_thickness - margin]);
    for (const y of [upperY, lowerY]) {
      checkHole(y, s.small_hole_diameter, [margin, floorZ - margin]);
      for (const z of [floorZ + margin, s.plate_thickness - margin]) {
        expectPoint([0, y, z], false, 'Small holes open into the recess');
      }
    }

    for (const z of [floorZ + margin, s.plate_thickness - margin]) {
      for (const side of [-1, 1]) {
        expectPoint([side * (recessRadius - margin), recessMidY, z], false, 'Recess width');
        expectPoint([side * (recessRadius + margin), recessMidY, z], true, 'Outside recess');
      }
      for (const [y, side] of [[upperY, 1], [lowerY, -1]]) {
        for (const angle of [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI]) {
          for (const [delta, inside] of [[-margin, false], [margin, true]]) {
            const radius = recessRadius + delta;
            expectPoint([
              radius * Math.cos(angle), y + side * radius * Math.sin(angle), z,
            ], inside, 'Circular capsule ends and total recess length');
          }
        }
        expectPoint([recessRadius - margin, y + side * (recessRadius - margin), z], true,
          'Capsule corners remain rounded, not rectangular');
      }
    }
    for (const z of [margin, floorZ - margin]) {
      expectPoint([0, recessMidY, z], true, 'Solid floor between the small holes');
      expectPoint([recessRadius - margin, upperY, z], true, 'Solid floor beside small hole');
    }
    expectPoint([0, recessMidY, floorZ + margin], false, 'Exact recess depth');
  });
}

for (const [name, overrides, message] of [
  ['no recess floor', { recess_depth: 5 }, /leave a solid floor/],
  ['invalid capsule proportions', { recess_length: 12 }, /capsule length must exceed its width/],
  ['small holes too wide', { small_hole_diameter: 12.5 }, /smaller than the recess width/],
  ['small holes merge', { recess_length: 18 }, /Small holes must remain separate/],
  ['large hole overlaps recess', { large_hole_from_top: 30 }, /must not overlap/],
  ['flare enters top cap', { flare_start_from_top: 14 }, /Flare must start below the top cap/],
  ['bottom rise exceeds toes', { bottom_rise: 5 }, /smaller than the toe radius/],
  ['recess exits bottom', { recess_start_from_top: 90 }, /above the toe region/],
  ['recess reaches top tip', { recess_start_from_top: 0 }, /below the top tip/],
  ['large hole removes side wall', { large_hole_diameter: 30 }, /smaller than the body width/],
  ['odd curve resolution', { curve_steps: 9 }, /even integer of at least 8/],
]) {
  test(`Boston HS 40 foot rejects ${name}`, t => {
    const { result } = render(t, overrides);
    assert.notEqual(result.status, 0, 'Invalid settings must fail rendering');
    assert.match(result.stdout + result.stderr, /ERROR: Assertion/);
    assert.match(result.stdout + result.stderr, message);
  });
}
