const fs = require('fs');
const path = require('path');

async function main() {
  const src = 'C:\\Users\\user\\Downloads\\kkumgyeol-visual-implementation-guide-unzipped\\kkumgyeol-visual-implementation-guide\\assets\\screens\\09-stats-report.png';
  const dest = path.join(__dirname, '..', 'assets', 'home', 'stats-report-preview.png');
  fs.copyFileSync(src, dest);
  console.log('Copied preview to: ' + dest);
}

main().catch(console.error);
