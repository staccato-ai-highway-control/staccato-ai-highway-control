import { AlertTriangle, Bot, CalendarClock, Database, Layers, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import {
  mockLlmModelMetadata,
  mockLlmTrainingDatasets,
  mockLlmTrainingSummary,
} from "@/features/llm/mock";
import type { LlmTrainingDatasetStatus, LlmTrainingPurpose } from "@/features/llm/types";

const purposeLabels: Record<LlmTrainingPurpose, string> = {
  REPORT: "보고서",
  CHATBOT: "챗봇",
  RISK_SUMMARY: "위험도 요약",
  ALERT: "알림",
};

const statusLabels: Record<LlmTrainingDatasetStatus, string> = {
  READY: "준비 완료",
  BUILDING: "생성중",
  VALIDATING: "검증중",
  ARCHIVED: "보관",
  FAILED: "실패",
};

const statusTone: Record<LlmTrainingDatasetStatus, "green" | "blue" | "amber" | "slate" | "red"> = {
  READY: "green",
  BUILDING: "blue",
  VALIDATING: "amber",
  ARCHIVED: "slate",
  FAILED: "red",
};

const summaryCards = [
  {
    label: "총 샘플 수",
    value: mockLlmTrainingSummary.totalSampleCount.toLocaleString(),
    icon: Database,
    bg: "bg-teal-50",
    tone: "text-teal-700",
  },
  {
    label: "최근 생성일",
    value: mockLlmTrainingSummary.latestCreatedAt,
    icon: CalendarClock,
    bg: "bg-sky-50",
    tone: "text-sky-700",
  },
  {
    label: "학습 버전",
    value: mockLlmTrainingSummary.trainingVersion,
    icon: Layers,
    bg: "bg-amber-50",
    tone: "text-amber-700",
  },
  {
    label: "모델 상태",
    value: mockLlmTrainingSummary.modelStatus,
    icon: ShieldCheck,
    bg: "bg-emerald-50",
    tone: "text-emerald-700",
  },
];

export default function LlmTrainingDataPage() {
  return (
    <RequireAuth>
      <AppLayout title="LLM 학습데이터">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">LLM 학습데이터</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              관리자/개발자용 학습데이터 메타데이터와 데이터셋 버전을 확인합니다.
            </p>
          </div>
          <Badge tone="amber">metadata only</Badge>
        </section>

        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              LLM은 최종 판단자가 아니라 관리자 검토용 초안 생성 보조 모듈입니다. 이 화면은 원본 학습 파일이 아닌 mock 메타데이터만 표시합니다.
            </p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card key={card.label} className="p-5">
                <span className={`grid h-11 w-11 place-items-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.tone}`} />
                </span>
                <strong className="mt-5 block break-words text-2xl font-black text-slate-950">{card.value}</strong>
                <p className="mt-1 text-sm font-semibold text-slate-500">{card.label}</p>
              </Card>
            );
          })}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-black text-slate-950">데이터셋 목록</h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">dataset_name</th>
                    <th className="px-4 py-3">purpose</th>
                    <th className="px-4 py-3">sample_count</th>
                    <th className="px-4 py-3">version</th>
                    <th className="px-4 py-3">status</th>
                    <th className="px-4 py-3">created_at</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLlmTrainingDatasets.map((dataset) => (
                    <tr key={dataset.id} className="border-t border-slate-100">
                      <td className="px-4 py-4 font-black text-slate-950">{dataset.datasetName}</td>
                      <td className="px-4 py-4">
                        <Badge tone="blue">{purposeLabels[dataset.purpose]}</Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{dataset.sampleCount.toLocaleString()}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{dataset.version}</td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone[dataset.status]}>{statusLabels[dataset.status]}</Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-500">{dataset.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-teal-700" />
              <h3 className="text-base font-black text-slate-950">모델 정보</h3>
            </div>
            <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">LLM_PROVIDER</span>
                <b className="text-slate-950">{mockLlmModelMetadata.provider}</b>
              </p>
              <p className="grid gap-1">
                <span className="font-semibold text-slate-500">LLM_MODEL_NAME</span>
                <b className="break-words text-slate-950">{mockLlmModelMetadata.modelName}</b>
              </p>
              <p className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">prompt_version</span>
                <b className="text-slate-950">{mockLlmModelMetadata.promptVersion}</b>
              </p>
              <p className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">fallback 사용 여부</span>
                <Badge tone={mockLlmModelMetadata.fallbackEnabled ? "green" : "slate"}>
                  {mockLlmModelMetadata.fallbackEnabled ? "사용" : "미사용"}
                </Badge>
              </p>
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-500">
              실제 학습 raw 데이터, 모델 파일, API Key는 프론트에서 읽거나 업로드하지 않습니다. 추후 Flask Server의 관리자 API로 메타데이터만 조회합니다.
            </div>
          </Card>
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
