import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STACCATO Road AI",
  description: "AI-X 기반 고속도로 정차 차량 탐지 및 통합 관제 시스템"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
