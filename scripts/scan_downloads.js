const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const downloadDir = 'C:\\Users\\user\\Downloads';
  const files = fs.readdirSync(downloadDir).filter(f => f.toLowerCase().endsWith('.png'));

  console.log('Scanning PNG files in Downloads:');
  for (const file of files) {
    const filePath = path.join(downloadDir, file);
    const stats = fs.statSync(filePath);
    try {
      const { info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
      console.log(`File: ${file.padEnd(40)} | Size: ${info.width}x${info.height} | Bytes: ${stats.size}`);
    } catch (e) {
      console.log(`File: ${file.padEnd(40)} | Error: ${e.message}`);
    }
  }
}

main().catch(console.error);
