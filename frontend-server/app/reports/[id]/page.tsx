import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ReportAnalysisStatus } from "@/components/report/ReportAnalysisStatus";
import { getReport } from "@/features/reports/api";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  return (
    <AppLayout title="신고 상세">
      <Card className="p-5">
        <h2 className="text-xl font-black">{report.title}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p>
            분석 상태: <ReportAnalysisStatus status={report.analysisStatus} />
          </p>
          <p>첨부 파일: {report.attachmentName}</p>
          <p>위치 정보: {report.location}</p>
          <p>CCTV: {report.cctvId}</p>
        </div>
        <Button className="mt-5">정차 이벤트로 전환</Button>
      </Card>
    </AppLayout>
  );
}
