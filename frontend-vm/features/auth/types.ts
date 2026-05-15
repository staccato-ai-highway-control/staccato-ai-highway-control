export type UserRole =
  | "SUPER_ADMIN"
  | "AUTH_ADMIN"
  | "CONTROL_ADMIN"
  | "MAINTAINER"
  | "DISPATCH_ADMIN"
  | "VIEWER";

export type SignupRequest = {
  login_id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  requestedRole: UserRole;
  reason?: string;
  agreed: boolean;
};

export type SignupApiRequest = {
  login_id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  requested_role: UserRole;
  request_memo?: string;
  agreed: boolean;
};

export type SendEmailVerificationRequest = {
  email: string;
};

export type LoginRequest = {
  login_id: string;
  password: string;
};

export type AuthUser = {
  id?: string | number;
  login_id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  requested_role?: UserRole;
  phone?: string | null;
  account_status?: string;
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
