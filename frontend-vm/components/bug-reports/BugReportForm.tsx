/**
 * 파일 역할: 버그 신고 영역에서 사용하는 BugReportForm UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/bug-reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { createBugReport } from "@/features/bug-reports/api";
// 코드 설명: @/features/bug-reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { BugReportCreateRequest } from "@/features/bug-reports/types";

// 코드 설명: BugReportForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function BugReportForm() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [form, setForm] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [form, setForm] = useState<BugReportCreateRequest>({
    title: "",
    description: "",
    category: "GENERAL",
    severity: "MINOR",
    priority: "MEDIUM",
    app_version: "MVP",
  });
  // 코드 설명: [submitting, setSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submitting, setSubmitting] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");

  // 코드 설명: updateField 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function updateField(key: keyof BugReportCreateRequest, value: string) {
    // 코드 설명: setForm 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setForm((current) => ({ ...current, [key]: value }));
  }

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !form.title.trim()
    if (!form.title.trim()) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("제목을 입력해 주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !form.description.trim()
    if (!form.description.trim()) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("내용을 입력해 주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmitting(true);
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await createBugReport({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      });
      // 코드 설명: nextId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextId = "id" in response ? response.id : undefined;
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push(nextId ? `/bug-reports/${nextId}` : "/bug-reports");
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("버그리포트 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSubmitting(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-sm font-black text-slate-950">STACCATO</p>
          <h1 className="mt-3 text-3xl font-black">버그리포트 등록</h1>
        </header>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            {errorMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              제목
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              내용
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} className="min-h-36 rounded-lg border border-slate-200 p-3" />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                카테고리
                <input value={form.category ?? ""} onChange={(event) => updateField("category", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                심각도
                <select value={form.severity ?? "MINOR"} onChange={(event) => updateField("severity", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                  <option value="MINOR">MINOR</option>
                  <option value="MAJOR">MAJOR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                우선순위
                <select value={form.priority ?? "MEDIUM"} onChange={(event) => updateField("priority", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              페이지 URL
              <input value={form.page_url ?? ""} onChange={(event) => updateField("page_url", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
            </label>

            <button type="submit" disabled={submitting} className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
              {submitting ? "등록 중" : "등록"}
            </button>
          </form>
        </Card>
      </section>
    </main>
  );
}
