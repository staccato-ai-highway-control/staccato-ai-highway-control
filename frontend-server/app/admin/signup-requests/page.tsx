"use client";

import { Eye, UserCheck, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";

type SignupRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type AdminSignupRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  requestedRole: "SUPER_ADMIN" | "CONTROL_ADMIN" | "MAINTAINER" | "VIEWER";
  reason: string;
  status: SignupRequestStatus;
  requestedAt: string;
};

const initialSignupRequests: AdminSignupRequest[] = [
  {
    id: "REQ-20260429-001",
    name: "정대응",
    email: "jung.response@its.go.kr",
    phone: "010-2311-9042",
    requestedRole: "CONTROL_ADMIN",
    reason: "3팀 관제 업무 배정으로 사고 대응 관리 권한이 필요합니다.",
    status: "PENDING",
    requestedAt: "2026-04-29 09:12:30",
  },
  {
    id: "REQ-20260429-002",
    name: "최점검",
    email: "choi.maint@its.go.kr",
    phone: "010-8842-2044",
    requestedRole: "MAINTAINER",
    reason: "CCTV 장비 점검 담당자로 지도 관제와 CCTV 상태 확인이 필요합니다.",
    status: "PENDING",
    requestedAt: "2026-04-29 10:05:12",
  },
  {
    id: "REQ-20260428-007",
    name: "박관제",
    email: "park.control@its.go.kr",
    phone: "010-5512-7788",
    requestedRole: "CONTROL_ADMIN",
    reason: "야간 관제 근무 투입 예정입니다.",
    status: "APPROVED",
    requestedAt: "2026-04-28 17:24:41",
  },
  {
    id: "REQ-20260428-005",
    name: "이외부",
    email: "lee.partner@example.com",
    phone: "010-9012-3456",
    requestedRole: "VIEWER",
    reason: "외부 협력사 점검 결과 확인 요청입니다.",
    status: "REJECTED",
    requestedAt: "2026-04-28 11:43:09",
  },
];

const statusLabels: Record<SignupRequestStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "거절",
};

const statusTone: Record<SignupRequestStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

export default function SignupRequestsPage() {
  const [requests, setRequests] = useState(initialSignupRequests);
  const [selectedRequestId, setSelectedRequestId] = useState(initialSignupRequests[0]?.id ?? "");

  const selectedRequest = useMemo(() => {
    return requests.find((request) => request.id === selectedRequestId) ?? requests[0];
  }, [requests, selectedRequestId]);

  function updateRequestStatus(id: string, status: SignupRequestStatus) {
    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request))
    );
    setSelectedRequestId(id);
  }

  return (
    <RequireAuth>
      <AppLayout title="사용자 승인 관리">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">사용자 승인 관리</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              회원가입 신청자를 최고관리자가 승인하거나 거절합니다.
            </p>
          </div>
          <Badge tone="amber">role 기반 접근 제어 TODO</Badge>
        </section>

        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-800">
          로그인 가능 조건은 계정 상태 ACTIVE와 이메일 인증 완료입니다. 승인 API 연결 시 두 조건을 함께 확인하도록 처리합니다.
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">신청 ID</th>
                    <th className="px-4 py-3">이름</th>
                    <th className="px-4 py-3">이메일</th>
                    <th className="px-4 py-3">전화번호</th>
                    <th className="px-4 py-3">요청 역할</th>
                    <th className="px-4 py-3">신청 사유</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3">신청일</th>
                    <th className="px-4 py-3">버튼</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4 font-black text-slate-950">{request.id}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{request.name}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{request.email}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{request.phone}</td>
                      <td className="px-4 py-4">
                        <Badge tone="blue">{request.requestedRole}</Badge>
                      </td>
                      <td className="max-w-[260px] px-4 py-4 font-semibold leading-6 text-slate-600">
                        {request.reason}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone[request.status]}>{statusLabels[request.status]}</Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-500">{request.requestedAt}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(request.id)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            상세 보기
                          </button>
                          <Button
                            type="button"
                            disabled={request.status === "APPROVED"}
                            onClick={() => updateRequestStatus(request.id, "APPROVED")}
                            className="min-h-9 gap-1 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            승인
                          </Button>
                          <button
                            type="button"
                            disabled={request.status === "REJECTED"}
                            onClick={() => updateRequestStatus(request.id, "REJECTED")}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            거절
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-black text-slate-950">신청 상세</h3>
            {selectedRequest ? (
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-xs font-black text-slate-400">신청 ID</p>
                  <p className="mt-1 font-black text-slate-950">{selectedRequest.id}</p>
                </div>
                <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                  <p className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">이름</span>
                    <b className="text-slate-950">{selectedRequest.name}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">이메일</span>
                    <b className="text-right text-slate-950">{selectedRequest.email}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">전화번호</span>
                    <b className="text-slate-950">{selectedRequest.phone}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">요청 역할</span>
                    <b className="text-slate-950">{selectedRequest.requestedRole}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">상태</span>
                    <Badge tone={statusTone[selectedRequest.status]}>{statusLabels[selectedRequest.status]}</Badge>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400">신청 사유</p>
                  <p className="mt-2 rounded-lg border border-slate-100 bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
                    {selectedRequest.reason}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => updateRequestStatus(selectedRequest.id, "APPROVED")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    승인
                  </Button>
                  <button
                    type="button"
                    onClick={() => updateRequestStatus(selectedRequest.id, "REJECTED")}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
                  >
                    거절
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-500">선택된 신청이 없습니다.</p>
            )}
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
