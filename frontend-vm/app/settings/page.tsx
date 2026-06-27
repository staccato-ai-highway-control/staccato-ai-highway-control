/**
 * 파일 역할: 설정 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import {
  Activity,
  Cctv,
  Cpu,
  Database,
  FileUp,
  Radio,
  Server,
} from "lucide-react";
// 코드 설명: @/components/auth/RequireSuperAdmin 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/Badge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Badge } from "@/components/common/Badge";
// 코드 설명: @/components/common/Card 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Card } from "@/components/common/Card";

// 코드 설명: environmentItems 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const environmentItems = [
  {
    title: "시스템 상태",
    description: "서비스 가용성과 배포 상태는 운영 서버 모니터링 및 배포 환경에서 확인합니다.",
    icon: Activity,
  },
  {
    title: "Flask API 서버",
    description: "API 주소, 실행 환경과 접근 정책은 서버 환경변수 및 배포 설정으로 관리합니다.",
    icon: Server,
  },
  {
    title: "AI VM",
    description: "AI 분석 서버 연결 정보와 실행 구성은 내부 인프라 설정에서 관리합니다.",
    icon: Cpu,
  },
  {
    title: "DB 연결",
    description: "데이터베이스 접속 정보와 자격 증명은 운영 서버의 보안 환경변수로 관리합니다.",
    icon: Database,
  },
  {
    title: "실시간 이벤트",
    description: "실시간 이벤트 연결 주소와 통신 정책은 서버 및 배포 환경에서 제어합니다.",
    icon: Radio,
  },
  {
    title: "CCTV 스트림",
    description: "스트림 원본 주소, 프록시와 접근 정책은 운영 인프라 설정을 따릅니다.",
    icon: Cctv,
  },
  {
    title: "파일 업로드 정책",
    description: "허용 형식, 용량 제한과 저장 경로는 백엔드 및 스토리지 정책으로 관리합니다.",
    icon: FileUp,
  },
];

// 코드 설명: SettingsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function SettingsPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireSuperAdmin title="운영 환경 정보">
      <AppLayout title="운영 환경 정보">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Operation Environment</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">운영 환경 정보</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">시스템 연결 구성과 운영 정책의 관리 방식을 확인합니다.</p>
          </div>
          <Badge tone="blue">환경변수 기반 관리</Badge>
        </section>

        <Card className="mb-5 overflow-hidden">
          <div className="border-l-4 border-sky-500 bg-gradient-to-r from-sky-50 to-white px-6 py-5">
            <h3 className="text-base font-black text-slate-950">운영 설정 관리 안내</h3>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
              시스템 설정은 서버 환경변수 및 배포 설정으로 관리됩니다.<br />
              현재 MVP에서는 관리자 화면에서 직접 수정하지 않고 운영 서버 설정을 통해 제어합니다.
            </p>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {environmentItems.map((item) => {
            // 코드 설명: Icon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const Icon = item.icon;

            // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
            return (
              <Card key={item.title} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="mt-5 text-right text-xs font-semibold text-slate-400">향후 고도화: 설정 저장 API 연동 예정</p>
      </AppLayout>
    </RequireSuperAdmin>
  );
}
