import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";

const logs = [
  ["2026-04-29 09:20:10", "김관리", "LOGIN_SUCCESS", "내부망"],
  ["2026-04-29 09:18:44", "이순찰", "INCIDENT_STATUS_UPDATE", "STP-20260429-001"],
  ["2026-04-29 09:12:01", "system", "TOKEN_REFRESH", "정상"],
];

export default function SecurityLogsPage() {
  return (
    <AppLayout title="보안 로그">
      <Card className="overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="p-4">시각</th>
              <th>사용자</th>
              <th>이벤트</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.join("-")} className="border-t border-slate-100">
                {log.map((cell, index) => (
                  <td key={`${cell}-${index}`} className={index === 0 ? "p-4" : ""}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppLayout>
  );
}
