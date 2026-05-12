"use client";

import { Bot, Send, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
import { askIncidentChatbot, type ChatbotIncidentContext } from "@/features/chat/api";
import { mockIncidents } from "@/features/incidents/mock";
import { incidentTypeLabels, type Incident } from "@/features/incidents/types";
import { cn } from "@/lib/utils";

type ChatbotMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

const exampleQuestions = [
  "현재 사고 상태 요약해줘",
  "위험도 판단 근거 알려줘",
  "관제자가 해야 할 조치 알려줘",
  "보고서 초안으로 정리해줘",
];

function formatNow() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function getBackendIncidentId(incident: Incident) {
  const numericId = Number(incident.id.replace(/\D/g, ""));
  return Number.isFinite(numericId) && numericId > 0 ? numericId : 1;
}

function createIncidentContext(incident: Incident): ChatbotIncidentContext {
  return {
    incident_type: incident.eventType,
    risk_level: incident.riskLevel,
    location: incident.location,
    stopped_seconds: incident.stoppedDurationSec,
    incident_code: incident.code,
    status: incident.status,
    confidence: incident.confidence,
    traffic_volume: incident.its.trafficVolume,
    nearest_patrol_eta: incident.its.nearestPatrolEta,
  };
}

export default function ChatbotPage() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(mockIncidents[0].id);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    {
      id: "bot-initial",
      role: "assistant",
      content: "사고를 선택하면 AI가 탐지 근거와 조치 필요 사항을 설명합니다.",
      createdAt: formatNow(),
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  const selectedIncident = useMemo(() => {
    return mockIncidents.find((incident) => incident.id === selectedIncidentId) ?? mockIncidents[0];
  }, [selectedIncidentId]);

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
      const response = await askIncidentChatbot(
        getBackendIncidentId(selectedIncident),
        trimmedQuestion,
        createIncidentContext(selectedIncident)
      );

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
      <AppLayout title="사고 대응 챗봇">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">사고 대응 챗봇</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            사고 상태, 위험도, 탐지 근거, 조치 사항을 관리자 검토용으로 질의합니다.
          </p>
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-black text-slate-950">사고 선택</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">분석할 사고 이벤트를 선택하세요.</p>
            </div>
            <div className="max-h-[720px] overflow-y-auto p-3">
              {mockIncidents.map((incident) => {
                const active = incident.id === selectedIncident.id;

                return (
                  <button
                    key={incident.id}
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
                LLM은 최종 판단자가 아니며, 관리자 검토를 돕는 보조 문구만 생성합니다.
              </div>
            </header>

            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => submitQuestion(question)}
                    disabled={isAsking}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                        <b className={cn("text-sm", isUser ? "text-white" : "text-slate-950")}>{isUser ? "김관제" : "사고 대응 AI"}</b>
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
                  placeholder="사고 대응 관련 질문만 입력하세요."
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
