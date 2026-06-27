/**
 * 파일 역할: 관리자 / signup-requests 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Eye, UserCheck, UserX, X } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useState } from "react";
// 코드 설명: @/components/auth/RequireSuperAdmin 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Button 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Button } from "@/components/common/Button";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser, UserRole } from "@/features/auth/types";
// 코드 설명: @/features/admin/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { approveSignupRequest, getSignupRequests, rejectSignupRequest } from "@/features/admin/api";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: SignupRequestStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type SignupRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";

// 코드 설명: SignupRequestApiItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: SignupRequestsApiResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type SignupRequestsApiResponse = {
  data: SignupRequestApiItem[];
};

// 코드 설명: AdminSignupRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: statusLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusLabels: Record<SignupRequestStatus, string> = {
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "거절",
  CANCELLED: "취소",
};

// 코드 설명: statusTone 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusTone: Record<SignupRequestStatus, "amber" | "green" | "red" | "slate"> = {
  REQUESTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "slate",
};

// 코드 설명: roleLabels 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "최고 관리자",
  AUTH_ADMIN: "인증 관리자",
  CONTROL_ADMIN: "관제 관리자",
  MAINTAINER: "출동 관리자",
  DISPATCH_ADMIN: "출동 관리자",
  VIEWER: "일반 조회 계정",
};

// 코드 설명: SignupRequestsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function SignupRequestsPage() {
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [requests, setRequests] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [requests, setRequests] = useState<AdminSignupRequest[]>([]);
  // 코드 설명: [selectedRequestId, setSelectedRequestId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  // 코드 설명: [isLoading, setIsLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isLoading, setIsLoading] = useState(true);
  // 코드 설명: [actionRequestId, setActionRequestId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [actionRequestId, setActionRequestId] = useState<number | null>(null);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");

  // 코드 설명: selectedRequest 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedRequest = useMemo(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !selectedRequestId
    if (!selectedRequestId) return null;

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: requests.find((request) => request.id === selectedRequestId) ?? null
    return requests.find((request) => request.id === selectedRequestId) ?? null;
  }, [requests, selectedRequestId]);

  // 코드 설명: loadSignupRequests 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadSignupRequests() {
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsLoading(true);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getSignupRequests("REQUESTED");
      // 코드 설명: nextRequests 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextRequests = response.map(mapSignupRequest);

      // 코드 설명: setRequests 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setRequests(nextRequests);
      // 코드 설명: setSelectedRequestId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSelectedRequestId((currentId) => {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: currentId && nextRequests.some((request) => request.id === currentId)
        if (currentId && nextRequests.some((request) => request.id === currentId)) {
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: currentId
          return currentId;
        }

        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: null
        return null;
      });
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원가입 신청 목록을 불러오지 못했습니다."
      );
    } finally {
      // 코드 설명: setIsLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsLoading(false);
    }
  }

  // 코드 설명: updateRequestStatus 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function updateRequestStatus(id: number, status: Extract<SignupRequestStatus, "APPROVED" | "REJECTED">) {
    // 코드 설명: setActionRequestId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setActionRequestId(id);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: status === "APPROVED"
      if (status === "APPROVED") {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await approveSignupRequest(id);
        await approveSignupRequest(id);
      } else {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await rejectSignupRequest(id, "관리자 거절");
        await rejectSignupRequest(id, "관리자 거절");
      }

      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadSignupRequests();
      await loadSignupRequests();
    } catch (error) {
      // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const message = error instanceof Error ? error.message : "신청 상태 변경에 실패했습니다.";
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(
        message === "Target user not found."
          ? "신청 정보와 연결된 사용자 계정을 찾을 수 없습니다. 운영 DB의 사용자 연결 상태를 확인해 주세요."
          : message
      );
    } finally {
      // 코드 설명: setActionRequestId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setActionRequestId(null);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: authUser?.role !== "SUPER_ADMIN"
    if (authUser?.role !== "SUPER_ADMIN") return;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadSignupRequests();
    loadSignupRequests();
  }, [authUser?.role]);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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

// 코드 설명: mapSignupRequest 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function mapSignupRequest(item: SignupRequestApiItem): AdminSignupRequest {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { id: item.id, name: item.user?.name ?? "-", email: item.user?.email ??…
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

// 코드 설명: isVisibleRequestReason 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isVisibleRequestReason(reason: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: reason !== "-" && !reason.toLowerCase().includes("pytest")
  return reason !== "-" && !reason.toLowerCase().includes("pytest");
}

// 코드 설명: formatDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDate(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";

  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: value
    return value;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", d…
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
