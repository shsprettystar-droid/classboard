'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Store from '@/lib/store';
import { isConfigured } from '@/lib/firebase';
import { timeAgo, truncate } from '@/lib/utils';

export default function Home() {
  // ===== 화면 뷰 상태 ('welcome' = 랜딩 페이지, 'app' = 3단 게시판) =====
  const [view, setView] = useState('welcome');
  const [fadeActive, setFadeActive] = useState(false);

  // ===== 기존 게시판 상태 =====
  const [questions, setQuestions] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeKeyword, setActiveKeyword] = useState(null);
  const [mobileTab, setMobileTab] = useState('board');

  // 모달 상태
  const [showNewQ, setShowNewQ] = useState(false);
  const [showDetail, setShowDetail] = useState(null); // 질문 ID
  const [showNewAnn, setShowNewAnn] = useState(false);
  const [showAnnDetail, setShowAnnDetail] = useState(null); // 공지 객체

  // 폼 상태
  const [qTitle, setQTitle] = useState('');
  const [qContent, setQContent] = useState('');
  const [qTags, setQTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [answerInput, setAnswerInput] = useState('');

  // 비동기적으로 Firebase 데이터 조회
  const reload = useCallback(async () => {
    try {
      const qs = activeKeyword 
        ? await Store.getQuestionsByKeyword(activeKeyword) 
        : await Store.getQuestions();
      
      const kws = await Store.getKeywords();
      const anns = await Store.getAnnouncements();

      setQuestions(qs);
      setKeywords(kws);
      setAnnouncements(anns);
    } catch (error) {
      console.error("데이터 갱신 실패:", error);
    }
  }, [activeKeyword]);

  useEffect(() => { 
    Store.initSampleData(); 
    reload(); 
  }, [reload]);

  // ===== 질문 등록 =====
  const submitQuestion = async () => {
    if (!qTitle.trim()) return alert('제목을 입력해 주세요!');
    if (!qContent.trim()) return alert('내용을 입력해 주세요!');
    await Store.addQuestion(qTitle.trim(), qContent.trim(), [...qTags]);
    setQTitle(''); setQContent(''); setQTags([]);
    setShowNewQ(false); 
    await reload();
  };

  // ===== 태그 추가 =====
  const handleTagKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const t = tagInput.trim();
      if (t && !qTags.includes(t)) setQTags([...qTags, t]);
      setTagInput('');
    }
  };

  // ===== 답변 등록 =====
  const submitAnswer = async () => {
    if (!answerInput.trim()) return alert('답변을 입력해 주세요!');
    await Store.addAnswer(showDetail, answerInput.trim());
    setAnswerInput(''); 
    await reload();
  };

  // ===== 상태 토글 =====
  const toggleStatus = async (id) => {
    await Store.toggleQuestionStatus(id); 
    await reload();
  };

  // ===== 공지 등록 =====
  const submitAnn = async () => {
    if (!annTitle.trim()) return alert('제목을 입력해 주세요!');
    if (!annContent.trim()) return alert('내용을 입력해 주세요!');
    await Store.addAnnouncement(annTitle.trim(), annContent.trim());
    setAnnTitle(''); setAnnContent('');
    setShowNewAnn(false); 
    await reload();
  };

  // 현재 상세보기 질문 데이터
  const detailQ = showDetail ? questions.find(q => q.id === showDetail) : null;
  const [detailAnswers, setDetailAnswers] = useState([]);

  // 상세 보기 답변 비동기 조회
  useEffect(() => {
    if (showDetail) {
      Store.getAnswers(showDetail).then(setDetailAnswers);
    }
  }, [showDetail, questions]);

  const totalCount = questions.length;

  // 랜딩페이지에서 메인 앱으로 부드럽게 입장하기
  const handleEnterApp = () => {
    setFadeActive(true);
    setTimeout(() => {
      setView('app');
    }, 400);
  };

  // ===== 1. 랜딩/웰컴 페이지 화면 =====
  if (view === 'welcome') {
    return (
      <div className={`welcome-screen ${fadeActive ? 'fade-out' : ''}`}>
        <div className="welcome-container">
          <div className="hero-image-wrapper">
            <img src="/images/hero.png" alt="Studying Students" className="hero-image" />
            <div className="center-overlay">
              <h1 className="welcome-title">ClassBoard</h1>
              <p className="welcome-subtitle">서로 질문하고 답하며<br />함께 성장하는 우리들의 학습 공간</p>
              <button className="welcome-btn" onClick={handleEnterApp}>
                공부하러 가기 🚀
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .welcome-screen {
            width: 100vw;
            height: 100vh;
            background-color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            transition: opacity 0.4s ease, transform 0.4s ease;
          }
          .welcome-screen.fade-out {
            opacity: 0;
            transform: scale(1.02);
          }
          .welcome-container {
            position: relative;
            width: 100%;
            max-width: 850px;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }
          .hero-image-wrapper {
            position: relative;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .hero-image {
            width: 100%;
            height: auto;
            max-height: 85vh;
            object-fit: contain;
            border-radius: 40px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          }
          .center-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 10;
            background: rgba(255, 255, 255, 0.85);
            padding: 30px 40px;
            border-radius: 30px;
            backdrop-filter: blur(8px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.04);
            border: 1px solid rgba(255, 255, 255, 0.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            max-width: 380px;
            width: 90%;
          }
          .welcome-title {
            font-size: 2.6rem;
            font-weight: 850;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
            letter-spacing: -1px;
            animation: bounceIn 0.8s ease;
          }
          .welcome-subtitle {
            font-size: 0.95rem;
            color: #4b5563;
            line-height: 1.5;
            font-weight: 500;
            margin: 0;
            word-break: keep-all;
          }
          .welcome-btn {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35);
            transition: all 0.3s ease;
            outline: none;
            margin-top: 5px;
          }
          .welcome-btn:hover {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 12px 30px rgba(99, 102, 241, 0.5);
          }
          .welcome-btn:active {
            transform: translateY(0) scale(1);
          }

          @keyframes bounceIn {
            0% { opacity: 0; transform: scale(0.3); }
            50% { opacity: 0.9; transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
          
          @media (max-width: 600px) {
            .center-overlay {
              padding: 20px;
              gap: 10px;
            }
            .welcome-title {
              font-size: 2rem;
            }
            .welcome-subtitle {
              font-size: 0.85rem;
            }
            .welcome-btn {
              padding: 10px 24px;
              font-size: 0.9rem;
            }
          }
        `}</style>
      </div>
    );
  }

  // ===== 2. 기존 다크 모드 3단 게시판 화면 =====
  return (
    <div className="app-fade-in">
      {/* 헤더 */}
      <header className="app-header">
        <div className="app-logo" onClick={() => setView('welcome')} style={{ cursor: 'pointer' }}>
          <span className="app-logo-icon">🎓</span> ClassBoard
        </div>
        <div className="user-info">
          {/* Firebase 연결 상태 인디케이터 배지 */}
          <span 
            className="db-status-badge" 
            title={isConfigured ? "클라우드(Firebase) 실시간 동기화 활성화됨" : "로컬 브라우저 저장 모드 작동 중"}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConfigured ? '#16a34a' : '#ea580c',
              boxShadow: isConfigured ? '0 0 8px #22c55e' : '0 0 8px #f97316',
              display: 'inline-block',
              marginRight: '2px'
            }}
          />
          <div className="user-avatar">U</div>
          <span>{Store.CURRENT_USER.name}</span>
        </div>
      </header>

      {/* 모바일 탭 */}
      <nav className="mobile-tabs">
        {['board', 'keywords', 'announcements'].map(tab => (
          <button key={tab} className={mobileTab === tab ? 'active' : ''} onClick={() => setMobileTab(tab)}>
            {tab === 'board' ? '📝 질문' : tab === 'keywords' ? '🏷️ 키워드' : '📢 공지'}
          </button>
        ))}
      </nav>

      {/* 3단 레이아웃 */}
      <div className={`app-layout ${mobileTab === 'keywords' ? 'show-keywords' : ''} ${mobileTab === 'announcements' ? 'show-announcements' : ''}`}>

        {/* 왼쪽: 키워드 */}
        <aside className="sidebar sidebar-left">
          <div className="sidebar-header"><div className="sidebar-title">🏷️ 키워드</div></div>
          <div className="keyword-list">
            <div className={`keyword-item ${activeKeyword === null ? 'active' : ''}`} onClick={() => { setActiveKeyword(null); }}>
              <span>📋 전체</span>
              <span className="keyword-badge">{totalCount}</span>
            </div>
            {keywords.map(kw => (
              <div key={kw.name} className={`keyword-item ${activeKeyword === kw.name ? 'active' : ''}`} onClick={() => { setActiveKeyword(kw.name); }}>
                <span># {kw.name}</span>
                <span className="keyword-badge">{kw.count}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* 가운데: 질문 게시판 */}
        <main className="main-board">
          <div className="board-header">
            <h1 className="board-title">📝 질문 게시판 <span>({questions.length}개)</span></h1>
            <button className="btn btn-primary" onClick={() => setShowNewQ(true)}>✏️ 질문하기</button>
          </div>
          <div className="question-list">
            {questions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🤔</div>
                <div className="empty-state-text">아직 질문이 없어요!<br />첫 번째 질문을 올려보세요.</div>
                <button className="btn btn-primary" onClick={() => setShowNewQ(true)}>✏️ 질문하기</button>
              </div>
            ) : questions.map(q => (
              <div key={q.id} className="question-card" onClick={() => setShowDetail(q.id)}>
                <div className="card-header">
                  <span className={`card-status ${q.status}`}>
                    {q.status === 'waiting' ? '⏳ 답변 대기중' : '✅ 해결 완료'}
                  </span>
                </div>
                <div className="card-title">{q.title}</div>
                <div className="card-preview">{truncate(q.content, 100)}</div>
                <div className="card-tags">
                  {(q.keywords || []).map(k => <span key={k} className="tag">#{k}</span>)}
                </div>
                <div className="card-footer">
                  <span>👤 {q.authorName}</span>
                  <div className="card-meta">
                    <span>💬 {q.answerCount || 0}</span>
                    <span>{timeAgo(q.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* 오른쪽: 공지사항 */}
        <aside className="sidebar sidebar-right">
          <div className="sidebar-header">
            <div className="sidebar-title">📢 공지사항</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNewAnn(true)}>+ 작성</button>
          </div>
          <div className="announcement-list">
            {announcements.map(a => (
              <div key={a.id} className="announcement-card" onClick={() => setShowAnnDetail(a)}>
                <div className="ann-title">{a.title}</div>
                <div className="ann-preview">{truncate(a.content, 60)}</div>
                <div className="ann-meta">
                  <span>👤 {a.authorName}</span>
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ===== 모달: 새 질문 ===== */}
      {showNewQ && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowNewQ(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">✏️ 새 질문 작성</div>
              <button className="modal-close" onClick={() => setShowNewQ(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">제목</label>
                <input className="form-input" placeholder="질문을 한 줄로 요약해 주세요" value={qTitle} onChange={e => setQTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <textarea className="form-textarea" placeholder="궁금한 내용을 자세히 적어주세요" value={qContent} onChange={e => setQContent(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">키워드</label>
                <div className="tag-input-wrapper">
                  {qTags.map(t => (
                    <span key={t} className="tag">#{t} <span className="tag-remove" onClick={() => setQTags(qTags.filter(x => x !== t))}>&times;</span></span>
                  ))}
                  <input className="tag-input" placeholder="엔터로 키워드 추가" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} />
                </div>
                <div className="form-hint">엔터(Enter)를 눌러 키워드를 추가하세요</div>
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowNewQ(false)}>취소</button>
                <button className="btn btn-primary" onClick={submitQuestion}>질문 등록</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 모달: 질문 상세 ===== */}
      {detailQ && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowDetail(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{detailQ.title}</div>
              <button className="modal-close" onClick={() => setShowDetail(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span className={`card-status ${detailQ.status}`}>
                  {detailQ.status === 'waiting' ? '⏳ 답변 대기중' : '✅ 해결 완료'}
                </span>
              </div>
              <div className="detail-content">{detailQ.content}</div>
              <div className="detail-tags">
                {(detailQ.keywords || []).map(k => <span key={k} className="tag">#{k}</span>)}
              </div>
              <div className="detail-meta">
                <span>👤 {detailQ.authorName}</span>
                <span>{timeAgo(detailQ.createdAt)}</span>
              </div>
              {detailQ.authorId === Store.CURRENT_USER.id && (
                <button className={`btn ${detailQ.status === 'waiting' ? 'btn-solve' : 'btn-ghost'} btn-sm`} style={{ marginBottom: '16px' }} onClick={() => toggleStatus(detailQ.id)}>
                  {detailQ.status === 'waiting' ? '✅ 해결 완료로 변경' : '⏳ 대기중으로 변경'}
                </button>
              )}
              <div>
                <div className="answers-title">💬 답변 ({detailAnswers.length}개)</div>
                {detailAnswers.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '16px' }}>아직 답변이 없어요. 첫 답변을 달아주세요!</p>
                )}
                {detailAnswers.map(a => (
                  <div key={a.id} className="answer-item">
                    <div className="answer-content">{a.content}</div>
                    <div className="answer-meta">
                      <span>👤 {a.authorName}</span>
                      <span>{timeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                ))}
                <div className="answer-form">
                  <textarea className="form-textarea" placeholder="답변을 작성해 주세요" value={answerInput} onChange={e => setAnswerInput(e.target.value)} />
                  <button className="btn btn-primary" onClick={submitAnswer}>등록</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 모달: 새 공지 ===== */}
      {showNewAnn && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowNewAnn(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">📢 새 공지사항</div>
              <button className="modal-close" onClick={() => setShowNewAnn(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">제목</label>
                <input className="form-input" placeholder="공지 제목을 입력하세요" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <textarea className="form-textarea" placeholder="공지 내용을 입력하세요" value={annContent} onChange={e => setAnnContent(e.target.value)} />
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setShowNewAnn(false)}>취소</button>
                <button className="btn btn-primary" onClick={submitAnn}>공지 등록</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 모달: 공지 상세 ===== */}
      {showAnnDetail && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowAnnDetail(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{showAnnDetail.title}</div>
              <button className="modal-close" onClick={() => setShowAnnDetail(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-content">{showAnnDetail.content}</div>
              <div className="detail-meta">
                <span>👤 {showAnnDetail.authorName}</span>
                <span>{timeAgo(showAnnDetail.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .app-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
