"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/common/Card";
import { createBugReport } from "@/features/bug-reports/api";
import type { BugReportCreateRequest } from "@/features/bug-reports/types";

export function BugReportForm() {
  const router = useRouter();
  const [form, setForm] = useState<BugReportCreateRequest>({
    title: "",
    description: "",
    category: "GENERAL",
    severity: "MINOR",
    priority: "MEDIUM",
    app_version: "MVP",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(key: keyof BugReportCreateRequest, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.title.trim()) {
      setErrorMessage("제목을 입력해 주세요.");
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage("내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createBugReport({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      });
      const nextId = "id" in response ? response.id : undefined;
      router.push(nextId ? `/bug-reports/${nextId}` : "/bug-reports");
    } catch {
      setErrorMessage("버그리포트 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-sm font-black text-slate-950">STACCATO</p>
          <h1 className="mt-3 text-3xl font-black">버그리포트 등록</h1>
        </header>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            {errorMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessage}</p> : null}

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              제목
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              내용
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} className="min-h-36 rounded-lg border border-slate-200 p-3" />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                카테고리
                <input value={form.category ?? ""} onChange={(event) => updateField("category", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                심각도
                <select value={form.severity ?? "MINOR"} onChange={(event) => updateField("severity", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                  <option value="MINOR">MINOR</option>
                  <option value="MAJOR">MAJOR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                우선순위
                <select value={form.priority ?? "MEDIUM"} onChange={(event) => updateField("priority", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              페이지 URL
              <input value={form.page_url ?? ""} onChange={(event) => updateField("page_url", event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
            </label>

            <button type="submit" disabled={submitting} className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
              {submitting ? "등록 중" : "등록"}
            </button>
          </form>
        </Card>
      </section>
    </main>
  );
}
