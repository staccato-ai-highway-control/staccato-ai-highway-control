const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

const serverCards = [
  {
    name: "Flask Server",
    port: "5000",
    role: "메인 백엔드 API, 인증, DB 접근, Socket.IO, LLM 보고서"
  },
  {
    name: "AI Server",
    port: "8001",
    role: "AI-X 영상 분석, 정차 판단, ROI 판별"
  },
  {
    name: "ITS Server",
    port: "8002",
    role: "날씨, 교통량, 도로정보, 경로 API 연계"
  },
  {
    name: "DB Server",
    port: "3307 → 3306",
    role: "MySQL 8.0 기반 전체 업무 데이터 저장"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-blue-600">STACCATO MVP</p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            AI-X 기반 고속도로 정차 차량 탐지 및 통합 관제 시스템
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            본 화면은 STACCATO Frontend Server의 기본 실행 확인용 페이지입니다.
            향후 관제 대시보드, 실시간 알림, 사고 상세, LLM 보고서, MLOps 관리 화면으로 확장됩니다.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-semibold">Backend API Base URL:</span>{" "}
            <code>{apiBaseUrl}</code>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {serverCards.map((server) => (
            <article
              key={server.name}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  {server.name}
                </h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  Port {server.port}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {server.role}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
          <h2 className="text-xl font-semibold">현재 구현 범위</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>• Frontend 기본 Next.js 실행 구조</li>
            <li>• STACCATO 5개 서버 구조 표시</li>
            <li>• Docker Compose 기반 실행 검증 대상</li>
            <li>• 실제 대시보드/로그인/지도/알림 기능은 후속 브랜치에서 구현</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
