"use client";

import { Bot, Send, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { askChatbot, askIncidentChatbot, type ChatbotIncidentContext } from "@/features/chatbot/api";
import { mockIncidents } from "@/features/incidents/mock";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { getStoredAuthUser } from "@/lib/authStorage";
import { cn } from "@/lib/utils";

type ChatbotMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

type ChatbotRole = Extract<UserRole, "SUPER_ADMIN" | "CONTROL_ADMIN" | "MAINTAINER">;

type RoleChatbotConfig = {
  pageTitle: string;
  description: string;
  contextTitle: string;
  contextDescription: string;
  safetyNotice: string;
  inputPlaceholder: string;
  assistantName: string;
  initialMessage: string;
  exampleQuestions: string[];
};

const roleChatbotConfigs: Record<ChatbotRole, RoleChatbotConfig> = {
  SUPER_ADMIN: {
    pageTitle: "운영 관리 챗봇",
    description: "전체 사고, 시스템 운영, 사용자 승인, 보안 로그와 통계를 관리자 관점에서 질의합니다.",
    contextTitle: "전체 사고 컨텍스트",
    contextDescription: "운영 현황에 포함할 대표 사고를 선택하세요.",
    safetyNotice: "LLM은 최종 판단자가 아니며, 최고관리자의 운영 검토를 돕는 보조 문구만 생성합니다.",
    inputPlaceholder: "전체 사고, 시스템 운영, 사용자/보안 현황을 질문하세요.",
    assistantName: "운영 관리 AI",
    initialMessage: "전체 사고 요약, 시스템 운영, 가입 승인, 사용자/보안 통계를 질문할 수 있습니다.",
    exampleQuestions: [
      "오늘 전체 사고 현황 요약해줘",
      "가입 승인 대기 현황 알려줘",
      "사용자 상태 변경 이슈 요약해줘",
      "보안 로그에서 확인할 위험 신호 알려줘",
      "사고 통계를 운영 보고용으로 정리해줘",
    ],
  },
  CONTROL_ADMIN: {
    pageTitle: "사고 대응 챗봇",
    description: "사고 위험도, AI 탐지 근거, LLM 보고서와 관제 대응 조치를 질의합니다.",
    contextTitle: "사고 선택",
    contextDescription: "분석할 사고 이벤트를 선택하세요.",
    safetyNotice: "LLM은 최종 판단자가 아니며, 관제관리자의 사고 대응 검토를 돕는 보조 문구만 생성합니다.",
    inputPlaceholder: "사고 위험도, 탐지 근거, 보고서 관련 질문을 입력하세요.",
    assistantName: "사고 대응 AI",
    initialMessage: "사고를 선택하면 AI가 탐지 근거와 조치 필요 사항을 설명합니다.",
    exampleQuestions: [
      "이 사고 위험도가 왜 HIGH야?",
      "보고서 초안 만들어줘",
      "오탐 여부 판단 근거 알려줘",
      "AI 탐지 근거를 관제 메모로 정리해줘",
      "관제자가 해야 할 조치 알려줘",
    ],
  },
  MAINTAINER: {
    pageTitle: "출동 지원 챗봇",
    description: "내 배정 사고의 위치, 처리 상태, 현장 확인 사항을 출동 관점에서 질의합니다.",
    contextTitle: "내 배정 사고",
    contextDescription: "출동 지원을 받을 배정 사고를 선택하세요.",
    safetyNotice: "LLM은 최종 판단자가 아니며, 출동관리자의 현장 확인을 돕는 보조 문구만 생성합니다.",
    inputPlaceholder: "내 배정 사고의 위치, 상태, 확인 사항을 질문하세요.",
    assistantName: "출동 지원 AI",
    initialMessage: "내 배정 사고를 선택하면 출동 위치, 사고 요약, 처리 전 확인 사항을 안내합니다.",
    exampleQuestions: [
      "내 배정 사고 요약해줘",
      "출동 위치 알려줘",
      "처리 완료 전 확인할 사항 알려줘",
      "현장 도착 후 먼저 확인할 내용 알려줘",
      "관제자에게 보고할 처리 상태 정리해줘",
    ],
  },
};

function formatNow() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function isMaintainerRole(role: UserRole | null | undefined) {
  return role === "MAINTAINER" || role === "DISPATCH_ADMIN";
}

function getChatbotRole(role: UserRole | null | undefined): ChatbotRole {
  if (role === "SUPER_ADMIN" || role === "CONTROL_ADMIN") return role;
  if (isMaintainerRole(role)) return "MAINTAINER";
  return "CONTROL_ADMIN";
}

function getDisplayName(user: AuthUser | null) {
  return user?.name ?? user?.login_id ?? "사용자";
}

function isAssignedToMaintainer(incident: Incident, user: AuthUser | null) {
  const userNames = [user?.name, user?.login_id, user?.email].filter(Boolean);
  return userNames.some((name) => incident.assignee === name);
}

function getRoleIncidents(role: ChatbotRole, user: AuthUser | null) {
  if (role === "MAINTAINER") {
    const assignedIncidents = mockIncidents.filter((incident) => isAssignedToMaintainer(incident, user));

    return assignedIncidents.length > 0
      ? assignedIncidents
      : mockIncidents.filter((incident) => incident.status === "ASSIGNED" || incident.status === "RESOLVED");
  }

  if (role === "CONTROL_ADMIN") {
    return mockIncidents.filter((incident) => incident.status !== "CLOSED");
  }

  return mockIncidents;
}

function getBackendIncidentId(incident: Incident) {
  const numericId = Number(incident.id.replace(/\D/g, ""));
  return Number.isFinite(numericId) && numericId > 0 ? numericId : 1;
}

function createIncidentContext(incident: Incident, role: ChatbotRole, user: AuthUser | null): ChatbotIncidentContext {
  const commonContext = {
    incident_type: incident.eventType,
    risk_level: incident.riskLevel,
    location: incident.location,
    stopped_seconds: incident.stoppedDurationSec,
    incident_code: incident.code,
    status: incident.status,
    confidence: incident.confidence,
    traffic_volume: incident.its.trafficVolume,
    nearest_patrol_eta: incident.its.nearestPatrolEta,
    role,
  };

  if (role === "SUPER_ADMIN") {
    return {
      ...commonContext,
      scope: "전체 운영 현황",
      total_incident_count: mockIncidents.length,
      active_incident_count: mockIncidents.filter((item) => item.status !== "CLOSED" && item.status !== "RESOLVED" && item.status !== "FALSE_POSITIVE").length,
      pending_signup_count: 3,
      security_event_count: 2,
      system_status: "API/DB/AI 연계 정상",
    };
  }

  if (role === "MAINTAINER") {
    return {
      ...commonContext,
      scope: "내 배정 사고",
      assignee: incident.assignee,
      requester: getDisplayName(user),
      dispatch_focus: ["출동 위치", "현장 안전 확인", "처리 상태 보고", "완료 전 점검"],
    };
  }

  return {
    ...commonContext,
    scope: "관제 사고 대응",
    control_focus: ["위험도 판단", "AI 탐지 근거", "오탐 검토", "LLM 보고서 초안"],
    report_available: true,
  };
}

export default function ChatbotPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(mockIncidents[0].id);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const role = getChatbotRole(authUser?.role);
  const roleConfig = roleChatbotConfigs[role];
  const roleIncidents = useMemo(() => getRoleIncidents(role, authUser), [authUser, role]);

  const selectedIncident = useMemo(() => {
    return roleIncidents.find((incident) => incident.id === selectedIncidentId) ?? roleIncidents[0] ?? mockIncidents[0];
  }, [roleIncidents, selectedIncidentId]);

  useEffect(() => {
    setAuthUser(getStoredAuthUser());
  }, []);

  useEffect(() => {
    if (!roleIncidents.some((incident) => incident.id === selectedIncidentId)) {
      setSelectedIncidentId(roleIncidents[0]?.id ?? mockIncidents[0].id);
    }
  }, [roleIncidents, selectedIncidentId]);

  useEffect(() => {
    setMessages([
      {
        id: `bot-initial-${role}`,
        role: "assistant",
        content: roleConfig.initialMessage,
        createdAt: formatNow(),
      },
    ]);
  }, [role, roleConfig.initialMessage]);

  async function submitQuestion(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) return;

    const now = formatNow();
    const userMessage: ChatbotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion,
      createdAt: now,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsAsking(true);

    try {
      const backendIncidentId = getBackendIncidentId(selectedIncident);
      const response = role === "SUPER_ADMIN"
        ? await askChatbot(trimmedQuestion, createIncidentContext(selectedIncident, role, authUser))
        : await askIncidentChatbot(backendIncidentId, trimmedQuestion, createIncidentContext(selectedIncident, role, authUser));

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.data.answer,
          createdAt: formatNow(),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `챗봇 답변 요청에 실패했습니다. ${message}`,
          createdAt: formatNow(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(draft);
  }

  return (
    <RequireAuth>
      <AppLayout title={roleConfig.pageTitle}>
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">{roleConfig.pageTitle}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">{roleConfig.description}</p>
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-black text-slate-950">{roleConfig.contextTitle}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">{roleConfig.contextDescription}</p>
            </div>
            <div className="max-h-[720px] overflow-y-auto p-3">
              {roleIncidents.map((incident) => {
                const active = incident.id === selectedIncident.id;

                return (
                  <button
                    key={`${role}-${incident.id}`}
                    type="button"
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={cn(
                      "mb-2 w-full rounded-lg border p-4 text-left transition last:mb-0 hover:bg-slate-50",
                      active ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"
                    )}
                  >
                    <p className="text-xs font-black text-slate-400">{incident.code}</p>
                    <b className="mt-1 block text-sm text-slate-950">{incident.title}</b>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{incidentTypeLabels[incident.eventType]}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <RiskLevelBadge level={incident.riskLevel} />
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="flex min-h-[760px] flex-col overflow-hidden">
            <header className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400">{selectedIncident.code}</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{selectedIncident.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{selectedIncident.location}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <RiskLevelBadge level={selectedIncident.riskLevel} />
                  <IncidentStatusBadge status={selectedIncident.status} />
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                {roleConfig.safetyNotice}
              </div>
            </header>

            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                {roleConfig.exampleQuestions.map((question) => (
                  <button
                    key={`${role}-${question}`}
                    type="button"
                    onClick={() => submitQuestion(question)}
                    disabled={isAsking}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <Sparkles className="h-4 w-4 text-sky-500" aria-hidden="true" />
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5">
              <div className="grid gap-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <article
                      key={message.id}
                      className={cn(
                        "max-w-[84%] whitespace-pre-line rounded-xl border p-4",
                        isUser
                          ? "ml-auto border-teal-100 bg-teal-700 text-white"
                          : "mr-auto border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      <div className={cn("mb-2 flex items-center gap-2", isUser ? "justify-end" : "justify-start")}>
                        {!isUser ? <Bot className="h-4 w-4 text-sky-500" aria-hidden="true" /> : null}
                        <b className={cn("text-sm", isUser ? "text-white" : "text-slate-950")}>{isUser ? getDisplayName(authUser) : roleConfig.assistantName}</b>
                        <time className={cn("text-xs font-semibold", isUser ? "text-teal-100" : "text-slate-400")}>{message.createdAt}</time>
                      </div>
                      <p className="text-sm font-semibold leading-6">{message.content}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={roleConfig.inputPlaceholder}
                  disabled={isAsking}
                  className="h-12 min-w-0 flex-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-teal-600"
                />
                <button type="submit" disabled={isAsking} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {isAsking ? "요청중" : "질문"}
                </button>
              </div>
            </form>
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
