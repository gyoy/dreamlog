// scripts/restore-onboarding.js
// qa/reference-page-3, 4 → assets/onboarding/onboarding-3, 4 복원
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TARGETS = [
  { src: 'qa/reference-page-3.png', dst: 'assets/onboarding/onboarding-3.png' },
  { src: 'qa/reference-page-4.png', dst: 'assets/onboarding/onboarding-4.png' },
];

async function run() {
  for (const { src, dst } of TARGETS) {
    const srcPath = path.join(ROOT, src);
    const dstPath = path.join(ROOT, dst);
    const meta = await sharp(srcPath).metadata();
    console.log(`${src} → ${dst}`);
    console.log(`  dimensions: ${meta.width} x ${meta.height}`);

    // 원본 그대로 복사 (화질 유지)
    fs.copyFileSync(srcPath, dstPath);
    const dstMeta = await sharp(dstPath).metadata();
    console.log(`  copied OK: ${(fs.statSync(dstPath).size / 1024).toFixed(0)}KB`);
  }
  console.log('\n=== 복원 완료 ===');
  console.log('onboarding.ts의 sourceWidth/Height를 아래 값으로 업데이트하세요:');
  for (const { src } of TARGETS) {
    const meta = await sharp(path.join(ROOT, src)).metadata();
    console.log(`  ${src}: ${meta.width} x ${meta.height}`);
  }
}

run().catch(console.error);
