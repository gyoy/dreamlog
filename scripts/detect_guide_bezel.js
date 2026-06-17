const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const filePath = 'C:\\Users\\user\\Downloads\\kkumgyeol-visual-implementation-guide-unzipped\\kkumgyeol-visual-implementation-guide\\assets\\screens\\02-home.png';
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  const y = Math.floor(h / 2);
  let leftBorder = 0;
  let rightBorder = w - 1;
  
  for (let x = 0; x < w; x++) {
    const idx = (y * w + x) * c;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    if (r > 240 && g > 240 && b > 240) {
      leftBorder = x;
      break;
    }
  }

  for (let x = w - 1; x >= 0; x--) {
    const idx = (y * w + x) * c;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    if (r > 240 && g > 240 && b > 240) {
      rightBorder = x;
      break;
    }
  }

  const xMid = Math.floor(w / 2);
  let topBorder = 0;
  let bottomBorder = h - 1;
  for (let yScan = 0; yScan < h; yScan++) {
    const idx = (yScan * w + xMid) * c;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    if (r > 240 && g > 240 && b > 240) {
      topBorder = yScan;
      break;
    }
  }
  for (let yScan = h - 1; yScan >= 0; yScan--) {
    const idx = (yScan * w + xMid) * c;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    if (r > 240 && g > 240 && b > 240) {
      bottomBorder = yScan;
      break;
    }
  }

  console.log('Detected screen bounds for guide (1055x1491):', {
    left: leftBorder,
    top: topBorder,
    width: rightBorder - leftBorder + 1,
    height: bottomBorder - topBorder + 1
  });
}

main().catch(console.error);
