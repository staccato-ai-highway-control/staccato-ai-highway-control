"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import {
  approveSignupRequest,
  getAdminUsers,
  getSignupRequests,
  rejectSignupRequest,
} from "@/features/admin/api";
import type { AdminUser, SignupRequestApiItem } from "@/features/admin/types";
import type { UserRole } from "@/features/auth/types";
import { downloadResourceFile, getSecurityLogResources } from "@/features/resources/api";
import type { ResourceItem } from "@/features/resources/types";

// ─── 공통 상수 ────────────────────────────────────────────────────────────────

type TabId = "users" | "signup" | "logs";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "users",  label: "사용자 목록",  desc: "가입된 전체 사용자를 조회합니다." },
  { id: "signup", label: "가입 승인",    desc: "회원가입 신청을 승인하거나 거절합니다." },
  { id: "logs",   label: "보안 로그",    desc: "접속 로그와 자동 점검 리포트를 확인합니다." },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    "최고 관리자",
  AUTH_ADMIN:     "인증 관리자",
  CONTROL_ADMIN:  "관제 관리자",
  MAINTAINER:     "출동 관리자",
  DISPATCH_ADMIN: "출동 관리자",
  VIEWER:         "일반 조회",
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  ACTIVE:   "활성",
  PENDING:  "승인 대기",
  REJECTED: "거절됨",
  DELETED:  "삭제됨",
};

const SIGNUP_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "승인 대기",
  APPROVED:  "승인 완료",
  REJECTED:  "거절",
  CANCELLED: "취소",
};

function accountStatusTone(s?: string): "green" | "amber" | "red" | "slate" {
  if (s === "ACTIVE")   return "green";
  if (s === "PENDING")  return "amber";
  if (s === "REJECTED" || s === "DELETED") return "red";
  return "slate";
}

function signupStatusTone(s: string): "amber" | "green" | "red" | "slate" {
  if (s === "REQUESTED") return "amber";
  if (s === "APPROVED")  return "green";
  if (s === "REJECTED")  return "red";
  return "slate";
}

function roleTone(_: string): "blue" | "slate" { return "blue"; }

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ─── 공통 UI ─────────────────────────────────────────────────────────────────

function SearchInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Pagination({ page, total, onPrev, onNext }: {
  page: number; total: number; onPrev: () => void; onNext: () => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <button type="button" disabled={page <= 1} onClick={onPrev}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
        이전
      </button>
      <span className="text-xs font-bold text-slate-500">{page} / {total}</span>
      <button type="button" disabled={page >= total} onClick={onNext}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
        다음
      </button>
    </div>
  );
}

function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr><td colSpan={cols} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">{children}</td></tr>
  );
}

// ─── 탭 1: 사용자 목록 ───────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ["SUPER_ADMIN", "AUTH_ADMIN", "CONTROL_ADMIN", "MAINTAINER", "DISPATCH_ADMIN", "VIEWER"];
const ALL_STATUSES = ["ACTIVE", "PENDING", "REJECTED", "DELETED"];

