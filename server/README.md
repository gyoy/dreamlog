# DreamLog 백엔드 프록시 서버

이 디렉토리는 iOS App Store/Google Play Store 출시 시 **Gemini API Key의 보안 노출을 방지**하고, 무료 API 사용 한도를 관리하기 위한 **Node.js Express 백엔드 프록시 서버**입니다.

## 1. 주요 기능
* **API Key 보안**: 클라이언트(앱)에 API Key를 담지 않고, 오직 서버에서만 호출하여 보안을 강화합니다.
* **하루 1회 분석 제한 (Rate Limit)**: 동일한 기기 ID/사용자 ID(`userId`)로 들어오는 분석 요청을 하루 1회로 제한하여 과도한 무료 요금 한도 초과 및 남용을 방지합니다.

---

## 2. 로컬 실행 방법

1. **의존성 패키지 설치**
   ```bash
   cd server
   npm install
   ```

2. **환경 변수 파일 생성**
   - `server/.env.example` 파일을 복사하여 `server/.env` 파일을 만듭니다.
   - `GEMINI_API_KEY` 항목에 [Google AI Studio](https://aistudio.google.com/)에서 발급받은 API 키를 입력합니다.
   ```env
   PORT=4000
   GEMINI_API_KEY=AIzaSy...
   ```

3. **서버 실행**
   ```bash
   npm start
   ```
   서버가 구동되면 `http://localhost:4000` 주소로 대기 상태가 됩니다.

---

## 3. 상용 출시(Production) 시 가이드

### 1) 데이터베이스(DB) 연동
현재 `server/index.js`의 `checkDailyLimit` 미들웨어는 메모리 상에서 하루 제한을 관리하는 **인메모리 Map 방식**입니다. 서버가 재시작되면 누적된 요청 내역이 리셋되므로, 상용 운영을 하실 때는 실제 DB로 연동하셔야 합니다.

**Firebase Firestore 예시:**
```javascript
// server/index.js 내부 수정 예시
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin 초기화 후 db 객체 선언...
const db = getFirestore();

async function checkDailyLimit(req, res, next) {
  const { userId } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];
  
  // DB에서 마지막 분석일 조회
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (userDoc.exists && userDoc.data().lastRequestDate === todayStr) {
    return res.status(429).json({ error: '오늘은 이미 꿈을 분석하셨습니다.' });
  }
  
  req.todayStr = todayStr;
  next();
}
```

### 2) 클라우드 배포
이 프록시 서버는 다음 무료/유료 플랫폼에 손쉽게 배포할 수 있습니다.
* **Render.com / Fly.io**: 가벼운 Node.js 앱 배포에 최적화된 무료/저가 서비스.
* **Firebase Cloud Functions / AWS Lambda**: 서버리스 아키텍처로 사용자가 요청을 보낼 때만 요금이 나가므로 유지비용이 가장 적게 듭니다.
* **Vercel**: `api/` 디렉토리에 서버리스 파일 형태로 손쉽게 호스팅할 수 있습니다.
