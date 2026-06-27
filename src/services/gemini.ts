import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';

// 1. 로컬 다이렉트 호출용 API Key
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// 2. 상용/테스트용 프록시 백엔드 서버 URL (설정 시 프록시 모드로 전환됩니다)
// 예: 'http://localhost:4000' 또는 'https://api.dreamlog.com'
const PROXY_SERVER_URL = process.env.EXPO_PUBLIC_PROXY_SERVER_URL;

// 로컬 SDK 클라이언트 초기화
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY && !PROXY_SERVER_URL) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('[Gemini SDK] 로컬 다이렉트 호출 모드로 초기화되었습니다.');
} else if (PROXY_SERVER_URL) {
  console.log(`[Gemini SDK] 프록시 서버 호출 모드로 작동합니다. 서버 URL: ${PROXY_SERVER_URL}`);
} else {
  console.warn(
    '[Gemini SDK] EXPO_PUBLIC_GEMINI_API_KEY 또는 EXPO_PUBLIC_PROXY_SERVER_URL 환경 변수가 설정되지 않았습니다. .env 파일을 프로젝트 루트에 설정해 주세요.'
  );
}

// 기본 추천 모델
const DEFAULT_MODEL = 'gemini-1.5-flash';

/**
 * 꿈 분석 결과에 대한 TypeScript 타입 정의
 */
export interface DreamAnalysisResult {
  summary: string;        // 꿈의 1줄 요약
  emotion: string;        // 주된 감정 (기쁨, 경이로움, 혼란 등)
  symbols: string[];      // 꿈의 핵심 상징 키워드들 (최대 3개)
  interpretation: string; // 심리학적 관점의 따뜻한 꿈 해몽
}

/**
 * 꿈 내용을 분석하여 감정, 상징, 심리 분석 결과를 구조화된 JSON으로 반환합니다.
 * 환경 변수 EXPO_PUBLIC_PROXY_SERVER_URL 설정 여부에 따라 로컬 직접 호출 혹은 프록시 백엔드 호출로 자동 분기됩니다.
 *
 * @param dreamText 꿈 일기 텍스트
 * @param userId 하루 1회 한도 검증용 사용자 고유 식별자 (서버 프록시 모드 사용 시 필수)
 */
