import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configured = process.env.OPENSCAD || 'openscad';
const executable = process.platform === 'win32'
  ? configured.replace(/openscad\.com$/i, 'openscad.exe') : configured;
const models = {
  drawer: join(root, 'designs', 'drawer-box', 'round_box_drawer.scad'),
  coupler: join(root, 'designs', 'blind-cord-coupler', 'blind_cord_coupler.scad'),
  chandelier: join(root, 'designs', 'chandelier', 'chandelier.scad'),
  foot: join(root, 'designs', 'boston-hs40-foot', 'boston_hs40_foot.scad'),
};
const drawer = {
  boxLength: 100, boxWidth: 95, boxHeight: 50, wallThickness: 2.5, cornerRadius: 5,
  bottomThickness: 2, withLid: true, lidStyle: 'sliding', lidThickness: 2,
  lidClearance: 0.2, internalClearance: 0.5, withStacking: false,
  slidingSkirtDepth: 6, slidingSkirtThickness: 1.4, slidingRailDepth: 0.4,
  slidingVerticalClearance: 0.2, slidingFloorRadius: 2, slidingEdgeChamfer: 0.5,
  withSlidingGrip: true, slidingGripProjection: 0.8,
  withSlidingLock: true, slidingLockInterference: 0.2, withNotch: true,
  dividerCountX: 0, dividerCountY: 0, dividerHeight: 25, dividerThickness: 1.2,
  compartmentSizesX: [], compartmentSizesY: [], pullLedges: 'none',
  withLidArtwork: false, withLidLogo: false, withLidText: false, withColorInlay: false,
  magneticLidThickness: 5, magnetThickness: 3, magnetRecess: 0.1,
  itemsShown: 'box', colorShown: 'all',
};

function run(t, { model, definitions = {}, program }) {
  const temporary = mkdtempSync(join(tmpdir(), 'assertion-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  let source = models[model];
  if (program) {
    source = join(temporary, 'fixture.scad');
    writeFileSync(source, `use <${join(root, 'include', 'assertions.scad')}>\n${program}\n`);
  }
  const result = spawnSync(executable, [
    '-o', join(temporary, 'output.csg'),
    ...Object.entries(definitions).flatMap(([name, value]) => [
      '-D', `${name}=${value === undefined ? 'undef' : JSON.stringify(value)}`,
    ]),
    source,
  ], { cwd: temporary, encoding: 'utf8', timeout: 60_000 });
  assert.ifError(result.error);
  return { ...result, log: result.stdout + result.stderr };
}

for (const [name, values, expected] of [
  ['numbers, booleans, undef and nested lists',
    '[["count", 3], ["enabled", true], ["missing", undef], ["sizes", [1, ["2", false], []]]]',
    'Rule. Values: count=3, enabled=true, missing=undef, sizes=[1, ["2", false], []].'],
  ['empty strings', '[["text", ""]]', 'Rule. Values: text="".'],
  ['empty values', '[]', 'Rule.'],
  ['escaped strings', `[["text", ${JSON.stringify('"quoted"\\path\n\r\t')}]]`,
    `Rule. Values: text=${JSON.stringify('"quoted"\\path\n\r\t')}.`],
]) {
  test(`shared assertion formatter handles ${name}`, t => {
    const result = run(t, { program: `
      message = assertion_message("Rule.", ${values});
      assert(message == ${JSON.stringify(expected)}, message);
      cube(1);
    ` });
    assert.equal(result.status, 0, result.log);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/);
  });
}

for (const [name, model, definitions, expected] of [
  ['sliding corner lower bound', 'drawer', { ...drawer, slidingFloorRadius: 3 },
    ['cornerRadius=5', 'wallThickness=2.5', 'slidingFloorRadius=3', 'boxLength=100', 'boxWidth=95',
      'minimum cornerRadius (exclusive)=5.5', 'maximum cornerRadius (exclusive)=47.5']],
  ['sliding corner upper bound', 'drawer', { ...drawer, cornerRadius: 47.5 },
    ['cornerRadius=47.5', 'maximum cornerRadius (exclusive)=47.5']],
  ['nonnumeric setting', 'drawer', { ...drawer, slidingRailDepth: 'deep' },
    ['slidingRailDepth="deep"']],
  ['undefined setting', 'drawer', { ...drawer, slidingRailDepth: undefined },
    ['slidingRailDepth=undef']],
  ['boolean setting', 'drawer', { ...drawer, withLid: 'yes' },
    ['withLid="yes"']],
  ['remaining rim skin', 'drawer', { ...drawer, wallThickness: 2.299 },
    ['wallThickness=2.299', 'slidingSkirtThickness=1.4', 'lidClearance=0.2', 'remaining wall=0.799']],
  ['function assertion and compartment limits', 'drawer',
    { ...drawer, withLid: false, dividerCountX: 1, compartmentSizesX: [94] },
    ['compartmentSizesX=[94]', 'dividerCountX=1', 'dividerThickness=1.2', 'span=95', 'suppliedSpace=94', 'clearSpace=93.8']],
  ['mixed-type compartment list', 'drawer',
    { ...drawer, withLid: false, dividerCountY: 2, compartmentSizesY: [20, '15'] },
    ['compartmentSizesY=[20, "15"]']],
  ['magnetic pocket limit', 'drawer', { ...drawer, lidStyle: 'magnetic', magneticLidThickness: 4 },
    ['magneticLidThickness=4', 'magnetThickness=3', 'magnetRecess=0.1', 'minimum thickness=4.1']],
  ['text band limit', 'drawer',
    { ...drawer, itemsShown: 'lid', withLidText: true, lidText: 'Tools',
      lidTextBandHeight: 19, lidTextSize: 8, lidTextMargin: 4 },
    ['lidTextBandHeight=19', 'lidTextSize=8', 'lidTextMargin=4', 'minimum band height=20']],
  ['quoted whitespace label', 'drawer',
    { ...drawer, itemsShown: 'lid', withLidText: true, lidText: '   ' },
    ['lidText="   "']],
  ['escaped multiline label', 'drawer',
    { ...drawer, itemsShown: 'lid', withLidText: true, lidText: 'Two\nlines' },
    ['lidText="Two\\nlines"']],
  ['coupler compound constraint', 'coupler', { mouth_chamfer: 1.5, floor_thickness: 3 },
    ['mouth_chamfer=1.5', 'floor_thickness=3']],
  ['chandelier grouped dimensions', 'chandelier', { part: 'base', base_height: 0 },
    ['base_height=0']],
  ['chandelier nonnumeric dimensions', 'chandelier', { part: 'base', lower_bore_diameter: 'wide' },
    ['lower_bore_diameter="wide"']],
  ['speaker foot compound constraint', 'foot', { recess_depth: 5, plate_thickness: 5 },
    ['recess_depth=5', 'plate_thickness=5']],
]) {
  test(`assertion diagnostics report ${name}`, t => {
    const result = run(t, { model, definitions });
    assert.match(result.log, /ERROR: Assertion/);
    assert.doesNotMatch(result.log, /WARNING:/);
    const message = result.log.match(/ Values: (.*)\." in file/)?.[1];
    assert.ok(message, result.log);
    for (const value of expected) {
      assert.ok(message.includes(`${value},`) || message.endsWith(value), result.log);
    }
  });
}

for (const model of Object.keys(models)) {
  test(`shared assertion helper preserves valid ${model} compilation`, t => {
    const result = run(t, { model, definitions: model === 'drawer' ? drawer : {} });
    assert.equal(result.status, 0, result.log);
    assert.doesNotMatch(result.log, /ERROR:|WARNING:/);
  });
}
