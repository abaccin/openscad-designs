import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';

// Read central-directory sizes so this also handles Bambu's data descriptors.
export function readZip(data) {
  let end = data.length - 22;
  while (end >= Math.max(0, data.length - 65557) && data.readUInt32LE(end) !== 0x06054b50) end--;
  assert.ok(end >= 0, 'ZIP end record must exist');
  let central = data.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < data.readUInt16LE(end + 10); i++) {
    assert.equal(data.readUInt32LE(central), 0x02014b50);
    const method = data.readUInt16LE(central + 10);
    const size = data.readUInt32LE(central + 20);
    const nameLength = data.readUInt16LE(central + 28);
    const name = data.toString('utf8', central + 46, central + 46 + nameLength);
    const local = data.readUInt32LE(central + 42);
    assert.equal(data.readUInt32LE(local), 0x04034b50);
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    assert.ok(method === 0 || method === 8, 'Expected stored or deflated ZIP entry');
    const compressed = data.subarray(start, start + size);
    const content = method === 0 ? compressed : inflateRawSync(compressed);
    assert.equal(content.length, data.readUInt32LE(central + 24));
    files.set(name, content.toString('utf8'));
    central += 46 + nameLength + data.readUInt16LE(central + 30) + data.readUInt16LE(central + 32);
  }
  return files;
}
