"use client";

import { Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";

type SecurityEventResult = "SUCCESS" | "FAIL" | "BLOCKED";

type SecurityLog = {
  id: string;
  createdAt: string;
  eventType: "LOGIN" | "SIGNUP_REQUEST" | "ROLE_CHANGE" | "FILE_DOWNLOAD" | "INCIDENT_STATUS_CHANGE" | "TOKEN_REFRESH";
  eventResult: SecurityEventResult;
  userEmail: string;
  ipAddress: string;
  resourceType: "AUTH" | "USER" | "REPORT" | "INCIDENT" | "FILE" | "SYSTEM";
  description: string;
};

const mockSecurityLogs: SecurityLog[] = [
  {
    id: "LOG-20260429-001",
    createdAt: "2026-04-29 10:42:11",
    eventType: "LOGIN",
    eventResult: "SUCCESS",
    userEmail: "kim.control@its.go.kr",
    ipAddress: "10.10.12.24",
    resourceType: "AUTH",
    description: "관제 관리자 로그인 성공",
  },
  {
    id: "LOG-20260429-002",
    createdAt: "2026-04-29 10:38:04",
    eventType: "INCIDENT_STATUS_CHANGE",
    eventResult: "SUCCESS",
    userEmail: "lee.patrol@its.go.kr",
    ipAddress: "10.10.13.18",
    resourceType: "INCIDENT",
    description: "STP-20260429-001 상태를 REVIEWING에서 ASSIGNED로 변경",
  },
  {
    id: "LOG-20260429-003",
    createdAt: "2026-04-29 10:31:44",
    eventType: "FILE_DOWNLOAD",
    eventResult: "SUCCESS",
    userEmail: "park.control@its.go.kr",
    ipAddress: "10.10.12.51",
    resourceType: "FILE",
    description: "LLM 보고서 초안 PDF 다운로드",
  },
  {
    id: "LOG-20260429-004",
    createdAt: "2026-04-29 10:22:19",
    eventType: "LOGIN",
    eventResult: "FAIL",
    userEmail: "unknown@example.com",
    ipAddress: "203.0.113.14",
    resourceType: "AUTH",
    description: "등록되지 않은 이메일로 로그인 시도",
  },
  {
    id: "LOG-20260429-005",
    createdAt: "2026-04-29 09:58:33",
    eventType: "ROLE_CHANGE",
    eventResult: "BLOCKED",
    userEmail: "lee.viewer@its.go.kr",
    ipAddress: "10.10.14.33",
    resourceType: "USER",
    description: "권한 부족으로 사용자 역할 변경 요청 차단",
  },
  {
    id: "LOG-20260429-006",
    createdAt: "2026-04-29 09:45:02",
    eventType: "SIGNUP_REQUEST",
    eventResult: "SUCCESS",
    userEmail: "choi.maint@its.go.kr",
    ipAddress: "10.10.15.92",
    resourceType: "USER",
    description: "회원가입 신청 접수",
  },
  {
    id: "LOG-20260428-011",
    createdAt: "2026-04-28 18:12:20",
    eventType: "TOKEN_REFRESH",
    eventResult: "SUCCESS",
    userEmail: "jung.response@its.go.kr",
    ipAddress: "10.10.12.87",
    resourceType: "SYSTEM",
    description: "인증 토큰 갱신",
  },
];

const eventTypeLabels: Record<SecurityLog["eventType"], string> = {
  LOGIN: "로그인",
  SIGNUP_REQUEST: "회원가입",
  ROLE_CHANGE: "권한 변경",
  FILE_DOWNLOAD: "파일 다운로드",
  INCIDENT_STATUS_CHANGE: "사고 상태 변경",
  TOKEN_REFRESH: "토큰 갱신",
};

const resultTone: Record<SecurityEventResult, "green" | "red" | "amber"> = {
  SUCCESS: "green",
  FAIL: "red",
  BLOCKED: "amber",
};

const periodLabels = {
  ALL: "전체 기간",
  TODAY: "오늘",
  "7_DAYS": "최근 7일",
  "30_DAYS": "최근 30일",
} as const;

type PeriodFilter = keyof typeof periodLabels;

export default function SecurityLogsPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState<SecurityLog["eventType"] | "ALL">("ALL");
  const [resultFilter, setResultFilter] = useState<SecurityEventResult | "ALL">("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("ALL");
  const [query, setQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return mockSecurityLogs.filter((log) => {
      const matchesEventType = eventTypeFilter === "ALL" || log.eventType === eventTypeFilter;
      const matchesResult = resultFilter === "ALL" || log.eventResult === resultFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        log.userEmail.toLowerCase().includes(normalizedQuery) ||
        log.description.toLowerCase().includes(normalizedQuery);

      return matchesEventType && matchesResult && matchesSearch;
    });
  }, [eventTypeFilter, resultFilter, query]);

  return (
    <RequireSuperAdmin title="보안 로그">
      <AppLayout title="보안 로그">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">보안 로그</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              로그인, 회원가입, 권한 변경, 파일 다운로드, 사고 상태 변경 이벤트를 확인합니다.
            </p>
          </div>
          <Badge tone="blue">감사 로그 mock</Badge>
        </section>

        <Card className="mb-5 p-5">
          <div className="grid gap-4 xl:grid-cols-[180px_180px_180px_minmax(0,1fr)]">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">이벤트 타입</span>
              <select
                value={eventTypeFilter}
                onChange={(event) => setEventTypeFilter(event.target.value as SecurityLog["eventType"] | "ALL")}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">전체</option>
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">결과</span>
              <select
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value as SecurityEventResult | "ALL")}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">전체</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAIL">FAIL</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">기간</span>
              <select
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">검색</span>
              <span className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="사용자 이메일 또는 설명 검색..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </span>
            </label>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            기간 필터는 API 연결 전까지 UI 상태만 보관합니다.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              <h3 className="text-base font-black text-slate-950">보안 이벤트 목록</h3>
            </div>
            <span className="text-sm font-semibold text-slate-500">{filteredLogs.length}건</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">created_at</th>
                  <th className="px-4 py-3">event_type</th>
                  <th className="px-4 py-3">event_result</th>
                  <th className="px-4 py-3">사용자 이메일</th>
                  <th className="px-4 py-3">IP 주소</th>
                  <th className="px-4 py-3">대상 리소스 타입</th>
                  <th className="px-4 py-3">설명</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={`${log.id}-${log.eventType}-${log.createdAt}`} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 font-semibold text-slate-500">{log.createdAt}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{eventTypeLabels[log.eventType]}</td>
                    <td className="px-4 py-4">
                      <Badge tone={resultTone[log.eventResult]}>{log.eventResult}</Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{log.userEmail}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{log.ipAddress}</td>
                    <td className="px-4 py-4">
                      <Badge>{log.resourceType}</Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold leading-6 text-slate-600">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
