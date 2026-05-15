"use client";

import { FormEvent, useState } from "react";
import { changeMyPassword, deleteMyAccount } from "@/features/auth/api";
import { clearStoredAuth } from "@/lib/authStorage";

export function SecurityCard({ onLogout }: { onLogout: () => void }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!currentPassword || !newPassword) {
      setErrorMessage("현재 비밀번호와 새 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await changeMyPassword({ current_password: currentPassword, new_password: newPassword });
      setMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setIsChangingPassword(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("계정을 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteMyAccount();
      clearStoredAuth();
      window.location.replace("/login");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "계정 탈퇴에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

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
