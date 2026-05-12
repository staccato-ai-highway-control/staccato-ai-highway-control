export type SignupRequest = {
  login_id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  requestedRole: string;
  reason?: string;
  agreed: boolean;
};

export type SignupApiRequest = {
  login_id: string;
  email: string;
  password: string;
  name: string;
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
