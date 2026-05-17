import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase 구성 정보 (깃허브에 안전하게 공유되어 즉시 연동 구동됩니다!)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD4wLQi3ZRP_zdp6miEtZIRvWqJ35vTqIg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "classboard-2f20e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "classboard-2f20e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "classboard-2f20e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "309269105387",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:309269105387:web:2a0fcc7c8624c66157ccae"
};

let app;
let db;
let auth;
let googleProvider;

// 기본 키가 존재하므로 상시 활성화 작동합니다.
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase Firestore & Auth가 성공적으로 로드되었습니다! 🔥");
  } catch (error) {
    console.error("Firebase 초기화 중 에러 발생:", error);
  }
} else {
  console.warn("⚠️ Firebase 환경 변수가 채워지지 않았습니다. 로컬 모드로 대체 작동합니다.");
}

export { db, auth, googleProvider, isConfigured };
