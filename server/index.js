import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// .env 파일 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ==========================================
// 1. 보안 설정: HTTP 헤더 보호 (Helmet)
// ==========================================
app.use(helmet());

// ==========================================
// 2. 보안 설정: CORS 세부 화이트리스트 설정
// ==========================================
const allowedOrigins = [
  'http://localhost:8081',     // React Native Metro bundler (iOS/Android 에뮬레이터 로컬 통신)
  'http://127.0.0.1:8081',     // 로컬 루프백 주소
  'http://localhost:19006',    // Expo Web 포트
  'http://localhost:3000',     // 로컬 웹 테스트 포트
];

const corsOptions = {
  origin: function (origin, callback) {
    // 모바일 네이티브 앱에서 요청할 때는 origin이 undefined로 전달됩니다.
    // 따라서 !origin인 경우(네이티브 앱 호출) 및 화이트리스트에 명시된 오리진(웹 호출)만 허용합니다.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] 허용되지 않은 출처의 요청 차단: ${origin}`);
      callback(new Error('CORS 정책에 의해 허용되지 않는 요청입니다.'));
    }
  },
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// JSON Body Parser 설정 (페이로드 최대 크기 50kb로 타이트하게 제한하여 대용량 공격 방어)
app.use(express.json({ limit: '50kb' }));

// ==========================================
// 3. 보안 설정: IP 기반 요청 속도 제한 (Rate Limiting)
// ==========================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 단일 IP당 15분 내 최대 100회 요청으로 제한 (DDoS 및 브루트포스 방지)
  message: {
    error: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해 주세요.',
  },
  standardHeaders: true, // `RateLimit-*` 헤더에 한도 정보 제공
  legacyHeaders: false, // `X-RateLimit-*` 헤더 비활성화
});
app.use('/api/', globalLimiter);

// Gemini API Key 검사 및 초기화
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('[Proxy Server] Gemini API 클라이언트가 안전하게 로드되었습니다.');
} else {
  console.error('[Proxy Server] 경고: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
}

const DEFAULT_MODEL = 'gemini-1.5-flash';

/**
 * [하루 1회 제한용 간이 저장소 - 인메모리 방식]
 * 실제 프로덕션 환경에서는 Firestore, MongoDB, Supabase DB 등 영구 데이터베이스를 사용하세요.
 */
const requestHistory = new Map();

/**
 * 미들웨어: 하루 1회 호출 한도 체크 및 유저 ID 유효성 검증
 */
function checkDailyLimit(req, res, next) {
  const { userId } = req.body;

  // 1. 유저 ID 기본 포맷 검증 (공백 제외 최소 5자 이상, 최대 100자 이하의 일반적인 문자열 규격)
  if (!userId || typeof userId !== 'string' || userId.trim().length < 5 || userId.length > 100) {
    return res.status(400).json({ error: '올바르지 않은 사용자 식별자(userId) 형식입니다.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lastRequestDate = requestHistory.get(userId);

  if (lastRequestDate === todayStr) {
    console.log(`[Limit Blocked] User ${userId} 가 오늘 이미 1회 분석을 진행하여 요청을 차단했습니다.`);
    return res.status(429).json({
      error: '오늘의 무료 분석 기회를 모두 사용하셨습니다. 내일 다시 시도해 주세요!'
    });
  }

  req.todayStr = todayStr;
  next();
}

/**
 * 헬퍼 함수: 꿈 텍스트 유효성 검사
 * 악의적으로 긴 텍스트 주입 공격(Prompt Injection/Overflow)을 방어합니다.
 */
function validateDreamText(req, res, next) {
  const { dreamText } = req.body;

  if (!dreamText || typeof dreamText !== 'string') {
    return res.status(400).json({ error: '꿈 일기 내용이 유효하지 않습니다.' });
  }

  const trimmedLength = dreamText.trim().length;

  if (trimmedLength < 5) {
    return res.status(400).json({ error: '꿈 내용이 너무 짧습니다. 최소 5자 이상 작성해 주세요.' });
  }

  if (trimmedLength > 8000) {
    // 8,000자 초과 텍스트 유입 차단 (Gemini API 비용 및 요금 폭탄 방지)
    return res.status(400).json({ error: '꿈 일기 분량은 최대 8,000자까지만 전송할 수 있습니다.' });
  }

  next();
}

/**
 * 1. 꿈 일기 심층 분석 API (CORS, Rate-Limiter, Daily Limit, Payload Validator 적용)
 * POST /api/analyze-dream
 */
app.post('/api/analyze-dream', checkDailyLimit, validateDreamText, async (req, res) => {
  const { userId, dreamText } = req.body;

  if (!genAI) {
    return res.status(500).json({ error: '서버의 AI 클라이언트 초기화가 완료되지 않았습니다.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      systemInstruction:
        '당신은 따뜻하고 공감 능력이 뛰어난 전문 꿈 분석가이자 심리 상담사입니다. ' +
        '사용자가 기록한 꿈의 내용을 읽고, 분석 결과는 반드시 제공된 JSON 스키마 형식에 맞추어 한국어로 답변해주세요. ' +
        '해석(interpretation)은 사용자에게 따뜻한 조언과 심리학적 격려를 건네는 어조로 작성해야 합니다.',
    });

    const analysisSchema = {
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

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `내가 꾼 꿈 일기:\n"""\n${dreamText}\n"""` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        temperature: 0.7,
      },
    });

    // API 호출 및 AI 생성이 안전하게 성공했을 때에만 요청 한도 갱신
    requestHistory.set(userId, req.todayStr);

    const responseText = result.response.text();
    return res.json(JSON.parse(responseText));
  } catch (error) {
    console.error('[Proxy Error] 꿈 분석 API 장애 발생:', error);
    return res.status(500).json({ error: '꿈 분석 진행에 오류가 발생했습니다. 다시 시도해 주세요.' });
  }
});

/**
 * 2. 해시태그 추출 API
 * POST /api/extract-tags
 */
app.post('/api/extract-tags', validateDreamText, async (req, res) => {
  const { dreamText } = req.body;

  if (!genAI) {
    return res.json({ tags: ['꿈', '기록'] });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      systemInstruction:
        '사용자가 쓴 꿈 내용에서 앱 내 태그로 적합한 단어를 최대 3개만 추출하세요. ' +
        '출력은 단어만 쉼표(,)로 구분하고 다른 수식어나 설명은 절대 붙이지 마세요. 예: 바다, 하늘, 나는꿈',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: dreamText }] }],
      generationConfig: { temperature: 0.3 },
    });

    const text = result.response.text().trim();
    const tags = text.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    return res.json({ tags });
  } catch (error) {
    console.error('[Proxy Error] 태그 추출 실패:', error);
    return res.json({ tags: ['꿈', '일기'] });
  }
});

