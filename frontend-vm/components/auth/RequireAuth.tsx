/**
 * 파일 역할: 인증 영역에서 사용하는 RequireAuth UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReactNode } from "react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { usePathname, useRouter } from "next/navigation";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getMe } from "@/features/auth/api";
// 코드 설명: @/lib/apiClient 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { isApiError } from "@/lib/apiClient";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  clearStoredAuth,
  getStoredAccessToken,
  getUserFromAuthResponse,
  setStoredAuthUser,
} from "@/lib/authStorage";

// 코드 설명: RequireAuth 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function RequireAuth({ children }: { children: ReactNode }) {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: pathname 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const pathname = usePathname();
  // 코드 설명: [isCheckingAuth, setIsCheckingAuth] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: isMounted 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let isMounted = true;

    // 코드 설명: verifySession 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function verifySession() {
      // 코드 설명: accessToken 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const accessToken = getStoredAccessToken();

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !accessToken
      if (!accessToken) {
        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.replace("/login");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const response = await getMe(accessToken);
        // 코드 설명: user 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const user = getUserFromAuthResponse(response);

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !user
        if (!user) {
          // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("사용자 정보를 확인할 수 없습니다.")
          throw new Error("사용자 정보를 확인할 수 없습니다.");
        }

        // 코드 설명: setStoredAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setStoredAuthUser(user);

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user.is_email_verified === false
        if (user.is_email_verified === false) {
          // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
          router.replace(
            `/verify-email${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`
          );
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user.account_status?.toUpperCase() === "PENDING" && pathname !== "/mypa…
        if (
          user.account_status?.toUpperCase() === "PENDING" &&
          pathname !== "/mypage"
        ) {
          // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
          router.replace("/pending-approval");
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isMounted
        if (isMounted) {
          // 코드 설명: setIsCheckingAuth 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setIsCheckingAuth(false);
        }
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isApiError(error) && error.statusCode === 403
        if (isApiError(error) && error.statusCode === 403) {
          // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
          router.replace("/forbidden");
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
        clearStoredAuth();
        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.replace("/login");
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: verifySession();
    verifySession();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { isMounted = false; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: isMounted = false;
      isMounted = false;
    };
  }, [pathname, router]);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isCheckingAuth
  if (isCheckingAuth) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <p className="text-sm font-semibold text-slate-500">
          로그인 상태를 확인하는 중입니다.
        </p>
      </main>
    );
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: <>{children}</>
  return <>{children}</>;
}
