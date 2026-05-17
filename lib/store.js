/**
 * store.js - 하이브리드 데이터 저장소 (Firebase Firestore + LocalStorage 백업 지원)
 */

import { db, isConfigured } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  runTransaction
} from 'firebase/firestore';

// ===== 테스트 유저 설정 =====
export const CURRENT_USER = {
  id: 'user_01',
  name: '테스트 유저'
};

const KEYS = {
  Q: 'classboard_questions',
  A: 'classboard_answers',
  AN: 'classboard_announcements'
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ==========================================
// 1. [로컬 스토리지 대체 모드] (Firebase 미구성 시 작동)
// ==========================================
function getLocal(key) {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}

function setLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// 2. [질문 (Questions) 관련 인터페이스]
// ==========================================

// 모든 질문 가져오기 (최신순)
export async function getQuestions() {
  if (isConfigured && db) {
    try {
      const qRef = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(qRef);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.error("Firestore getQuestions 에러, 로컬로 복구합니다:", err);
    }
  }
  
  // Fallback (로컬)
  return getLocal(KEYS.Q).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// 특정 키워드로 필터링된 질문 가져오기
export async function getQuestionsByKeyword(kw) {
  if (isConfigured && db) {
    try {
      // Firebase에서는 array-contains를 통해 편리하게 배열 내 키워드 탐색 가능!
      const qRef = query(
        collection(db, 'questions'), 
        where('keywords', 'array-contains', kw),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(qRef);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.error("Firestore getQuestionsByKeyword 에러, 로컬로 복구합니다:", err);
    }
  }

  // Fallback (로컬)
  return (await getQuestions()).filter(q => q.keywords.includes(kw));
}

// 특정 ID의 단일 질문 가져오기
export async function getQuestion(id) {
  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'questions', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (err) {
      console.error("Firestore getQuestion 에러, 로컬로 복구합니다:", err);
    }
  }

  // Fallback (로컬)
  return getLocal(KEYS.Q).find(q => q.id === id) || null;
}

// 새 질문 추가
export async function addQuestion(title, content, keywords) {
  const item = {
    title,
    content,
    keywords: keywords || [],
    authorId: CURRENT_USER.id,
    authorName: CURRENT_USER.name,
    status: 'waiting',
    answerCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, 'questions'), item);
      return { id: docRef.id, ...item };
    } catch (err) {
      console.error("Firestore addQuestion 에러, 로컬에 저장합니다:", err);
    }
  }

  // Fallback (로컬)
  const list = getLocal(KEYS.Q);
  const localItem = { id: genId(), ...item };
  list.push(localItem);
  setLocal(KEYS.Q, list);
  return localItem;
}

// 질문 해결 상태 변경 (대기중 ↔ 해결완료 토글)
export async function toggleQuestionStatus(id) {
  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'questions', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentStatus = docSnap.data().status;
        const nextStatus = currentStatus === 'waiting' ? 'solved' : 'waiting';
        await updateDoc(docRef, {
          status: nextStatus,
          updatedAt: new Date().toISOString()
        });
        return { id, ...docSnap.data(), status: nextStatus };
      }
    } catch (err) {
      console.error("Firestore toggleQuestionStatus 에러, 로컬로 처리합니다:", err);
    }
  }

  // Fallback (로컬)
  const list = getLocal(KEYS.Q);
  const q = list.find(q => q.id === id);
  if (q) {
    q.status = q.status === 'waiting' ? 'solved' : 'waiting';
    q.updatedAt = new Date().toISOString();
    setLocal(KEYS.Q, list);
  }
  return q;
}

// ==========================================
// 3. [답변 (Answers) 관련 인터페이스]
// ==========================================

