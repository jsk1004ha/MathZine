import "./globals.css";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/auth";

const metadataBase = (() => {
  try {
    return new URL(process.env.APP_ORIGIN || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
})();

export const metadata = {
  title: "MathZine",
  description: "천수동의 수학 월간지",
  metadataBase,
  openGraph: {
    title: "MathZine",
    description: "천수동의 수학 월간지",
    siteName: "MathZine",
    type: "website"
  }
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();

  return (
    <html lang="ko">
      <body>
        <div className="page-frame">
          <Header user={user} />
          <main className="page-content">{children}</main>
          <footer className="site-footer">
            <p className="masthead-logo footer-logo">MathZine</p>
            <p>천수동의 수학 월간지</p>
            <div className="footer-meta">
              <span>ⓒ천재들의 수학 동아리</span>
              <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.ko" rel="noreferrer" target="_blank">
                저작권(라이선스: CC BY-NC-SA 3.0 KR)
              </a>
              <span>제작: 2309 김준서</span>
              <span>관리: 천수동 태규쌤의 노예들</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
