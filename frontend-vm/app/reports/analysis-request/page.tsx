"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Badge } from "@/components/common/Badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { getReport, requestReportAnalysis } from "@/features/reports/api";
import type { Report } from "@/features/reports/types";

function getReportTitle(report: Report) {
  return report.title ?? report.subject ?? "제목 없음";
}

function getReportCode(report: Report) {
  return report.report_code ?? report.reportCode ?? `#${report.id}`;
}

function getReportLocation(report: Report) {
  return report.location ?? report.address ?? report.place_name ?? report.locationName ?? "-";
}

function AnalysisRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportIdsParam = searchParams.get("reportIds") ?? "";
  const reportIds = useMemo(
    () => Array.from(new Set(reportIdsParam.split(",").map((id) => id.trim()).filter(Boolean))),
    [reportIdsParam]
  );
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSelectedReports() {
      if (reportIds.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");
      const results = await Promise.allSettled(reportIds.map((reportId) => getReport(reportId)));
      if (!active) return;

      const loadedReports = results
        .filter((result): result is PromiseFulfilledResult<Report> => result.status === "fulfilled")
        .map((result) => result.value);
      setReports(loadedReports);
      setLoading(false);

      const failedCount = results.length - loadedReports.length;
      if (failedCount > 0) {
        setErrorMessage(`${failedCount}건의 신고 정보를 불러오지 못했습니다.`);
      }
    }

    loadSelectedReports();
    return () => {
      active = false;
    };
  }, [reportIds]);

  async function handleSubmit() {
    if (reports.length === 0 || requesting) return;
    setRequesting(true);
    setErrorMessage("");
    setResultMessage("");

    const results = await Promise.allSettled(
      reports.map((report) => requestReportAnalysis(report.id))
    );
    const failedCount = results.filter((result) => result.status === "rejected").length;
    const successCount = results.length - failedCount;
    setRequesting(false);

    if (failedCount === 0) {
      router.push("/reports");
      return;
    }

    setResultMessage(`${successCount}건 요청 완료, ${failedCount}건 요청 실패`);
    setErrorMessage("일부 신고의 분석 요청을 처리하지 못했습니다. 실패한 항목은 신고 상세에서 다시 요청해 주세요.");
  }

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

export default function AnalysisRequestPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<p className="p-8 text-center text-sm font-bold text-slate-500">분석 요청 화면을 불러오는 중입니다.</p>}>
        <AnalysisRequestContent />
      </Suspense>
    </RequireAuth>
  );
}
