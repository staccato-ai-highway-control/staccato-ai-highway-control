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

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    user?: unknown;
  };
  access_token?: string;
  accessToken?: string;
  token?: string;
  user?: unknown;
};

export type LoginResponse = AuthResponse;