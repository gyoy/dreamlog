const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const targetDir = path.join(__dirname, '..', 'assets', 'home');
  const bgPath = path.join(targetDir, 'home-background.png');
  const destPath = path.join(targetDir, 'home-background-debug-align.png');

  // Let's create an SVG overlay with the new proposed positions
  let svg = `<svg width="393" height="852" xmlns="http://www.w3.org/2000/svg">`;
  
  const drawRect = (rect, color) => {
    svg += `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1"/>`;
  };

  // Proposed Count Box: x: 28, y: 384, width: 30, height: 24 (representing fontSize 24 baseline at 408)
  drawRect({ x: 28, y: 384, width: 30, height: 24 }, 'red');

  // Proposed Delta Box: x: 94, y: 427, width: 60, height: 18 (representing center 436)
  drawRect({ x: 94, y: 427, width: 60, height: 18 }, 'blue');

  // Also draw header greeting box: x=89, y=43, width=245, height=38
  drawRect({ x: 89, y: 43, width: 245, height: 38 }, 'lime');

  svg += `</svg>`;

  await sharp(bgPath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFile(destPath);

  console.log(`Debug image saved at: ${destPath}`);
}

main().catch(console.error);
