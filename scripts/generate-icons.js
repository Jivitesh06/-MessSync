import fs from 'fs';
import zlib from 'zlib';

// Function to generate an uncompressed or zlib-compressed PNG with solid colors and shapes
function createPng(width, height) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;
  const cornerR = width * 0.22;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Rounded rect boundary
      const dx = Math.max(Math.abs(x - cx) - (cx - cornerR), 0);
      const dy = Math.max(Math.abs(y - cy) - (cy - cornerR), 0);
      const distToCorner = Math.sqrt(dx * dx + dy * dy);
      
      if (distToCorner > cornerR) {
        // Transparent
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
        continue;
      }
      
      // Base background: Chitkara Red #E31B23
      let r = 227;
      let g = 27;
      let b = 35;
      let a = 255;
      
      // Cloche dome
      // Center at cx, cy + 0.05 * height, radius = width * 0.24
      const clocheY = cy + height * 0.04;
      const clocheDist = Math.sqrt((x - cx) * (x - cx) + (y - clocheY) * (y - clocheY));
      const inClocheDome = (clocheDist < width * 0.23 && y <= clocheY);
      const inPlate = (Math.abs(x - cx) < width * 0.28 && Math.abs(y - (clocheY + height * 0.04)) < height * 0.025);
      const inKnob = (Math.sqrt((x - cx) * (x - cx) + (y - (clocheY - width * 0.24)) * (y - (clocheY - width * 0.24))) < width * 0.04);
      
      if (inClocheDome || inPlate || inKnob) {
        // White cloche
        r = 255;
        g = 255;
        b = 255;
        // Inside inner circle
        if (inKnob && Math.sqrt((x - cx) * (x - cx) + (y - (clocheY - width * 0.24)) * (y - (clocheY - width * 0.24))) < width * 0.02) {
          r = 227;
          g = 27;
          b = 35;
        }
      }
      
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // Build PNG chunk
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);
  
  // IDAT: Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0; // Filter None
    buffer.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  
  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  
  // Calculate CRC
  const crc = crc32(chunk.subarray(4, len + 8));
  chunk.writeInt32BE(crc, len + 8);
  return chunk;
}

// CRC32 implementation
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

fs.writeFileSync('public/icons/icon-192x192.png', createPng(192, 192));
fs.writeFileSync('public/icons/icon-512x512.png', createPng(512, 512));
fs.writeFileSync('public/icons/apple-touch-icon.png', createPng(180, 180));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180));
fs.writeFileSync('public/favicon.ico', createPng(32, 32));
console.log('Icons generated successfully!');
