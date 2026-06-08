import { Settings } from "lucide-react";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";

export default function SettingsPage() {
  return (
    <RequireSuperAdmin title="시스템 설정">
      <AppLayout title="시스템 설정">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">시스템 설정</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">실제 설정 조회·수정 API가 연결되면 운영 환경 설정을 확인할 수 있습니다.</p>
          </div>
          <Badge tone="amber">API 미연결</Badge>
        </section>
        <Card className="p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-700"><Settings className="h-6 w-6" aria-hidden="true" /></span>
          <h3 className="mt-5 text-lg font-black text-slate-950">시스템 설정 API가 아직 연결되지 않았습니다.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">운영 상태와 설정값으로 오인될 수 있는 예시 데이터는 표시하지 않습니다. 조회 및 저장 기능은 관리자 API 연결 후 활성화됩니다.</p>
          <button type="button" disabled className="mt-5 h-10 rounded-lg bg-slate-300 px-5 text-sm font-black text-white disabled:cursor-not-allowed">설정 저장 사용 불가</button>
        </Card>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
