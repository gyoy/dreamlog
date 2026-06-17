const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const bgPath = path.join(__dirname, '..', 'assets', 'record', 'bottom-tab-background.png');
  const { data, info } = await sharp(bgPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  console.log(`Image size: ${w}x${h}`);

  // Let's find rows that contain dark pixels (intensity < 200)
  const darkPixelsByCol = Array(w).fill(0);
  const darkRows = [];

  for (let y = 0; y < h; y++) {
    let rowDark = false;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * c;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const val = (r + g + b) / 3;
      if (val < 200) {
        darkPixelsByCol[x]++;
        rowDark = true;
      }
    }
    if (rowDark) {
      darkRows.push(y);
    }
  }

  // Find the columns that contain dark pixels to group the 5 tabs
  let groups = [];
  let currentGroup = null;

  for (let x = 0; x < w; x++) {
    const isDark = darkPixelsByCol[x] > 5; // filter out tiny noise
    if (isDark) {
      if (!currentGroup) {
        currentGroup = { start: x, end: x };
      } else {
        currentGroup.end = x;
      }
    } else {
      if (currentGroup) {
        if (currentGroup.end - currentGroup.start > 10) {
          groups.push(currentGroup);
        }
        currentGroup = null;
      }
    }
  }
  if (currentGroup) groups.push(currentGroup);

  console.log('Detected column groups for tabs:');
  groups.forEach((g, idx) => {
    // Find the vertical bounding box for this specific group
    let minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = g.start; x <= g.end; x++) {
        const idx = (y * w + x) * c;
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        if ((r + g + b) / 3 < 200) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    console.log(`Tab ${idx+1}: x = ${g.start} to ${g.end} (width: ${g.end - g.start + 1}) | y = ${minY} to ${maxY} (height: ${maxY - minY + 1})`);
  });
}

main().catch(console.error);
