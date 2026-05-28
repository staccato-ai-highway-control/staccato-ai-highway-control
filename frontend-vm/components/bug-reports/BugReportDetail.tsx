"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { fetchBugReport } from "@/features/bug-reports/api";
import type { BugReport } from "@/features/bug-reports/types";

const statusLabels: Record<string, string> = {
  OPEN: "열림",
  IN_PROGRESS: "처리중",
  RESOLVED: "해결",
  CLOSED: "닫힘",
};

function badgeTone(value?: string): "slate" | "blue" | "green" | "amber" | "red" {
  if (!value) return "slate";
  if (["CRITICAL", "HIGH"].includes(value)) return "red";
  if (["MAJOR", "IN_PROGRESS", "MEDIUM"].includes(value)) return "amber";
  if (["RESOLVED", "CLOSED", "LOW"].includes(value)) return "green";
  if (["OPEN", "MINOR"].includes(value)) return "blue";
  return "slate";
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-800">{value || "-"}</dd>
    </div>
  );
}

export function BugReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<BugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadReport() {
      setLoading(true);
      setErrorMessage("");

      try {
        const nextReport = await fetchBugReport(Number(id));
        if (mounted) setReport(nextReport);
      } catch (error) {
        if (!mounted) return;
        setReport(null);
        setErrorMessage(error instanceof Error ? error.message : "문의 상세를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReport();

    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">STACCATO</p>
            <h1 className="mt-3 text-3xl font-black">문의 상세</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">등록된 오류나 개선 요청 내용을 확인합니다.</p>
          </div>

          <Link href="/bug-reports" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 no-underline transition hover:bg-slate-50">
            목록으로
          </Link>
        </header>

        {loading ? (
          <Card className="p-10 text-center text-sm font-bold text-slate-500">문의 상세를 불러오는 중입니다.</Card>
        ) : null}

        {!loading && errorMessage ? (
          <Card className="p-10 text-center">
            <p className="text-sm font-bold text-red-700">{errorMessage}</p>
          </Card>
        ) : null}

        {!loading && !errorMessage && !report ? (
          <Card className="p-10 text-center text-sm font-black text-slate-500">버그 리포트를 찾을 수 없습니다.</Card>
        ) : null}

        {!loading && !errorMessage && report ? (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone={badgeTone(report.status)}>{statusLabels[report.status ?? ""] ?? report.status ?? "OPEN"}</Badge>
                <Badge tone={badgeTone(report.severity)}>{report.severity ?? "MINOR"}</Badge>
                <Badge tone={badgeTone(report.priority)}>{report.priority ?? "MEDIUM"}</Badge>
              </div>
              <h2 className="text-2xl font-black text-slate-950">{report.title || "제목 없음"}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">{report.description || "설명이 없습니다."}</p>
            </div>

            <dl className="grid gap-3 p-6 md:grid-cols-2">
              <DetailRow label="category" value={report.category} />
              <DetailRow label="pageUrl" value={report.page_url} />
              <DetailRow label="browser" value={report.browser} />
              <DetailRow label="os" value={report.os} />
              <DetailRow label="device" value={report.device} />
              <DetailRow label="appVersion" value={report.app_version} />
              <DetailRow label="createdAt" value={formatDate(report.created_at)} />
              <DetailRow label="updatedAt" value={formatDate(report.updated_at)} />
              <div className="md:col-span-2">
                <DetailRow label="stepsToReproduce" value={report.steps_to_reproduce} />
              </div>
              <div className="md:col-span-2">
                <DetailRow label="expectedResult" value={report.expected_result} />
              </div>
              <div className="md:col-span-2">
                <DetailRow label="actualResult" value={report.actual_result} />
              </div>
            </dl>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
