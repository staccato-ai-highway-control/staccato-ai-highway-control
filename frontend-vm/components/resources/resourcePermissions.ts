import type { AuthUser } from "@/features/auth/types";
import type { ResourceItem } from "@/features/resources/types";

export function isResourceAdmin(user: AuthUser | null) {
  const status = user?.account_status?.toUpperCase();
  return Boolean(user?.id && user.role && user.role !== "VIEWER" && !["PENDING", "REJECTED", "DELETED"].includes(status ?? ""));
}

export function isResourceOwner(resource: ResourceItem, user: AuthUser | null) {
  return isResourceAdmin(user) && String(resource.author_id) === String(user?.id);
}
