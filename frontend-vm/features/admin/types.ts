import type { UserAccountStatus, UserRole, SignupRequestStatus } from "@/features/auth/types";

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

export type { SignupRequestStatus };

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
