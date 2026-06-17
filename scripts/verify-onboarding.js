// scripts/verify-onboarding.js
// onboarding.ts에 설정된 sourceWidth/Height가 실제 이미지 크기와 일치하는지 검증
const sharp = require('sharp');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const EXPECTED = [
  { file: 'assets/onboarding/onboarding-1.png', sourceWidth: 1664, sourceHeight: 3476 },
  { file: 'assets/onboarding/onboarding-2.png', sourceWidth: 1636, sourceHeight: 3508 },
  { file: 'assets/onboarding/onboarding-3.png', sourceWidth: 1636, sourceHeight: 3508 },
  { file: 'assets/onboarding/onboarding-4.png', sourceWidth: 1636, sourceHeight: 3508 },
];

// 이미지 내에서 도트 위치(DOT_CENTER_X_RATIOS, DOT_CENTER_Y_RATIO) 시뮬레이션
const DOT_CENTER_X_RATIOS = [0.382, 0.446, 0.51, 0.574];
const DOT_CENTER_Y_RATIO = 0.141;

async function run() {
  let hasError = false;

  for (let i = 0; i < EXPECTED.length; i++) {
    const { file, sourceWidth, sourceHeight } = EXPECTED[i];
    const filePath = path.join(ROOT, file);
    const meta = await sharp(filePath).metadata();

    const ok = meta.width === sourceWidth && meta.height === sourceHeight;
    const status = ok ? '✅ OK' : '❌ MISMATCH';
    console.log(`\n[Page ${i + 1}] ${file}`);
    console.log(`  ${status}`);
    console.log(`  실제:   ${meta.width} x ${meta.height}`);
    console.log(`  설정값: ${sourceWidth} x ${sourceHeight}`);

    if (!ok) {
      hasError = true;
      console.log(`  → onboarding.ts를 다음으로 수정 필요:`);
      console.log(`    sourceWidth: ${meta.width},`);
      console.log(`    sourceHeight: ${meta.height},`);
    }

    // 도트 위치 픽셀 계산 (정보 확인용)
    console.log(`  도트 Y (픽셀): ${Math.round(meta.height * DOT_CENTER_Y_RATIO)}`);
    console.log(`  도트 X 위치들: ${DOT_CENTER_X_RATIOS.map(r => Math.round(meta.width * r)).join(', ')}`);

    // 버튼 위치 계산 (buttonRatio 기준)
    const btnY = Math.round(meta.height * 0.855);
    const btnX = Math.round(meta.width * 0.3);
    const btnW = Math.round(meta.width * 0.4);
    const btnH = Math.round(meta.height * 0.1);
    console.log(`  다음 버튼 (픽셀): x=${btnX} y=${btnY} w=${btnW} h=${btnH}`);
  }

  if (!hasError) {
    console.log('\n✅ 모든 이미지 크기가 onboarding.ts 설정과 일치합니다.');
  } else {
    console.log('\n❌ 불일치 항목이 있습니다. 위 수정사항을 onboarding.ts에 반영하세요.');
  }
}

run().catch(console.error);
