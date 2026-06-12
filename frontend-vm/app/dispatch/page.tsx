/**
 * 파일 역할: 출동 관리 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import { redirect } from "next/navigation";

// 코드 설명: RemovedMvpPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function RemovedMvpPage() {
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: redirect("/dashboard");
  redirect("/dashboard");
}
