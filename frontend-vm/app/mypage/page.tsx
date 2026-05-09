"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import type { AuthUser } from "@/features/auth/types";
import {
  clearStoredAuth,
  getStoredAuthUser,
  setStoredAuthUser,
} from "@/lib/authStorage";

function getRoleLabel(role?: string) {
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "최고관리자",
    AUTH_ADMIN: "회원관리자",
    CONTROL_ADMIN: "관제관리자",
    DISPATCH_ADMIN: "출동관리자",
    MAINTENANCE_ADMIN: "시설관리자",
    MAINTAINER: "유지보수 담당자",
    VIEWER: "조회 사용자",
  };

  return role ? roleLabels[role] ?? role : "-";
}

export default function MyPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = getStoredAuthUser();
    setAuthUser(storedUser);
    setName(storedUser?.name ?? "");
    setPhone(storedUser?.phone ?? "");
  }, []);

  function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser) {
      setMessage("저장된 사용자 정보를 찾을 수 없습니다.");
      return;
    }

    const updatedUser: AuthUser = {
      ...authUser,
      name: name.trim() || authUser.name,
      phone: phone.trim() || null,
    };

    setStoredAuthUser(updatedUser);
    setAuthUser(updatedUser);
    setMessage("내 정보가 수정되었습니다.");
  }

  function handleWithdraw() {
    if (withdrawConfirm.trim() !== "탈퇴") {
      setMessage("회원탈퇴를 진행하려면 입력란에 '탈퇴'를 입력해주세요.");
      return;
    }

    if (!window.confirm("회원탈퇴를 진행하시겠습니까?")) {
      return;
    }

    if (authUser) {
      setStoredAuthUser({
        ...authUser,
        account_status: "DELETED",
      });
    }

    clearStoredAuth();
    router.replace("/login");
  }

  return (
    <RequireAuth>
      <AppLayout title="마이페이지">
        <section className="grid gap-5">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-sky-600">
              MY PAGE
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              내 프로필
            </h2>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-xl font-black text-white">
                {(authUser?.name || authUser?.email || "S").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-lg text-slate-950">
                  {authUser?.name ?? "사용자"}
                </strong>
                <span className="block truncate text-sm font-semibold text-slate-500">
                  {authUser?.email ?? "-"}
                </span>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-bold text-slate-500">권한</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">
                  {getRoleLabel(authUser?.role)}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-bold text-slate-500">계정 상태</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">
                  {authUser?.account_status ?? "-"}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-bold text-slate-500">연락처</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">
                  {authUser?.phone ?? "-"}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-bold text-slate-500">이메일 인증</dt>
                <dd className="mt-1 text-sm font-bold text-slate-950">
                  {authUser?.is_email_verified ? "완료" : "미완료"}
                </dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={handleUpdateProfile}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-black text-slate-950">내 정보 수정</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-600">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600">연락처</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="010-1234-5678"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">
                이메일과 권한은 관리자 승인 정보로 관리됩니다.
              </p>
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-400"
              >
                수정 저장
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-red-700">회원탈퇴</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              탈퇴 처리는 계정을 삭제하지 않고 비활성 상태로 전환하는 소프트 탈퇴 기준입니다.
            </p>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={withdrawConfirm}
                onChange={(event) => setWithdrawConfirm(event.target.value)}
                placeholder="탈퇴"
                className="h-11 w-full rounded-lg border border-red-200 px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 md:max-w-xs"
              />
              <button
                type="button"
                onClick={handleWithdraw}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
              >
                회원탈퇴
              </button>
            </div>
          </div>

          {message ? (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
              {message}
            </p>
          ) : null}
        </section>
      </AppLayout>
    </RequireAuth>
  );
}
