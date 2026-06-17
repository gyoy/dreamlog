const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const bgPath = path.join(__dirname, '..', 'assets', 'record', 'bottom-tab-background.png');
  const { data, info } = await sharp(bgPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  // Let's scan y = 350 to 520, which is where the icons and text labels are located
  const darkPixelsByCol = Array(w).fill(0);
  for (let y = 350; y < 520; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * c;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const val = (r + g + b) / 3;
      if (val < 200) {
        darkPixelsByCol[x]++;
      }
    }
  }

  let groups = [];
  let currentGroup = null;
  for (let x = 0; x < w; x++) {
    const isDark = darkPixelsByCol[x] > 2; // low noise threshold
    if (isDark) {
      if (!currentGroup) {
        currentGroup = { start: x, end: x };
      } else {
        currentGroup.end = x;
      }
    } else {
      if (currentGroup) {
        if (currentGroup.end - currentGroup.start > 15) {
          groups.push(currentGroup);
        }
        currentGroup = null;
      }
    }
  }
  if (currentGroup) groups.push(currentGroup);

  console.log('Detected column groups for tabs (refined):');
  groups.forEach((g, idx) => {
    // Find the vertical bounding box for this specific group within y = 350 to 520
    let minY = 520, maxY = 350;
    for (let y = 350; y < 520; y++) {
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
