"use client";

import { Eye, UserCheck, UserX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { approveSignupRequest, getSignupRequests, rejectSignupRequest } from "@/features/admin/api";
import { getStoredAuthUser } from "@/lib/authStorage";

type SignupRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";

type SignupRequestApiItem = {
  id: number;
  request_status: SignupRequestStatus;
  requested_role: UserRole;
  request_memo?: string | null;
  created_at?: string | null;
  user?: {
    name?: string;
    email?: string;
    phone?: string | null;
  } | null;
};

type SignupRequestsApiResponse = {
  data: SignupRequestApiItem[];
};

type AdminSignupRequest = {
  id: number;
  name: string;
  email: string;
  phone: string;
  requestedRole: UserRole;
  reason: string;
  status: SignupRequestStatus;
  requestedAt: string;
};

const statusLabels: Record<SignupRequestStatus, string> = {
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "거절",
  CANCELLED: "취소",
};

const statusTone: Record<SignupRequestStatus, "amber" | "green" | "red" | "slate"> = {
  REQUESTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "slate",
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "최고 관리자",
  AUTH_ADMIN: "인증 관리자",
  CONTROL_ADMIN: "관제 관리자",
  MAINTAINER: "출동 관리자",
  DISPATCH_ADMIN: "출동 관리자",
  VIEWER: "일반 조회 계정",
};

export default function SignupRequestsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<AdminSignupRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionRequestId, setActionRequestId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;

    return requests.find((request) => request.id === selectedRequestId) ?? null;
  }, [requests, selectedRequestId]);

  async function loadSignupRequests() {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await getSignupRequests("REQUESTED");
      const nextRequests = response.map(mapSignupRequest);

      setRequests(nextRequests);
      setSelectedRequestId((currentId) => {
        if (currentId && nextRequests.some((request) => request.id === currentId)) {
          return currentId;
        }

        return null;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원가입 신청 목록을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function updateRequestStatus(id: number, status: Extract<SignupRequestStatus, "APPROVED" | "REJECTED">) {
    setActionRequestId(id);

    try {
      if (status === "APPROVED") {
        await approveSignupRequest(id);
      } else {
        await rejectSignupRequest(id, "관리자 거절");
      }

      await loadSignupRequests();
    } catch (error) {
      const message = error instanceof Error ? error.message : "신청 상태 변경에 실패했습니다.";
      setErrorMessage(
        message === "Target user not found."
          ? "신청 정보와 연결된 사용자 계정을 찾을 수 없습니다. 운영 DB의 사용자 연결 상태를 확인해 주세요."
          : message
      );
    } finally {
      setActionRequestId(null);
    }
  }

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    if (authUser?.role !== "SUPER_ADMIN") return;
    loadSignupRequests();
  }, [authUser?.role]);

  return (
    <RequireSuperAdmin title="사용자 승인 관리">
      <AppLayout title="사용자 승인 관리">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">사용자 승인 관리</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              회원가입 신청자를 최고관리자가 승인하거나 거절합니다.
            </p>
          </div>
          <Badge tone="blue">SUPER_ADMIN</Badge>
        </section>

        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-800">
          승인 대기 상태는 DB의 REQUESTED 값을 사용하고, 요청 권한은 SUPER_ADMIN / AUTH_ADMIN / CONTROL_ADMIN / MAINTAINER / DISPATCH_ADMIN / VIEWER 체계를 따릅니다.
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section>
          <Card className="overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-[10%] px-3 py-3">신청 ID</th>
                  <th className="w-[18%] px-3 py-3">이름</th>
                  <th className="w-[17%] px-3 py-3">요청 역할</th>
                  <th className="w-[14%] px-3 py-3">상태</th>
                  <th className="w-[16%] px-3 py-3">신청일</th>
                  <th className="w-[240px] px-3 py-3">버튼</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-500">
                      회원가입 신청 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : requests.length > 0 ? (
                  requests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-100">
                      <td className="truncate whitespace-nowrap px-3 py-4 font-black text-slate-950" title={String(request.id)}>{request.id}</td>
                      <td className="truncate whitespace-nowrap px-3 py-4 font-semibold text-slate-700" title={request.name}>{request.name}</td>
                      <td className="truncate whitespace-nowrap px-3 py-4">
                        <Badge tone="blue">{roleLabels[request.requestedRole]}</Badge>
                      </td>
                      <td className="truncate whitespace-nowrap px-3 py-4">
                        <Badge tone={statusTone[request.status]}>{statusLabels[request.status]}</Badge>
                      </td>
                      <td className="truncate whitespace-nowrap px-3 py-4 font-semibold text-slate-500" title={request.requestedAt}>{request.requestedAt}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                          <button type="button" onClick={() => setSelectedRequestId(request.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <Eye className="h-3.5 w-3.5" />
                            상세 보기
                          </button>
                          <Button type="button" disabled={request.status !== "REQUESTED" || actionRequestId === request.id} onClick={() => updateRequestStatus(request.id, "APPROVED")} className="min-h-9 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" />
                            승인
                          </Button>
                          <button type="button" disabled={request.status !== "REQUESTED" || actionRequestId === request.id} onClick={() => updateRequestStatus(request.id, "REJECTED")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                            <UserX className="h-3.5 w-3.5" />
                            거절
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-500">
                      회원가입 신청 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </section>

        {selectedRequest ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-request-detail-title"
          >
            <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="signup-request-detail-title" className="text-lg font-black text-slate-950">
                    신청 상세
                  </h3>
                  <p className="mt-2 text-xs font-black text-slate-400">신청 ID</p>
                  <p className="mt-1 font-black text-slate-950">{selectedRequest.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequestId(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="신청 상세 닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                <p className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">이름</span>
                  <b className="text-slate-950">{selectedRequest.name}</b>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">요청 역할</span>
                  <b className="text-slate-950">{roleLabels[selectedRequest.requestedRole]}</b>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">상태</span>
                  <Badge tone={statusTone[selectedRequest.status]}>{statusLabels[selectedRequest.status]}</Badge>
                </p>
              </div>

              {isVisibleRequestReason(selectedRequest.reason) ? (
                <div className="mt-5">
                  <p className="text-xs font-black text-slate-400">신청 사유</p>
                  <p className="mt-2 rounded-lg border border-slate-100 bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
                    {selectedRequest.reason}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={selectedRequest.status !== "REQUESTED" || actionRequestId === selectedRequest.id}
                  onClick={() => updateRequestStatus(selectedRequest.id, "APPROVED")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  승인
                </Button>
                <button
                  type="button"
                  disabled={selectedRequest.status !== "REQUESTED" || actionRequestId === selectedRequest.id}
                  onClick={() => updateRequestStatus(selectedRequest.id, "REJECTED")}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  거절
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </AppLayout>
    </RequireSuperAdmin>
  );
}

function mapSignupRequest(item: SignupRequestApiItem): AdminSignupRequest {
  return {
    id: item.id,
    name: item.user?.name ?? "-",
    email: item.user?.email ?? "-",
    phone: item.user?.phone ?? "-",
    requestedRole: item.requested_role,
    reason: item.request_memo ?? "-",
    status: item.request_status,
    requestedAt: formatDate(item.created_at),
  };
}

function isVisibleRequestReason(reason: string) {
  return reason !== "-" && !reason.toLowerCase().includes("pytest");
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
