export function SecurityCard({ onLogout }: { onLogout: () => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">보안</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        비밀번호 변경과 로그아웃은 계정 보안을 위해 이 영역에서 관리합니다.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          비밀번호 변경
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          로그아웃
        </button>
      </div>
    </section>
  );
}
