/**
 * 파일 역할: find-password 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import Link from "next/link";

// 코드 설명: FindPasswordPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function FindPasswordPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white">
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-md"
      />

      <div className="absolute inset-0 bg-slate-950/80" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
        <Link href="/" className="block no-underline">
          <img
            src="/assets/images/logo_01.png"
            alt="STACCATO"
            className="h-10 w-auto object-contain"
          />
        </Link>

        <h1 className="mt-8 text-3xl font-black">비밀번호 찾기</h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          가입한 이메일로 비밀번호 재설정 인증을 진행합니다.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-300">
              아이디 또는 이메일
            </label>
            <input
              type="text"
              placeholder="아이디 또는 이메일 입력"
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-lg bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400"
          >
            비밀번호 재설정 메일 발송
          </button>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            로그인
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}