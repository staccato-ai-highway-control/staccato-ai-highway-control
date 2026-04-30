import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

const requests = [
  { name: "정대응", email: "jung.response@its.go.kr", employeeNo: "ITS-1042", role: "CONTROL_ADMIN", reason: "3팀 관제 업무 배정" },
  { name: "최점검", email: "choi.maint@its.go.kr", employeeNo: "ITS-2044", role: "MAINTAINER", reason: "CCTV 장비 점검 담당" },
];

export default function SignupRequestsPage() {
  return (
    <AppLayout title="가입 승인 관리">
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.email} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <b>{request.name}</b>
              <p className="mt-1 text-sm text-slate-500">
                {request.email} · {request.employeeNo} · {request.role}
              </p>
              <p className="mt-1 text-sm">{request.reason}</p>
            </div>
            <div className="flex gap-2">
              <Button>승인</Button>
              <button className="rounded-lg border border-slate-200 px-4 font-bold">반려</button>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
