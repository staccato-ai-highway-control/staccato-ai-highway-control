"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe } from "@/features/auth/api";
import {
  clearStoredAuth,
  getStoredAccessToken,
  getUserFromAuthResponse,
  setStoredAuthUser,
} from "@/lib/authStorage";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      try {
        const response = await getMe(accessToken);
        const user = getUserFromAuthResponse(response);

        if (!user) {
          throw new Error("사용자 정보를 확인할 수 없습니다.");
        }

        setStoredAuthUser(user);

        if (user.is_email_verified === false) {
          router.replace(
            `/verify-email${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`
          );
          return;
        }

        if (
          user.account_status?.toUpperCase() === "PENDING" &&
          pathname !== "/mypage"
        ) {
          router.replace("/pending-approval");
          return;
        }

        if (isMounted) {
          setIsCheckingAuth(false);
        }
      } catch {
        clearStoredAuth();
        router.replace("/login");
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <p className="text-sm font-semibold text-slate-500">
          로그인 상태를 확인하는 중입니다.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
