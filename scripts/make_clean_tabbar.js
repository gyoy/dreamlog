const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const bgPath = path.join(__dirname, '..', 'assets', 'record', 'bottom-tab-background.png');
  const destPath = path.join(__dirname, '..', 'assets', 'record', 'bottom-tab-background-clean.png');

  // Paint a white rectangle over the icons/text area
  // Bounding box of icons/text: x: 120 to 1000, y: 345 to 511
  const width = 1000 - 120;
  const height = 511 - 345;

  const whiteOverlay = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1.0 }
    }
  }).png().toBuffer();

  await sharp(bgPath)
    .composite([{ input: whiteOverlay, top: 345, left: 120 }])
    .toFile(destPath);

  console.log('Clean tab bar background generated at: ' + destPath);
}

main().catch(console.error);
