import { deflateRawSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

// A 3MF is an OPC ZIP package. ZIP32 is sufficient for these generated meshes;
// reject oversized archives rather than writing truncated offsets.
export function createZip(entries) {
  if (!entries.length || entries.length > 65535) throw new Error('Invalid ZIP entry count.');
  const localRecords = [];
  const directory = [];
  const names = new Set();
  let offset = 0;
  for (const [path, content] of entries) {
    if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..') || names.has(path)) {
      throw new Error(`Invalid or duplicate ZIP path: ${path}`);
    }
    names.add(path);
    const name = Buffer.from(path, 'utf8');
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const compressed = deflateRawSync(data);
    if (name.length > 65535 || data.length >= 0xffffffff || offset + 30 + name.length + compressed.length >= 0xffffffff) {
      throw new Error('3MF archive exceeds ZIP32 limits.');
    }
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    local.copy(central, 6, 4, 30);
    central.writeUInt32LE(offset, 42);
    localRecords.push(local, name, compressed);
    directory.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralSize = directory.reduce((size, data) => size + data.length, 0);
  if (offset + centralSize >= 0xffffffff) throw new Error('3MF archive exceeds ZIP32 limits.');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localRecords, ...directory, end]);
}
