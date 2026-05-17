import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase 구성 정보 (환경 변수에서 안전하게 가져옴)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase 앱 초기화 (SSR 환경 고려: 이미 초기화되었으면 기존 앱 사용)
let app;
let db;

// Firebase 환경 변수 중 필수 값이 채워져 있는지 검증
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("Firebase Firestore가 성공적으로 로드되었습니다! 🔥");
  } catch (error) {
    console.error("Firebase 초기화 중 에러 발생:", error);
  }
} else {
  console.warn("⚠️ Firebase 환경 변수가 채워지지 않았습니다. .env.local 설정을 확인해 주세요. 로컬 모드로 대체 작동합니다.");
}

export { db, isConfigured };
