import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { LlmReportEditor } from "@/components/llm/LlmReportEditor";
import { LlmReportViewer } from "@/components/llm/LlmReportViewer";
import { ReportVerifyButton } from "@/components/llm/ReportVerifyButton";
import { getLlmReport } from "@/features/llm/api";

export default async function LlmReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getLlmReport(id);
  return (
    <RequireAuth>
      <AppLayout title="LLM 보고서">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <h2 className="mb-3 font-black">보고서 초안 보기</h2>
          <LlmReportViewer draft={report.draft} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-black">수정</h2>
          <LlmReportEditor draft={report.draft} />
          <div className="mt-4 flex gap-2">
            <button className="h-10 rounded-lg bg-slate-900 px-4 font-bold text-white">저장</button>
            <ReportVerifyButton reportId={report.id} />
          </div>
        </Card>
      </div>
      </AppLayout>
    </RequireAuth>
  );
}
