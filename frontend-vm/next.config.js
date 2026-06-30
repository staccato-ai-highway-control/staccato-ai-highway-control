/**
 * 파일 역할: Next.js 빌드 및 런타임 동작을 제어하는 프로젝트 설정입니다.
 * 유지보수 참고: 라우팅, 이미지, 빌드 옵션 변경은 전체 애플리케이션 배포 결과에 영향을 줄 수 있습니다.
 *
 * 브라우저의 동일 출처 요청을 Flask 또는 AI VM으로 전달하는 서버 내부 프록시입니다.
 * redirect가 아니므로 주소창은 바뀌지 않고 실제 사설 IP를 프론트에 직접 노출하지 않습니다.
 */
const path = require("path");

// 코드 설명: FLASK_API_BASE_URL 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  "http://192.168.0.187:5000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  devIndicators: false,

  // Socket.IO endpoint needs trailing slash.
  // Prevent Next from redirecting /socket.io/ -> /socket.io.
  skipTrailingSlashRedirect: true,


  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com https://oapi.map.naver.com https://maps.googleapis.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob:",
          "connect-src 'self' ws: wss: https://dapi.kakao.com https://oapi.map.naver.com https://maps.googleapis.com",
          "font-src 'self' data:",
          "object-src 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async rewrites() {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [ { // 일반 인증, 게시판, 보고서, 돌발 상황 API를 Flask 백엔드로 전달합니다. source: "/backend-…
    return [
      {
        // 일반 인증, 게시판, 보고서, 돌발 상황 API를 Flask 백엔드로 전달합니다.
        source: "/backend-api/:path*",
        destination: `${FLASK_API_BASE_URL.replace(/\/$/, "")}/:path*`,
      },
      {
        source: "/socket.io",
        destination: `${FLASK_API_BASE_URL.replace(/\/$/, "")}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${FLASK_API_BASE_URL.replace(/\/$/, "")}/socket.io/:path*`,
      },
    ];
  },
};

// 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: module.exports = nextConfig;
module.exports = nextConfig;
