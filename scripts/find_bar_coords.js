const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const bgPath = path.join(__dirname, '..', 'assets', 'record', 'bottom-tab-background.png');
  const { data, info } = await sharp(bgPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  // Let's find y-bounds where the alpha channel is not 0
  let minY = h, maxY = 0;
  let minX = w, maxX = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * c;
      const alpha = data[idx + 3]; // Alpha channel (RGBA)
      if (alpha > 5) { // non-transparent
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  console.log('Detected Tab Bar Capsule bounds in bottom-tab-background.png:');
  console.log(`x = ${minX} to ${maxX} (width: ${maxX - minX + 1})`);
  console.log(`y = ${minY} to ${maxY} (height: ${maxY - minY + 1})`);
}

main().catch(console.error);
