import "./globals.css";

export const metadata = {
  title: "클래스보드 | ClassBoard",
  description: "학생들이 서로 질문하고 답변하는 학습 커뮤니티",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
