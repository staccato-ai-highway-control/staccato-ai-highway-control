/**
 * 파일 역할: 자료실 / new 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
import { ResourceForm } from "@/components/resources/ResourceForm";

// 코드 설명: NewResourcePage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function NewResourcePage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return <ResourceForm />;
}
