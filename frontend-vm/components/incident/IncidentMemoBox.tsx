export function IncidentMemoBox({ memo }: { memo?: string }) {
  return <textarea defaultValue={memo} placeholder="관리자 메모를 입력하세요" className="min-h-32 w-full rounded-lg border border-slate-200 p-3" />;
}
