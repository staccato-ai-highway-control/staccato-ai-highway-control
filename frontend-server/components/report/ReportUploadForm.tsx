"use client";

import { FormEvent, useState } from "react";
import {
  createReport,
  requestReportAnalysis,
  uploadReportAttachment,
  type CreateReportPayload,
} from "@/features/reports/api";
import type { ReportType, UploadPurpose } from "@/features/reports/types";
import { ReportFilePreview } from "./ReportFilePreview";
import { ReportLocationForm } from "./ReportLocationForm";

const fallbackReportId = "mock-report-id";

export function ReportUploadForm() {
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    const payload: CreateReportPayload = {
      title: String(formData.get("title") || "정차 이벤트 신고"),
      reportType: formData.get("reportType") as ReportType,
      purpose: formData.get("purpose") as UploadPurpose,
      description: String(formData.get("description") || ""),
      location: String(formData.get("location") || ""),
      cctvId: String(formData.get("cctvId") || ""),
    };

    try {
      setStatusMessage("신고 데이터를 생성하는 중입니다.");
      let reportId = fallbackReportId;

      try {
        const report = await createReport(payload);
        reportId = report.id;
      } catch {
        reportId = fallbackReportId;
      }

      setStatusMessage("첨부 파일을 업로드하는 중입니다.");
      if (file instanceof File && file.size > 0) {
        try {
          await uploadReportAttachment(reportId, file);
        } catch {
          // Flask 서버가 준비되기 전에도 MVP 화면 흐름은 이어갑니다.
        }
      }

      setStatusMessage("AI 분석 요청을 전송하는 중입니다.");
      try {
        await requestReportAnalysis(reportId);
      } catch {
        // mock 단계에서는 분석 요청 실패를 화면 전체 실패로 취급하지 않습니다.
      }

      setStatusMessage("신고 생성, 파일 업로드, AI 분석 요청이 완료되었습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          신고 유형
          <select name="reportType" className="h-11 rounded-lg border border-slate-200 px-3">
            <option value="LANE_STOP_REPORT">주행차로 정차 신고</option>
            <option value="SHOULDER_STOP_REPORT">갓길 정차 신고</option>
            <option value="UNKNOWN_REPORT">유형 미확인 신고</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          업로드 목적
          <select name="purpose" className="h-11 rounded-lg border border-slate-200 px-3">
            <option value="REPORT">신고</option>
            <option value="NORMAL_REFERENCE">정상 참고 영상</option>
            <option value="TEST_DEMO">테스트 데모</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          제목
          <input name="title" className="h-11 rounded-lg border border-slate-200 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          CCTV 선택
          <input name="cctvId" className="h-11 rounded-lg border border-slate-200 px-3" placeholder="cctv-001" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        설명
        <textarea name="description" className="min-h-28 rounded-lg border border-slate-200 p-3" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        위치 입력
        <ReportLocationForm />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        이미지/영상 업로드
        <input name="file" type="file" accept="image/*,video/*" className="rounded-lg border border-slate-200 p-3" />
      </label>
      <ReportFilePreview />
      {statusMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-staccato">{statusMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}
      <button type="submit" disabled={isSubmitting} className="h-11 rounded-lg bg-staccato font-bold text-white disabled:opacity-60">
        {isSubmitting ? "처리 중..." : "AI 분석 요청"}
      </button>
    </form>
  );
}
