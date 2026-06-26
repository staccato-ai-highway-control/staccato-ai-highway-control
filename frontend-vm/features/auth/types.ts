export type UserRole =
  | "SUPER_ADMIN"
  | "AUTH_ADMIN"
  | "CONTROL_ADMIN"
  | "MAINTAINER"
  | "DISPATCH_ADMIN"
  | "VIEWER";

export type UserAccountStatus = "PENDING" | "ACTIVE" | "REJECTED" | "DELETED";
export type SignupRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED";

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

export type SendEmailVerificationRequest = {
  email: string;
};

export type VerifyEmailRequest = {
  email: string;
  code?: string;
  token?: string;
};

export type LoginRequest = {
  login_id: string;
  password: string;
};

export type ProfileUpdateRequest = {
  name?: string;
  phone?: string | null;
  email?: string;
};

export type PasswordUpdateRequest = {
  current_password: string;
  new_password: string;
};

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

export interface GoogleIdentityStartResponse {
  message: string;
  data: {
    provider: "GOOGLE";
    email: string;
    authorization_url: string;
    expires_at: string;
  };
}

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

export type LoginResponse = AuthResponse;
