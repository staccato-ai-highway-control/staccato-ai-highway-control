/**
 * 파일 역할: 인증 기능에서 공유하는 데이터 모델과 API 계약 타입을 정의합니다.
 * 유지보수 참고: 백엔드 응답, 컴포넌트 props, 폼 상태 사이의 경계를 명확히 하므로 필드 변경 시 관련 사용처를 함께 확인해야 합니다.
 */
export type UserRole =
  | "SUPER_ADMIN"
  | "AUTH_ADMIN"
  | "CONTROL_ADMIN"
  | "MAINTAINER"
  | "DISPATCH_ADMIN"
  | "VIEWER";

// 코드 설명: UserAccountStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type UserAccountStatus = "PENDING" | "ACTIVE" | "REJECTED" | "DELETED";
// 코드 설명: SignupRequestStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SignupRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED";

// 코드 설명: SignupRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SignupRequest = {
  login_id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  requestedRole: UserRole;
  reason?: string;
  agreed: boolean;
  identityMethod?: "EMAIL" | "GOOGLE";
};

// 코드 설명: SignupApiRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SignupApiRequest = {
  login_id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  requested_role: UserRole;
  request_memo?: string;
  agreed?: boolean;
  identity_method?: "EMAIL" | "GOOGLE";
};

// 코드 설명: SendEmailVerificationRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type SendEmailVerificationRequest = {
  email: string;
};

// 코드 설명: VerifyEmailRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type VerifyEmailRequest = {
  email: string;
  code?: string;
  token?: string;
};

// 코드 설명: LoginRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type LoginRequest = {
  login_id: string;
  password: string;
};

// 코드 설명: ProfileUpdateRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ProfileUpdateRequest = {
  name?: string;
  phone?: string | null;
  email?: string;
};

// 코드 설명: PasswordUpdateRequest 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type PasswordUpdateRequest = {
  current_password: string;
  new_password: string;
};

// 코드 설명: AuthUser 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type AuthUser = {
  id?: string | number;
  login_id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  requested_role?: UserRole;
  phone?: string | null;
  account_status?: UserAccountStatus | string;
  is_email_verified?: boolean;
  email_verified_at?: string | null;
};

// 코드 설명: GoogleIdentityStartResponse 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
export interface GoogleIdentityStartResponse {
  // 코드 설명: message 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  message: string;
  // 코드 설명: data 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
  data: {
    provider: "GOOGLE";
    email: string;
    authorization_url: string;
    expires_at: string;
  };
}

// 코드 설명: AuthResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    token_type?: string;
    tokenType?: string;
    user?: AuthUser;
    email_verification?: {
      verification_link?: string;
      token?: string;
      verification_token?: string;
    };
  };
  access_token?: string;
  accessToken?: string;
  token?: string;
  token_type?: string;
  tokenType?: string;
  user?: AuthUser;
};

// 코드 설명: LoginResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type LoginResponse = AuthResponse;
