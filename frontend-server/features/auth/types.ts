export type SignupRequest = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  requestedRole: string;
  reason?: string;
  agreed: boolean;
};

export type SignupApiRequest = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  requested_role: string;
  request_memo?: string;
};

export type SendEmailVerificationRequest = {
  email: string;
};

export type VerifyEmailTokenRequest = {
  token: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthUser = {
  id?: string | number;
  email?: string;
  name?: string;
  role?: string;
  phone?: string | null;
  account_status?: string;
  is_email_verified?: boolean;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
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
  user?: AuthUser;
};

export type LoginResponse = AuthResponse;
