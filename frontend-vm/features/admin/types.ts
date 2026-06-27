/**
 * 파일 역할: 관리자 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
import type { UserAccountStatus, UserRole, SignupRequestStatus } from "@/features/auth/types";

// 코드 설명: AdminUser 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type AdminUser = {
  id?: string | number;
  login_id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  department?: string;
  account_status?: UserAccountStatus | string;
  is_email_verified?: boolean;
  created_at?: string;
};

// 코드 설명: 다른 모듈이 이 기능을 재사용할 수 있도록 공개 API로 다시 내보냅니다.
export type { SignupRequestStatus };

// 코드 설명: SignupRequestApiItem 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SignupRequestApiItem = {
  id: number;
  request_status: SignupRequestStatus;
  requested_role: UserRole;
  request_memo?: string | null;
  created_at?: string | null;
  user?: {
    name?: string;
    email?: string;
    phone?: string | null;
  } | null;
};
