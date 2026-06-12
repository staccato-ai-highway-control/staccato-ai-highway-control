/**
 * 파일 역할: 마이페이지 영역에서 사용하는 SecurityCard UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useState } from "react";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { changeMyPassword, deleteMyAccount } from "@/features/auth/api";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { clearStoredAuth } from "@/lib/authStorage";

// 코드 설명: SecurityCard 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function SecurityCard({ onLogout }: { onLogout: () => void }) {
  // 코드 설명: [isChangingPassword, setIsChangingPassword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  // 코드 설명: [currentPassword, setCurrentPassword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [currentPassword, setCurrentPassword] = useState("");
  // 코드 설명: [newPassword, setNewPassword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [newPassword, setNewPassword] = useState("");
  // 코드 설명: [message, setMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [message, setMessage] = useState("");
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [isSubmitting, setIsSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 코드 설명: [isDeleting, setIsDeleting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isDeleting, setIsDeleting] = useState(false);

  // 코드 설명: handlePasswordSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setMessage("");
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !currentPassword || !newPassword
    if (!currentPassword || !newPassword) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("현재 비밀번호와 새 비밀번호를 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(true);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await changeMyPassword({ current_password: currentPassword, new_passwor…
      await changeMyPassword({ current_password: currentPassword, new_password: newPassword });
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("비밀번호가 변경되었습니다.");
      // 코드 설명: setCurrentPassword 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setCurrentPassword("");
      // 코드 설명: setNewPassword 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setNewPassword("");
      // 코드 설명: setIsChangingPassword 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsChangingPassword(false);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
    }
  }

  // 코드 설명: handleDeleteAccount 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDeleteAccount() {
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsDeleting(true);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteMyAccount();
      await deleteMyAccount();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
      clearStoredAuth();
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.location.replace("/login");
      window.location.replace("/login");
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "계정 탈퇴에 실패했습니다.");
    } finally {
      // 코드 설명: setIsDeleting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsDeleting(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">보안</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        비밀번호 변경과 로그아웃은 계정 보안을 위해 이 영역에서 관리합니다.
      </p>

      {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}

      {isChangingPassword ? (
        <form onSubmit={handlePasswordSubmit} className="mt-5 grid gap-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="현재 비밀번호"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-sky-500"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="새 비밀번호"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-sky-500"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60">
              {isSubmitting ? "변경 중" : "저장"}
            </button>
            <button type="button" onClick={() => setIsChangingPassword(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              취소
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsChangingPassword((current) => !current)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          비밀번호 변경
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          로그아웃
        </button>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {isDeleting ? "탈퇴 중" : "계정 탈퇴"}
        </button>
      </div>
    </section>
  );
}
