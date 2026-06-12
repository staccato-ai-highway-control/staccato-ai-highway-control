/**
 * 파일 역할: 보고서 / analysis-request 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, Sparkles } from "lucide-react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter, useSearchParams } from "next/navigation";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Suspense, useEffect, useMemo, useState } from "react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getReport, requestReportAnalysis } from "@/features/reports/api";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { Report } from "@/features/reports/types";

// 코드 설명: getReportTitle 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportTitle(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.title ?? report.subject ?? "제목 없음"
  return report.title ?? report.subject ?? "제목 없음";
}

// 코드 설명: getReportCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportCode(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.report_code ?? report.reportCode ?? `#${report.id}`
  return report.report_code ?? report.reportCode ?? `#${report.id}`;
}

// 코드 설명: getReportLocation 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getReportLocation(report: Report) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: report.location ?? report.address ?? report.place_name ?? report.locati…
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-";
}

// 코드 설명: AnalysisRequestContent 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function AnalysisRequestContent() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: searchParams 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const searchParams = useSearchParams();
  // 코드 설명: reportIdsParam 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const reportIdsParam = searchParams.get("reportIds") ?? "";
  // 코드 설명: reportIds 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const reportIds = useMemo(
    () => Array.from(new Set(reportIdsParam.split(",").map((id) => id.trim()).filter(Boolean))),
    [reportIdsParam]
  );
  // 코드 설명: [reports, setReports] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [reports, setReports] = useState<Report[]>([]);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [requesting, setRequesting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [requesting, setRequesting] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [resultMessage, setResultMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [resultMessage, setResultMessage] = useState("");

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: active 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let active = true;

    // 코드 설명: loadSelectedReports 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadSelectedReports() {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: reportIds.length === 0
      if (reportIds.length === 0) {
        // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setLoading(false);
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");
      // 코드 설명: results 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const results = await Promise.allSettled(reportIds.map((reportId) => getReport(reportId)));
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !active
      if (!active) return;

      // 코드 설명: loadedReports 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const loadedReports = results
        .filter((result): result is PromiseFulfilledResult<Report> => result.status === "fulfilled")
        .map((result) => result.value);
      // 코드 설명: setReports 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setReports(loadedReports);
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);

      // 코드 설명: failedCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const failedCount = results.length - loadedReports.length;
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: failedCount > 0
      if (failedCount > 0) {
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage(`${failedCount}건의 신고 정보를 불러오지 못했습니다.`);
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadSelectedReports();
    loadSelectedReports();
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { active = false; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: active = false;
      active = false;
    };
  }, [reportIds]);

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmit() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: reports.length === 0 || requesting
    if (reports.length === 0 || requesting) return;
    // 코드 설명: setRequesting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRequesting(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: setResultMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setResultMessage("");

    // 코드 설명: results 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const results = await Promise.allSettled(
      reports.map((report) => requestReportAnalysis(report.id))
    );
    // 코드 설명: failedCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const failedCount = results.filter((result) => result.status === "rejected").length;
    // 코드 설명: successCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const successCount = results.length - failedCount;
    // 코드 설명: setRequesting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setRequesting(false);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: failedCount === 0
    if (failedCount === 0) {
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push("/reports");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setResultMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setResultMessage(`${successCount}건 요청 완료, ${failedCount}건 요청 실패`);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("일부 신고의 분석 요청을 처리하지 못했습니다. 실패한 항목은 신고 상세에서 다시 요청해 주세요.");
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <AppLayout title="분석 요청">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/reports" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500 no-underline hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            신고 목록
          </Link>
          <h2 className="text-2xl font-black text-slate-950">선택 신고 분석 요청</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">선택한 신고를 확인한 후 AI 분석을 일괄 요청합니다.</p>
        </div>
        <Badge tone="blue">{reports.length}건 선택</Badge>
      </section>

      {errorMessage ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
      {resultMessage ? <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-700">{resultMessage}</div> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-black text-slate-900">분석 대상</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">요청을 실행하면 각 신고에 대해 기존 분석 API가 호출됩니다.</p>
        </div>

        {loading ? <p className="p-8 text-center text-sm font-bold text-slate-500">선택한 신고를 불러오는 중입니다.</p> : null}
        {!loading && reports.length === 0 ? <p className="p-8 text-center text-sm font-bold text-slate-500">분석 요청할 신고가 선택되지 않았습니다.</p> : null}

        {!loading && reports.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <div key={report.id} className="grid gap-2 px-5 py-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] md:items-center">
                <span className="truncate text-xs font-black text-sky-700">{getReportCode(report)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900" title={getReportTitle(report)}>{getReportTitle(report)}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500" title={getReportLocation(report)}>{getReportLocation(report)}</p>
                </div>
                <div className="flex justify-start md:justify-end">
                  <Link href={`/reports/${report.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline hover:bg-slate-50">상세 보기</Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <Link href="/reports" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline hover:bg-slate-100">
            취소
          </Link>
          <button type="button" onClick={handleSubmit} disabled={loading || requesting || reports.length === 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {requesting ? "분석 요청 중" : `${reports.length}건 분석 요청`}
          </button>
        </div>
      </section>
    </AppLayout>
  );
}

// 코드 설명: AnalysisRequestPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function AnalysisRequestPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <Suspense fallback={<p className="p-8 text-center text-sm font-bold text-slate-500">분석 요청 화면을 불러오는 중입니다.</p>}>
        <AnalysisRequestContent />
      </Suspense>
    </RequireAuth>
  );
}
