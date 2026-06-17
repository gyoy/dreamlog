// scripts/compress-assets.js
// 실행: node scripts/compress-assets.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = [
  // 웹 홈 배경 (2.5MB → 목표 ~300KB)
  { src: 'assets/home/home-background-web.png', quality: 82 },
  // 네이티브 홈 배경들
  { src: 'assets/home/home-background@4x.png', quality: 80 },
  { src: 'assets/home/home-background@3x.png', quality: 80 },
  { src: 'assets/home/home-background@2x.png', quality: 80 },
  { src: 'assets/home/home-background.png',    quality: 82 },
  // 온보딩 이미지 (각 1.3~2.1MB → 목표 ~300KB)
  { src: 'assets/onboarding/onboarding-1.png', quality: 80 },
  { src: 'assets/onboarding/onboarding-2.png', quality: 80 },
  { src: 'assets/onboarding/onboarding-3.png', quality: 80 },
  { src: 'assets/onboarding/onboarding-4.png', quality: 80 },
  // Record 화면 히어로 이미지 및 배경
  { src: 'assets/record/hero-sun.png',          quality: 82 },
  { src: 'assets/record/hero-planet.png',       quality: 82 },
  { src: 'assets/record/hero-cloud.png',        quality: 82 },
  { src: 'assets/record/header-cloud.png',      quality: 80 },
  { src: 'assets/record/bottom-tab-background.png', quality: 80 },
  { src: 'assets/record/mode-default-background.png', quality: 80 },
  { src: 'assets/record/mode-selected-background.png', quality: 80 },
];

const ROOT = path.join(__dirname, '..');

async function compress(item) {
  const abs = path.join(ROOT, item.src);
  if (!fs.existsSync(abs)) {
    console.warn(`[SKIP] 파일 없음: ${item.src}`);
    return;
  }

  const beforeBytes = fs.statSync(abs).size;
  const tmp = abs + '.tmp.png';

  await sharp(abs)
    .png({ quality: item.quality, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(tmp);

  const afterBytes = fs.statSync(tmp).size;

  // 압축 결과가 더 작을 때만 교체
  if (afterBytes < beforeBytes) {
    fs.renameSync(tmp, abs);
    const saved = ((1 - afterBytes / beforeBytes) * 100).toFixed(1);
    console.log(`[OK] ${item.src.padEnd(50)} ${(beforeBytes/1024).toFixed(0)}KB → ${(afterBytes/1024).toFixed(0)}KB  (-${saved}%)`);
  } else {
    fs.unlinkSync(tmp);
    console.log(`[--] ${item.src.padEnd(50)} 이미 최적화됨 (${(beforeBytes/1024).toFixed(0)}KB)`);
  }
}

(async () => {
  console.log('=== 에셋 압축 시작 ===\n');
  for (const item of ASSETS) {
    await compress(item);
  }
  console.log('\n=== 완료 ===');
})();
