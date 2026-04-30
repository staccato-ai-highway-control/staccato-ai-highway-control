import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReportAnalysisStatus } from "@/components/report/ReportAnalysisStatus";
import { getReports } from "@/features/reports/api";

export default async function ReportsPage() {
  const reports = await getReports();
  return (
    <AppLayout title="신고/영상등록 목록">
      <Link href="/reports/create" className="mb-4 inline-flex rounded-lg bg-staccato px-4 py-2 font-bold text-white no-underline">
        신고/영상 등록
      </Link>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="p-4">제목</th>
              <th>유형</th>
              <th>목적</th>
              <th>분석 상태</th>
              <th>첨부 파일</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t border-slate-100">
                <td className="p-4 font-bold">{report.title}</td>
                <td>{report.reportType}</td>
                <td>{report.purpose}</td>
                <td>
                  <ReportAnalysisStatus status={report.analysisStatus} />
                </td>
                <td>{report.attachmentName}</td>
                <td>
                  <Link href={`/reports/${report.id}`} className="text-staccato">
                    상세
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
