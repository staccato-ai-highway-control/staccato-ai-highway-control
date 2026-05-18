"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  History,
  MapPin,
  MessageSquare,
  Play,
  Save,
  UserPlus,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { getStoredAuthUser } from "@/lib/authStorage";
import { mockIncidents } from "@/features/incidents/mock";
import {
  incidentStatusLabels,
  incidentTypeLabels,
  type Incident,
  type RiskLevel,
} from "@/features/incidents/types";
import type { AuthUser, UserRole } from "@/features/auth/types";

function getRiskTone(riskLevel: RiskLevel) {
  if (riskLevel === "CRITICAL") return "red";
  if (riskLevel === "HIGH") return "amber";
  if (riskLevel === "MEDIUM") return "blue";
  return "green";
}

function isMaintainerRole(role: UserRole | null | undefined) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function canViewIncident(incident: Incident | undefined, user: AuthUser | null) {
  if (!incident) return false;
  if (user?.role === "SUPER_ADMIN" || user?.role === "CONTROL_ADMIN") {
    return Boolean(incident.assignee && incident.assignee !== "미배정");
  }

  const assignee = incident.assignee?.trim();
  if (!assignee || assignee === "미배정") return false;

  const candidates = [user?.name, user?.login_id, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return candidates.includes(assignee);
}

function handleMockAction(action: string, incidentCode: string) {
  window.alert(`${incidentCode} ${action} 기능은 API 확정 후 연결 예정입니다.`);
}

export default function DispatchIncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  const incident = useMemo(() => {
    return mockIncidents.find((item) => item.id === params.id);
  }, [params.id]);

  const isAllowed = canViewIncident(incident, authUser);
  const role = authUser?.role;
  const isMaintainer = isMaintainerRole(role);
  const canManageAssignment = role === "SUPER_ADMIN" || role === "CONTROL_ADMIN";
  const canChangeStatus = role === "SUPER_ADMIN";
  const canWriteControlMemo = role === "CONTROL_ADMIN";
  const canMessageMaintainer = role === "CONTROL_ADMIN";
  const canSubmitDispatchResult = isMaintainer;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("현장 조치 보고와 출동 결과가 저장되었습니다. API 연결 후 서버에 반영됩니다.");
  }

  return (
    <RequireAuth>
      <AppLayout title="출동 사건 상세">
        <section className="mb-5">
          <Link
            href="/dispatch/incidents"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            출동 관리
          </Link>
        </section>

        {!incident || !isAllowed ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-slate-950">확인 가능한 출동 사건이 아닙니다.</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              출동관리자는 내게 배정된 사건만, 관리자는 담당자가 배정된 출동 사건만 조회할 수 있습니다.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-5">
              <Card className="overflow-hidden">
                <img
                  src={incident.snapshotUrl}
                  alt={incident.title}
                  className="h-72 w-full object-cover"
                />
                <div className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-400">{incident.code}</p>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">{incident.title}</h2>
                      <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-slate-500">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                        {incident.location}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RiskLevelBadge level={incident.riskLevel} />
                      <IncidentStatusBadge status={incident.status} />
                      {isMaintainer ? <Badge tone="amber">내 출동</Badge> : <Badge tone="slate">관리 조회</Badge>}
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs font-black text-slate-400">사고 유형</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-800">{incidentTypeLabels[incident.eventType]}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs font-black text-slate-400">담당자</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-800">{incident.assignee}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs font-black text-slate-400">탐지 시각</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-800">{incident.detectedAt}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs font-black text-slate-400">출동 ETA</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-800">{incident.its.nearestPatrolEta}</dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/dispatch/map" className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 no-underline transition hover:bg-amber-50">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      위치 확인
                    </Link>
                    {canManageAssignment ? (
                      <button type="button" onClick={() => handleMockAction("출동 담당자 배정", incident.code)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        담당자 배정
                      </button>
                    ) : null}
                    {canChangeStatus ? (
                      <button type="button" onClick={() => handleMockAction("출동 상태 변경", incident.code)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        상태 변경
                      </button>
                    ) : null}
                    {role === "SUPER_ADMIN" ? (
                      <button type="button" onClick={() => handleMockAction("처리 이력 확인", incident.code)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                        <History className="h-4 w-4" aria-hidden="true" />
                        처리 이력
                      </button>
                    ) : null}
                    {canMessageMaintainer ? (
                      <button type="button" onClick={() => handleMockAction("출동관리자 메시지", incident.code)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-sky-200 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                        <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        출동관리자 메시지
                      </button>
                    ) : null}
                    {canSubmitDispatchResult ? (
                      <>
                        <button type="button" onClick={() => handleMockAction("출동 시작", incident.code)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700">
                          <Play className="h-4 w-4" aria-hidden="true" />
                          출동 시작
                        </button>
                        <button type="button" onClick={() => handleMockAction("관제자 메시지", incident.code)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                          <MessageSquare className="h-4 w-4" aria-hidden="true" />
                          관제자 메시지
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>

              {canSubmitDispatchResult ? (
                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-amber-600" aria-hidden="true" />
                    <h3 className="text-lg font-black text-slate-950">현장 조치 보고 및 출동 결과 작성</h3>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      현장 도착 시각
                      <input
                        type="datetime-local"
                        className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-amber-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      현장 조치 내용
                      <textarea
                        rows={5}
                        placeholder="예: 정차 차량 운전자 안전 확인, 후방 안전 조치 완료"
                        className="resize-none rounded-lg border border-slate-200 p-3 outline-none focus:border-amber-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      출동 결과
                      <select className="h-11 rounded-lg border border-slate-200 px-3 outline-none focus:border-amber-500">
                        <option value="RESOLVED">현장 처리 완료</option>
                        <option value="TRANSFERRED">타 기관 인계</option>
                        <option value="FALSE_POSITIVE">오탐 확인</option>
                        <option value="NEED_FOLLOW_UP">추가 조치 필요</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      결과 메모
                      <textarea
                        rows={4}
                        placeholder="출동 결과, 특이사항, 후속 조치 필요 여부를 입력합니다."
                        className="resize-none rounded-lg border border-slate-200 p-3 outline-none focus:border-amber-500"
                      />
                    </label>

                    {statusMessage ? (
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                        {statusMessage}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-black text-white transition hover:bg-amber-700"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      조치 및 결과 저장
                    </button>
                  </form>
                </Card>
              ) : null}

              {canWriteControlMemo ? (
                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <Save className="h-5 w-5 text-sky-600" aria-hidden="true" />
                    <h3 className="text-lg font-black text-slate-950">관제자 메모 작성</h3>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="출동관리자에게 전달할 관제 메모를 입력합니다."
                    className="mt-4 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-sky-400"
                  />
                  <button type="button" onClick={() => handleMockAction("관제자 메모 저장", incident.code)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-bold text-white transition hover:bg-sky-800">
                    <Save className="h-4 w-4" aria-hidden="true" />
                    메모 저장
                  </button>
                </Card>
              ) : null}
            </div>

            <aside className="grid content-start gap-5">
              <Card className="p-5">
                <h3 className="font-black text-slate-950">출동 요약</h3>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black text-slate-400">현재 상태</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{incidentStatusLabels[incident.status]}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black text-slate-400">위험도</p>
                    <p className="mt-1">
                      <Badge tone={getRiskTone(incident.riskLevel)}>{incident.riskLevel}</Badge>
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black text-slate-400">ITS 정보</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {incident.its.weather} / {incident.its.trafficVolume}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-black text-slate-950">관제 메모</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {incident.memo ?? "등록된 관제 메모가 없습니다."}
                </p>
              </Card>
            </aside>
          </div>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