function UsersTab() {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [keyword, setKeyword]   = useState("");
  const [roleFilter, setRole]   = useState("");
  const [statusFilter, setStat] = useState("");
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setUsers(await getAdminUsers()); setPage(1); }
    catch (e) { setUsers([]); setError(e instanceof Error ? e.message : "사용자 목록을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.account_status !== statusFilter) return false;
      if (kw) {
        const haystack = `${u.name ?? ""} ${u.email ?? ""} ${u.department ?? ""} ${u.login_id ?? ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [users, keyword, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible    = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} placeholder="이름, 이메일, 부서 검색" />
        <select value={roleFilter} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
          <option value="">전체 역할</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStat(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
          <option value="">전체 상태</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{ACCOUNT_STATUS_LABELS[s]}</option>)}
        </select>
        <button type="button" onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> 새로고침
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-bold text-slate-500">{filtered.length}명</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700">
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}개씩</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">부서</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">이메일 인증</th>
                <th className="px-4 py-3">가입일</th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow cols={7}><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" /></EmptyRow>}
              {!loading && visible.length === 0 && <EmptyRow cols={7}>조건에 맞는 사용자가 없습니다.</EmptyRow>}
              {!loading && visible.map((u, i) => (
                <tr key={`${u.id ?? u.email ?? i}`} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 font-bold text-slate-950">{u.name ?? u.login_id ?? "-"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{u.email ?? "-"}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={roleTone(u.role ?? "")}>{ROLE_LABELS[u.role ?? ""] ?? u.role ?? "-"}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{u.department ?? "-"}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={accountStatusTone(u.account_status)}>
                      {ACCOUNT_STATUS_LABELS[u.account_status ?? ""] ?? u.account_status ?? "-"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    {u.is_email_verified
                      ? <span className="text-xs font-bold text-emerald-600">인증 완료</span>
                      : <span className="text-xs font-bold text-slate-400">미인증</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
      </Card>
    </div>
  );
}

// ─── 탭 2: 가입 승인 ─────────────────────────────────────────────────────────

type SignupStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";

type SignupItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  requestedRole: UserRole;
  reason: string;
  status: SignupStatus;
  requestedAt: string;
};

function mapSignup(item: SignupRequestApiItem): SignupItem {
  return {
    id:            item.id,
    name:          item.user?.name ?? "-",
    email:         item.user?.email ?? "-",
    phone:         item.user?.phone ?? "-",
    requestedRole: item.requested_role,
    reason:        item.request_memo ?? "-",
    status:        item.request_status as SignupStatus,
    requestedAt:   formatDate(item.created_at),
  };
}

function SignupTab() {
  const [items, setItems]         = useState<SignupItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [statusFilter, setStat]   = useState<"REQUESTED" | "ALL">("REQUESTED");
  const [keyword, setKeyword]     = useState("");
  const [page, setPage]           = useState(1);
  const [selectedId, setSelected] = useState<number | null>(null);
  const [actionId, setActionId]   = useState<number | null>(null);

  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await getSignupRequests(statusFilter);
      setItems(data.map(mapSignup));
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((it) =>
      `${it.name} ${it.email}`.toLowerCase().includes(kw)
    );
  }, [items, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  async function handleAction(id: number, action: "APPROVED" | "REJECTED") {
    setActionId(id);
    try {
      if (action === "APPROVED") await approveSignupRequest(id);
      else await rejectSignupRequest(id, "관리자 거절");
      await load();
      if (selectedId === id) setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setActionId(null);
    }
  }

  const pendingCount = items.filter((i) => i.status === "REQUESTED").length;

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} placeholder="이름, 이메일 검색" />
        {/* 상태 칩 */}
        <div className="flex gap-1.5">
          {(["REQUESTED", "ALL"] as const).map((s) => (
            <button key={s} type="button"
              onClick={() => { setStat(s); setPage(1); }}
              className={`h-10 rounded-lg px-4 text-sm font-bold transition ${statusFilter === s ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {s === "REQUESTED" ? `승인 대기 ${pendingCount > 0 ? `(${pendingCount})` : ""}` : "전체"}
            </button>
          ))}
        </div>
        <button type="button" onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="ml-auto text-sm font-bold text-slate-500">{filtered.length}건</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">요청 역할</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">신청일</th>
                <th className="px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow cols={6}><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" /></EmptyRow>}
              {!loading && visible.length === 0 && (
                <EmptyRow cols={6}>{keyword ? "검색 결과가 없습니다." : "신청 내역이 없습니다."}</EmptyRow>
              )}
              {!loading && visible.map((it) => (
                <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 font-bold text-slate-950">{it.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{it.email}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone="blue">{ROLE_LABELS[it.requestedRole] ?? it.requestedRole}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={signupStatusTone(it.status)}>{SIGNUP_STATUS_LABELS[it.status] ?? it.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">{it.requestedAt}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setSelected(it.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5" /> 상세
                      </button>
                      {it.status === "REQUESTED" && (
                        <>
                          <button type="button" disabled={actionId === it.id}
                            onClick={() => handleAction(it.id, "APPROVED")}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                            <UserCheck className="h-3.5 w-3.5" /> 승인
                          </button>
                          <button type="button" disabled={actionId === it.id}
                            onClick={() => handleAction(it.id, "REJECTED")}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                            <UserX className="h-3.5 w-3.5" /> 거절
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
      </Card>

      {/* 상세 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">가입 신청 상세</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">신청 #{selectedItem.id}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50">
              {[
                { label: "이름",     value: selectedItem.name },
                { label: "이메일",   value: selectedItem.email },
                { label: "연락처",   value: selectedItem.phone },
                { label: "요청 역할", value: ROLE_LABELS[selectedItem.requestedRole] ?? selectedItem.requestedRole },
                { label: "신청일",   value: selectedItem.requestedAt },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-xs font-bold text-slate-400">{label}</span>
                  <span className="text-sm font-bold text-slate-800">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-xs font-bold text-slate-400">상태</span>
                <Badge tone={signupStatusTone(selectedItem.status)}>
                  {SIGNUP_STATUS_LABELS[selectedItem.status]}
                </Badge>
              </div>
            </div>

            {selectedItem.reason !== "-" && !selectedItem.reason.toLowerCase().includes("pytest") && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-bold text-slate-400">신청 사유</p>
                <p className="rounded-lg border border-slate-100 bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
                  {selectedItem.reason}
                </p>
              </div>
            )}

            {selectedItem.status === "REQUESTED" && (
              <div className="mt-5 flex gap-2">
                <Button type="button" disabled={actionId === selectedItem.id}
                  onClick={() => handleAction(selectedItem.id, "APPROVED")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  승인
                </Button>
                <button type="button" disabled={actionId === selectedItem.id}
                  onClick={() => handleAction(selectedItem.id, "REJECTED")}
                  className="flex-1 inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                  거절
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 탭 3: 보안 로그 ─────────────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs]         = useState<ResourceItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [keyword, setKeyword]   = useState("");
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedLogId, setExpandedLogId] = useState<ResourceItem["id"] | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await getSecurityLogResources({ page: 1, size: 1000 });
      setLogs(res.items ?? []);
      setPage(1);
    } catch (e) {
      setLogs([]);
      setError(e instanceof Error ? e.message : "보안 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return logs;
    return logs.filter((l) =>
      `${l.title ?? ""} ${l.file_name ?? ""} ${l.author_name ?? ""}`.toLowerCase().includes(kw)
    );
  }, [logs, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible    = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleDownload(log: ResourceItem) {
    if (!log.file_name) return;
    await downloadResourceFile(log.id, log.file_name);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} placeholder="제목, 파일명, 작성자 검색" />
        <button type="button" onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> 새로고침
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-bold text-slate-500">{filtered.length}건</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700">
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}개씩</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중입니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">제목</th>
                    <th className="px-4 py-3">카테고리</th>
                    <th className="px-4 py-3">작성자</th>
                    <th className="px-4 py-3">생성일</th>
                    <th className="px-4 py-3">첨부파일</th>
                    <th className="px-4 py-3 text-right">다운로드</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <EmptyRow cols={6}>{keyword ? "검색 결과가 없습니다." : "표시할 보안 로그가 없습니다."}</EmptyRow>
                  )}
                  {visible.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <Fragment key={log.id}>
                        <tr className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="max-w-[320px] px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLogId((current) =>
                                  current === log.id ? null : log.id
                                )
                              }
                              aria-expanded={isExpanded}
                              aria-controls={`admin-security-log-detail-${log.id}`}
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <span className="truncate font-bold text-slate-950 underline-offset-4 hover:text-sky-700 hover:underline">
                                {log.title}
                              </span>
                              <span className="shrink-0 text-xs font-bold text-sky-700">
                                {isExpanded ? "접기" : "상세 보기"}
                              </span>
                            </button>

                            {log.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">{log.description}</p>
                            )}
                          </td>
                      <td className="px-4 py-3.5">
                        <Badge tone="amber">{log.category_label ?? "접속 로그"}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{log.author_name ?? "-"}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">{formatDateTime(log.created_at)}</td>
                      <td className="max-w-[200px] px-4 py-3.5">
                        {log.file_name ? (
                          <>
                            <p className="truncate text-xs font-bold text-slate-700">{log.file_name}</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-400">{formatFileSize(log.file_size)}</p>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">첨부 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {log.file_name ? (
                          <button type="button" onClick={() => handleDownload(log)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-50">
                            <Download className="h-3.5 w-3.5" /> 다운로드
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </td>
                        </tr>

                        {isExpanded && (
                          <tr
                            id={`admin-security-log-detail-${log.id}`}
                            className="border-t border-slate-100 bg-sky-50/50"
                          >
                            <td colSpan={6} className="px-4 py-4">
                              <div className="rounded-xl border border-sky-100 bg-white px-4 py-3">
                                <p className="text-xs font-black text-sky-700">상세 내용</p>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
                                  {log.description?.trim() || "등록된 상세 내용이 없습니다."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </>
        )}
      </Card>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <RequireSuperAdmin title="사용자 관리">
      <AppLayout title="사용자 관리">
        {/* 페이지 헤더 */}
        <section className="mb-6 flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">User Management</p>
          <h2 className="text-2xl font-black text-slate-950">사용자 관리</h2>
          <p className="text-sm font-semibold text-slate-500">{currentTab.desc}</p>
        </section>

        {/* 탭 네비게이션 */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === "users"  && <UsersTab />}
        {activeTab === "signup" && <SignupTab />}
        {activeTab === "logs"   && <LogsTab />}
      </AppLayout>
    </RequireSuperAdmin>
  );
}
