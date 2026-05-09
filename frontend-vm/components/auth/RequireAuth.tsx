"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/features/auth/api";
import {
  clearStoredAuth,
  getStoredAccessToken,
  getUserFromAuthResponse,
  setStoredAuthUser,
} from "@/lib/authStorage";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
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
        setStoredAuthUser(getUserFromAuthResponse(response));

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
  }, [router]);

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
