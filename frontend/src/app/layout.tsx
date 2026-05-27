import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: 'PoBalance — AI 포트폴리오 건강검진',
  description: '내 주식 포트폴리오를 AI가 매일 진단합니다. 건강 점수, 섹터 분산, 리밸런싱 추천까지 무료로 확인하세요.',
  keywords: ['포트폴리오 분석', '주식 리밸런싱', 'AI 투자', '포트폴리오 건강검진', '주식 분산투자', '자산 배분'],
  openGraph: {
    title: 'PoBalance — AI 포트폴리오 건강검진',
    description: '내 주식 포트폴리오를 AI가 매일 진단합니다. 건강 점수, 섹터 분산, 리밸런싱 추천까지 무료.',
    url: 'https://www.pobalance.com',
    siteName: 'PoBalance',
    locale: 'ko_KR',
    type: 'website',
  },
  verification: {
    other: {
      'naver-site-verification': 'c309258e194170adbae1979d0c9e4741377ea9f6',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
