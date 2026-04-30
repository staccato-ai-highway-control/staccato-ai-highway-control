import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STACCATO - AI-X 기반 고속도로 정차 차량 탐지",
  description: "STACCATO",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