/**
 * 3. 꿈 시각화용 이미지 프롬프트 생성 API
 * POST /api/image-prompt
 */
app.post('/api/image-prompt', validateDreamText, async (req, res) => {
  const { dreamText } = req.body;

  if (!genAI) {
    return res.json({ prompt: 'A dreamy, surreal digital art representing dreams, high quality' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      systemInstruction:
        '당신은 AI 이미지 생성을 위한 프롬프트 디자이너입니다. ' +
        '사용자가 제공한 한글 꿈 일기를 바탕으로, 이미지 생성 모델에 사용할 수 있는 정교한 영어 프롬프트를 만드세요. ' +
        '스타일은 "surreal digital art", "dreamy illustration", "soft glowing colors" 풍을 반영하고, 오직 영문 프롬프트 텍스트만 출력하세요. 다른 설명은 생략하세요.',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: dreamText }] }],
    });

    return res.json({ prompt: result.response.text().trim() });
  } catch (error) {
    console.error('[Proxy Error] 이미지 프롬프트 생성 실패:', error);
    return res.json({ prompt: 'A dreamy illustration, surreal glow, soft pastel colors, high resolution' });
  }
});

// 에러 헨들러 미들웨어 (기본 오류 메시지 노출 차단)
app.use((err, req, res, next) => {
  console.error('[Fatal Error] 처리되지 않은 오류 발생:', err.message);
  res.status(500).json({ error: '서버 내부 보안 정책으로 인해 연결이 거부되었습니다.' });
});

// 서버 기동
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[DreamLog Security-Enhanced Proxy Server] 구동 성공!`);
  console.log(`서버 주소: http://localhost:${PORT}`);
  console.log(`[CORS 방어] allowedOrigins 화이트리스트 외의 출처 차단 활성화`);
  console.log(`[DDoS 방어] IP당 15분당 최대 100회 요청 제한 활성화`);
  console.log(`[보안 헤더] Helmet 보호 미들웨어 작동 중`);
  console.log(`[페이로드] 타이트한 JSON 바디 파서 및 글자수 한도 적용 완료`);
  console.log(`=======================================================`);
});
