export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
};

export type UserRole =
  | "SUPER_ADMIN"
  | "AUTH_ADMIN"
  | "CONTROL_ADMIN"
  | "MAINTAINER"
  | "PENDING_STAFF";

export type SignupRequest = {
  name: string;
  email: string;
  employeeNo: string;
  department: string;
  phone: string;
  requestedRole: string;
  reason: string;
  agreed: boolean;
};
