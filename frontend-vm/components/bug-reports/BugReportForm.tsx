"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/common/Card";
import { createBugReport } from "@/features/bug-reports/api";
import type { BugReportCreatePayload } from "@/features/bug-reports/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export function BugReportForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const title = getString(formData, "title");
    const description = getString(formData, "description");

    if (!title) {
      setErrorMessage("설명을 입력해 주세요.");
      setIsSubmitting(false);
      return;
    }

    if (!description) {
      setErrorMessage("내용을 입력해 주세요.");
      setIsSubmitting(false);
      return;
    }

    const payload: BugReportCreatePayload = {
      title,
      description,
      category: "GENERAL",
      severity: "MINOR",
      priority: "MEDIUM",
      app_version: "MVP",
    };

    try {
      await createBugReport(payload);
      router.replace("/bug-reports");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문의를 등록하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/bug-reports" className="text-sm font-bold text-slate-500 no-underline hover:text-slate-900">목록으로</Link>
            <h1 className="mt-3 text-3xl font-black">문의 등록하기</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">문의 설명과 내용을 남겨주시면 확인 후 반영하겠습니다.</p>
          </div>
        </header>

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              설명
              <input name="title" className="h-11 rounded-lg border border-slate-200 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              내용
              <textarea name="description" className="min-h-48 rounded-lg border border-slate-200 p-3" />
            </label>

            {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isSubmitting} className="inline-flex h-11 items-center justify-center rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-staccato-dark disabled:opacity-50">{isSubmitting ? "등록 중" : "등록"}</button>
              <Link href="/bug-reports" className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50">취소</Link>
            </div>
          </form>
        </Card>
      </section>
    </main>
  );
}