// 특정 질문에 등록된 모든 답변 가져오기
export async function getAnswers(questionId) {
  if (isConfigured && db) {
    try {
      // subcollection 'answers' 대신 쿼리 효율성을 위해 단일 answers 컬렉션 조회
      const qRef = query(
        collection(db, 'answers'), 
        where('questionId', '==', questionId),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(qRef);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.error("Firestore getAnswers 에러, 로컬로 복구합니다:", err);
    }
  }

  // Fallback (로컬)
  return getLocal(KEYS.A).filter(a => a.questionId === questionId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// 새 답변 등록 (답변 등록 시 질문의 answerCount를 트랜잭션으로 안전하게 1 증가)
export async function addAnswer(questionId, content) {
  const item = {
    questionId,
    content,
    authorId: CURRENT_USER.id,
    authorName: CURRENT_USER.name,
    createdAt: new Date().toISOString()
  };

  if (isConfigured && db) {
    try {
      // 트랜잭션 사용: 답변을 추가하고 질문 카드의 답변 개수를 동시 업데이트
      await runTransaction(db, async (transaction) => {
        const questionDocRef = doc(db, 'questions', questionId);
        const questionDoc = await transaction.get(questionDocRef);
        
        if (!questionDoc.exists()) {
          throw "질문 문서가 존재하지 않습니다!";
        }

        const newAnswerCount = (questionDoc.data().answerCount || 0) + 1;
        
        // 1. 답변 컬렉션에 새 문서 추가
        const newAnswerRef = doc(collection(db, 'answers'));
        transaction.set(newAnswerRef, item);
        
        // 2. 질문 컬렉션의 count 필드 업데이트
        transaction.update(questionDocRef, { 
          answerCount: newAnswerCount,
          updatedAt: new Date().toISOString() 
        });
      });
      
      return item;
    } catch (err) {
      console.error("Firestore addAnswer 트랜잭션 실패, 로컬에 백업합니다:", err);
    }
  }

  // Fallback (로컬)
  const list = getLocal(KEYS.A);
  const localItem = { id: genId(), ...item };
  list.push(localItem);
  setLocal(KEYS.A, list);

  // 질문의 답변 수 증가
  const qs = getLocal(KEYS.Q);
  const q = qs.find(q => q.id === questionId);
  if (q) { 
    q.answerCount = (q.answerCount || 0) + 1; 
    q.updatedAt = new Date().toISOString(); 
    setLocal(KEYS.Q, qs); 
  }
  return localItem;
}

// ==========================================
// 4. [공지사항 (Announcements) 관련 인터페이스]
// ==========================================

// 모든 공지사항 가져오기
export async function getAnnouncements() {
  if (isConfigured && db) {
    try {
      const qRef = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(qRef);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.error("Firestore getAnnouncements 에러, 로컬로 복구합니다:", err);
    }
  }

  // Fallback (로컬)
  return getLocal(KEYS.AN).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// 새 공지사항 등록
export async function addAnnouncement(title, content) {
  const item = {
    title,
    content,
    authorId: CURRENT_USER.id,
    authorName: CURRENT_USER.name,
    createdAt: new Date().toISOString()
  };

  if (isConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, 'announcements'), item);
      return { id: docRef.id, ...item };
    } catch (err) {
      console.error("Firestore addAnnouncement 에러, 로컬에 저장합니다:", err);
    }
  }

  // Fallback (로컬)
  const list = getLocal(KEYS.AN);
  const localItem = { id: genId(), ...item };
  list.push(localItem);
  setLocal(KEYS.AN, list);
  return localItem;
}

// ==========================================
// 5. [키워드 (Keywords) 및 사이드바 집계]
// ==========================================
export async function getKeywords() {
  // 클라이언트 단에서 불러온 최신 질문 데이터로부터 실시간으로 키워드를 집계합니다.
  const qs = await getQuestions();
  const map = {};
  qs.forEach(q => (q.keywords || []).forEach(k => { map[k] = (map[k] || 0) + 1; }));
  return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

// ==========================================
// 6. [샘플 데이터 생성 (최초 로컬 스토리지 구동 시 백업용)]
// ==========================================
export function initSampleData() {
  if (typeof window === 'undefined') return;
  if (getLocal(KEYS.Q).length > 0) return;
  
  const q1Id = genId(), q2Id = genId();
  const questions = [
    { id: q1Id, title: '이차방정식 근의 공식이 이해가 안 돼요', content: '근의 공식에서 판별식 b²-4ac 부분이 왜 필요한 건지 모르겠어요. 양수, 0, 음수일 때 각각 무슨 의미인지 알려주세요!', keywords: ['수학', '이차방정식'], authorId: 'user_02', authorName: '김수학', status: 'waiting', answerCount: 1, createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: q2Id, title: '영어 현재완료 vs 과거시제 차이', content: '"I have eaten lunch"와 "I ate lunch"의 차이를 잘 모르겠어요. 둘 다 과거에 먹었다는 뜻 아닌가요?', keywords: ['영어', '문법'], authorId: 'user_03', authorName: '이영어', status: 'solved', answerCount: 2, createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: genId(), title: '광합성 과정에서 물의 역할이 뭔가요?', content: '광합성에서 물이 분해되면서 산소가 나온다는데, 정확히 어떤 과정을 거치는 건지 궁금합니다.', keywords: ['과학', '생물'], authorId: 'user_04', authorName: '박과학', status: 'waiting', answerCount: 0, createdAt: new Date(Date.now() - 1800000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString() },
    { id: genId(), title: '조선시대 과거시험 종류가 너무 많아요', content: '문과, 무과, 잡과... 소과, 대과... 너무 복잡해요. 쉽게 정리해 주세요!', keywords: ['한국사', '조선시대'], authorId: 'user_05', authorName: '최역사', status: 'waiting', answerCount: 0, createdAt: new Date(Date.now() - 5400000).toISOString(), updatedAt: new Date(Date.now() - 5400000).toISOString() }
  ];
  setLocal(KEYS.Q, questions);
  
  setLocal(KEYS.A, [
    { id: genId(), questionId: q1Id, content: '판별식은 해(근)가 몇 개인지 알려줘요!\n\n• 양수(>0): 서로 다른 두 근\n• 0: 중근\n• 음수(<0): 실수 해 없음(허근)', authorId: 'user_03', authorName: '이영어', createdAt: new Date(Date.now() - 3000000).toISOString() },
    { id: genId(), questionId: q2Id, content: '핵심은 "현재와의 연결"이에요.\n\n• "I ate lunch" → 과거 사실만\n• "I have eaten lunch" → 지금 배 안 고프다 (현재에 영향)', authorId: 'user_02', authorName: '김수학', createdAt: new Date(Date.now() - 6000000).toISOString() },
    { id: genId(), questionId: q2Id, content: '"yesterday" 같은 구체적 과거 시점이 있으면 반드시 과거시제를 써야 해요!', authorId: 'user_04', authorName: '박과학', createdAt: new Date(Date.now() - 5500000).toISOString() }
  ]);
  
  setLocal(KEYS.AN, [
    { id: genId(), title: '📌 중간고사 일정 안내', content: '이번 학기 중간고사는 5월 25일(월)~29일(금)입니다.\n시험 범위는 각 과목 선생님께 확인해 주세요.\n모두 화이팅! 💪', authorId: 'user_01', authorName: '테스트 유저', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: genId(), title: '🏃 체육대회 참가 신청', content: '6월 5일 체육대회 종목별 참가 신청을 받습니다.\n종목: 계주, 줄다리기, 피구, 배드민턴\n신청 마감: 5월 30일까지', authorId: 'user_02', authorName: '김수학', createdAt: new Date(Date.now() - 172800000).toISOString() }
  ]);
}
