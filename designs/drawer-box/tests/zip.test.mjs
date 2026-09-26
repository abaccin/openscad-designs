import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { test } from 'node:test';
import { createZip } from '../scripts/lib/zip.mjs';

test('ZIP package contains valid local and central records with correct CRC and sizes', () => {
  const entries = [['3D/3dmodel.model', '123456789'], ['Metadata/settings.config', '{"name":"test"}']];
  const archive = createZip(entries);
  const end = archive.length - 22;
  assert.equal(archive.readUInt32LE(end), 0x06054b50);
  assert.equal(archive.readUInt16LE(end + 8), 2);
  assert.equal(archive.readUInt16LE(end + 10), 2);
  const centralStart = archive.readUInt32LE(end + 16);
  assert.equal(centralStart + archive.readUInt32LE(end + 12), end);
  let central = centralStart;
  let expectedLocal = 0;
  for (const [name, content] of entries) {
    assert.equal(archive.readUInt32LE(central), 0x02014b50);
    const local = archive.readUInt32LE(central + 42);
    assert.equal(local, expectedLocal);
    assert.equal(archive.readUInt32LE(local), 0x04034b50);
    assert.equal(archive.readUInt16LE(local + 6), 0x0800);
    assert.equal(archive.readUInt16LE(local + 8), 8);
    const length = archive.readUInt16LE(local + 26);
    assert.equal(archive.toString('utf8', local + 30, local + 30 + length), name);
    assert.equal(archive.toString('utf8', central + 46, central + 46 + length), name);
    const compressedSize = archive.readUInt32LE(local + 18);
    const dataStart = local + 30 + length;
    assert.equal(inflateRawSync(archive.subarray(dataStart, dataStart + compressedSize)).toString(), content);
    assert.equal(archive.readUInt32LE(local + 22), Buffer.byteLength(content));
    assert.equal(archive.readUInt32LE(central + 16), archive.readUInt32LE(local + 14));
    assert.equal(archive.readUInt32LE(central + 20), compressedSize);
    assert.equal(archive.readUInt32LE(central + 24), Buffer.byteLength(content));
    if (content === '123456789') assert.equal(archive.readUInt32LE(local + 14), 0xcbf43926);
    expectedLocal = dataStart + compressedSize;
    central += 46 + length;
  }
  assert.equal(expectedLocal, centralStart);
  assert.equal(central, end);
});

test('ZIP refuses duplicate, empty, or unsafe paths', () => {
  for (const name of ['', '/absolute', '../file', 'a/../file', 'a\\file']) {
    assert.throws(() => createZip([[name, 'value']]), /ZIP path/);
  }
  assert.throws(() => createZip([]), /entry count/);
  assert.throws(() => createZip([['same', 'a'], ['same', 'b']]), /duplicate/);
});
