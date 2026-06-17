# DreamLog AI 개발 및 연동 가이드

이 문서는 개발자 및 AI 에이전트(Cursor, Google AI Studio, Gemini)가 **DreamLog** 앱 프로젝트를 정확히 이해하고, 오류 없이 신속하게 추가 기능을 개발할 수 있도록 돕는 **컨텍스트 최적화 가이드**입니다. 

AI Studio에서 프롬프트를 작성하거나, 에이전트에게 프로젝트를 학습시킬 때 이 가이드를 첫 번째 컨텍스트로 제공하세요.

---

## 1. 프로젝트 아키텍처 및 핵심 규칙

### 1) Coordinate-Based Absolute Overlay Layout (좌표 기반 절대 레이아웃)
이 앱은 비주얼 피델리티(Figma 디자인과 100% 일치)를 위해 특수한 레이아웃 기법을 채택하고 있습니다.

* **원칙**: 카드, 버튼, 텍스트 상자 등을 CSS 스타일로 직접 꾸미지 마세요.
* **구현**:
  1. Figma에서 추출한 배경 이미지(예: `home-background.png`)를 전체 화면에 배치합니다.
  2. Figma 캔버스 크기인 **393 x 852**를 기준으로 터치 가능한 영역(Hit Area)의 `x, y, width, height`를 추출합니다.
  3. `mapRectToScreen` 유틸을 사용해 현재 화면 크기에 맞추어 좌표를 비율 계산(Scale)하여 absolute로 배치합니다.
  4. 겉보기에는 멋진 카드와 복잡한 UI가 표시되지만, 실제 코드는 투명한 `<Pressable>` 영역들의 좌표 매핑으로만 구성됩니다.

#### 💡 개발 예시 (버튼 추가하기)
새로운 버튼을 추가하려면 `src/data/home.ts`에 좌표를 추가하고 화면 컴포넌트에서 매핑합니다.
```typescript
// src/data/home.ts
export const HOME_HIT_AREAS = {
  // ... 기존 영역
  myNewButton: { x: 50, y: 200, width: 100, height: 50 } // 393x852 기준 좌표
}
```

```tsx
// src/screens/HomeScreen.tsx
<Pressable
  onPress={handleNewButtonPress}
  style={[styles.hitArea, hitStyle(HOME_HIT_AREAS.myNewButton)]}
>
  <Text style={styles.srOnly}>새 버튼</Text>
</Pressable>
```

---

## 2. Google AI Studio & Gemini API 연동 가이드

### 1) 환경 변수 설정
로컬 개발 시 API 키는 `process.env.EXPO_PUBLIC_GEMINI_API_KEY` 환경변수로 주입받습니다.
1. 프로젝트 루트에 `.env` 파일을 생성합니다.
2. 아래 형식으로 발급받은 Gemini API 키를 설정합니다.
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
   ```
   *(Expo 번들러가 자동으로 감지하여 코드에 바인딩합니다)*

### 2) AI SDK 사용 (`src/services/gemini.ts`)
프로젝트에는 Google Gen AI 공식 SDK가 셋업되어 있어 다음과 같이 바로 사용할 수 있습니다.

```typescript
import { analyzeDream, extractDreamTags } from '../services/gemini';

// 1. 꿈 상세 분석 호출 (Structured JSON 출력)
const result = await analyzeDream("어젯밤 하늘을 날아다니는 꿈을 꿨어요.");
console.log(result.summary);        // 꿈 1줄 요약
console.log(result.emotion);        // 지배적 감정
console.log(result.symbols);        // 핵심 상징물 배열
console.log(result.interpretation); // 따뜻한 해몽글

// 2. 해시태그 추출 호출
const tags = await extractDreamTags("달콤한 초콜릿으로 만든 성을 보았습니다.");
console.log(tags); // ['초콜릿', '성', '꿈']
```

### 3) AI Studio에서 프롬프트 작성 후 코드에 이식하기
1. [Google AI Studio](https://aistudio.google.com/)에 접속합니다.
2. **System Instructions**에 AI의 페르소나 및 지침을 튜닝합니다.
3. **Structured Outputs** 기능을 켜고, 응답받을 JSON 스키마를 선언하여 프롬프트를 테스트합니다.
4. 테스트가 완료되면 `src/services/gemini.ts` 파일 내부의 `systemInstruction`과 `analysisSchema` 부분을 AI Studio에서 설정한 값과 일치하도록 업데이트합니다.

---

## 3. 디자인 토큰 및 공통 컴포넌트 개발 가이드 (Design Token & Common Components)

새로운 UI 화면을 추가하거나 기존 컴포넌트를 리팩터링할 때 하드코딩된 스타일 대신 중앙 관리 토큰과 공통 컴포넌트를 사용하세요.

### 1) 디자인 토큰 활용 (`src/theme`)
- **색상**: `theme.colors`에 등록된 색상을 사용하며 하드코딩 `#hex` 값 사용을 금합니다 (예: `theme.colors.bgWhite`, `theme.colors.primary`).
- **여백**: 마진, 패딩, 컴포넌트 간격은 `theme.spacing`의 정량 스케일(`theme.spacing.xl`, `theme.spacing.layoutSm` 등)을 따릅니다.
- **둥글기**: 모서리 곡률은 `theme.radius`(`theme.radius.sm`, `theme.radius.md` 등)를 할당합니다.
- **폰트**: 글꼴 크기와 두께는 `theme.typography.sizes`와 `theme.typography.weights`를 사용합니다.

### 2) 공통 컴포넌트 활용 (`src/components/common`)
- **카드 스타일 컨테이너**: `<Card>` 사용
- **터치 액션 및 버튼**: `<Button>` 사용 (눌림 애니메이션 내장)
- **텍스트 입력 필드**: `<Input>` 사용 (글자수 카운터, 크로스 플랫폼 포커스 보정 내장)

---

## 4. 코드베이스 주요 디렉토리 정보

* [src/services/gemini.ts](file:///c:/Users/user/Documents/dreamlog/src/services/gemini.ts): Gemini API 통신 및 주요 분석 기능 정의.
* [src/theme/](file:///c:/Users/user/Documents/dreamlog/src/theme/): colors, spacing, radius, typography 등 전역 디자인 토큰 정의.
* [src/components/common/](file:///c:/Users/user/Documents/dreamlog/src/components/common/): 재사용 가능한 공통 UI 컴포넌트 (Card, Button, Input) 보유.
* [src/screens/HomeScreen.tsx](file:///c:/Users/user/Documents/dreamlog/src/screens/HomeScreen.tsx): 메인 홈 화면. 좌표 매핑 기반 버튼 제공.
* [src/screens/OnboardingScreen.tsx](file:///c:/Users/user/Documents/dreamlog/src/screens/OnboardingScreen.tsx): 앱 진입 시 나오는 슬라이드식 온보딩 화면.
* [src/data/](file:///c:/Users/user/Documents/dreamlog/src/data/): 온보딩 데이터 및 홈 레이아웃 좌표 데이터 보유.
* [src/types/](file:///c:/Users/user/Documents/dreamlog/src/types/): 홈 화면 및 꿈 데이터의 타입 정의.
