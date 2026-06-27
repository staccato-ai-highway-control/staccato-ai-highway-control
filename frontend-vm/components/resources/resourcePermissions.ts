/**
 * 파일 역할: 자료실 영역에서 사용하는 resourcePermissions UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/features/resources/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ResourceItem } from "@/features/resources/types";

// 코드 설명: isResourceAdmin 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isResourceAdmin(user: AuthUser | null) {
  // 코드 설명: status 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const status = user?.account_status?.toUpperCase();
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Boolean(user?.id && user.role && user.role !== "VIEWER" && !["PENDING",…
  return Boolean(user?.id && user.role && user.role !== "VIEWER" && !["PENDING", "REJECTED", "DELETED"].includes(status ?? ""));
}

// 코드 설명: isResourceOwner 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function isResourceOwner(resource: ResourceItem, user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: isResourceAdmin(user) && String(resource.author_id) === String(user?.id)
  return isResourceAdmin(user) && String(resource.author_id) === String(user?.id);
}