export async function analyzeDream(dreamText: string, userId: string = 'dev-user-id'): Promise<DreamAnalysisResult> {
  // --- 프록시 백엔드 서버 모드 ---
  if (PROXY_SERVER_URL) {
    try {
      const response = await fetch(`${PROXY_SERVER_URL}/api/analyze-dream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dreamText }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errData = await response.json();
          throw new Error(errData.error || '오늘의 분석 한도를 초과했습니다.');
        }
        throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
      }

      return (await response.json()) as DreamAnalysisResult;
    } catch (error) {
      console.error('[Gemini Client] 프록시 꿈 분석 요청 실패:', error);
      throw error;
    }
  }

  // --- 로컬 SDK 직접 호출 모드 ---
  if (!genAI) {
    throw new Error('Gemini API 클라이언트가 초기화되지 않았습니다. .env 환경 변수를 확인해주세요.');
  }

  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: 
      '당신은 따뜻하고 공감 능력이 뛰어난 꿈 기록 리플렉션 도우미입니다. ' +
      '사용자가 기록한 꿈의 내용을 읽고, 분석 결과는 반드시 제공된 JSON 스키마 형식에 맞추어 한국어로 답변해주세요. ' +
      '해석(interpretation)은 의료적 진단이나 치료 조언이 아니라 자기이해를 돕는 참고용 문장으로 작성해야 합니다. ' +
      '단정적 판단을 피하고, 사용자가 스스로 감정과 생각을 돌아볼 수 있도록 부드럽고 조심스러운 어조를 유지하세요.',
  });

  const analysisSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      summary: {
        type: SchemaType.STRING,
        description: '꿈 내용을 핵심만 추려낸 1줄 요약 문장입니다.',
      },
      emotion: {
        type: SchemaType.STRING,
        description: '꿈의 전반적인 분위기와 내용에서 느껴지는 주된 감정 단어 하나를 제시합니다. (예: 평온함, 설렘, 불안, 신비로움 등)',
      },
      symbols: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: '꿈 속에서 기억에 남는 특징적인 상징물이나 사물, 장소 단어들입니다. (최대 3개)',
      },
      interpretation: {
        type: SchemaType.STRING,
        description: '꿈이 가진 심리적 의미와 미래에 대한 긍정적인 암시를 다정하고 섬세하게 기술한 해석글입니다. 3~4문장 분량으로 적습니다.',
      },
    },
    required: ['summary', 'emotion', 'symbols', 'interpretation'],
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `내가 꾼 꿈 일기:\n"""\n${dreamText}\n"""` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        temperature: 0.7,
      },
    });

    const responseText = result.response.text();
    return JSON.parse(responseText) as DreamAnalysisResult;
  } catch (error) {
    console.error('[Gemini Client] 로컬 꿈 분석 실패:', error);
    throw error;
  }
}

/**
 * 꿈 일기를 바탕으로 2~3개의 짧은 해시태그(키워드) 목록을 추출합니다.
 */
export async function extractDreamTags(dreamText: string): Promise<string[]> {
  // --- 프록시 백엔드 서버 모드 ---
  if (PROXY_SERVER_URL) {
    try {
      const response = await fetch(`${PROXY_SERVER_URL}/api/extract-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamText }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
      }

      const data = await response.json();
      return data.tags || ['꿈', '기록'];
    } catch (error) {
      console.error('[Gemini Client] 프록시 태그 추출 실패:', error);
      return ['꿈', '기록'];
    }
  }

  // --- 로컬 SDK 직접 호출 모드 ---
  if (!genAI) {
    return ['꿈', '기록'];
  }

  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction:
      '사용자가 쓴 꿈 내용에서 앱 내 태그로 적합한 단어를 최대 3개만 추출하세요. ' +
      '출력은 단어만 쉼표(,)로 구분하고 다른 수식어나 설명은 절대 붙이지 마세요. 예: 바다, 하늘, 나는꿈',
  });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: dreamText }] }],
      generationConfig: { temperature: 0.3 },
    });

    const text = result.response.text().trim();
    return text.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
  } catch (error) {
    console.error('[Gemini Client] 로컬 태그 추출 실패:', error);
    return ['꿈', '일기'];
  }
}

/**
 * 꿈 일기를 기반으로 텍스트 이미지 생성 프롬프트(Imagen 등)용 영어 프롬프트를 만듭니다.
 */
export async function generateDreamImagePrompt(dreamText: string): Promise<string> {
  // --- 프록시 백엔드 서버 모드 ---
  if (PROXY_SERVER_URL) {
    try {
      const response = await fetch(`${PROXY_SERVER_URL}/api/image-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamText }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
      }

      const data = await response.json();
      return data.prompt || 'A dreamy, surreal digital art representing dreams, high quality';
    } catch (error) {
      console.error('[Gemini Client] 프록시 이미지 프롬프트 생성 실패:', error);
      return 'A dreamy illustration, surreal glow, soft pastel colors, high resolution';
    }
  }

  // --- 로컬 SDK 직접 호출 모드 ---
  if (!genAI) {
    return 'A dreamy, surreal digital art representing dreams, high quality';
  }

  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction:
      '당신은 AI 이미지 생성을 위한 프롬프트 디자이너입니다. ' +
      '사용자가 제공한 한글 꿈 일기를 바탕으로, 이미지 생성 모델에 사용할 수 있는 정교한 영어 프롬프트를 만드세요. ' +
      '스타일은 "surreal digital art", "dreamy illustration", "soft glowing colors" 풍을 반영하고, 오직 영문 프롬프트 텍스트만 출력하세요. 다른 설명은 생략하세요.',
  });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: dreamText }] }],
    });

    return result.response.text().trim();
  } catch (error) {
    console.error('[Gemini Client] 로컬 이미지 프롬프트 생성 실패:', error);
    return 'A dreamy illustration, surreal glow, soft pastel colors, high resolution';
  }
}
