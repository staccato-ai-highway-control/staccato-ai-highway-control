"use client";

import { FormEvent, useState } from "react";
import {
  uploadReport,
  type UploadReportPayload,
} from "@/features/reports/api";
import type { ReportPriority, ReportType, UploadPurpose } from "@/features/reports/types";
import { ReportFilePreview } from "./ReportFilePreview";
import { ReportLocationForm } from "./ReportLocationForm";

export function ReportUploadForm() {
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (files.length === 0) {
      setErrorMessage("업로드할 이미지 또는 영상 파일을 선택해주세요.");
      setIsSubmitting(false);
      return;
    }

    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setErrorMessage("위도와 경도를 숫자로 입력해주세요.");
      setIsSubmitting(false);
      return;
    }

    const payload: UploadReportPayload = {
      files,
      title: String(formData.get("title") || "정차 이벤트 신고"),
      reportType: formData.get("reportType") as ReportType,
      uploadPurpose: formData.get("purpose") as UploadPurpose,
      description: String(formData.get("description") || ""),
      priority: formData.get("priority") as ReportPriority,
      latitude,
      longitude,
      isDemoData: formData.get("isDemoData") === "on",
    };

    try {
      setStatusMessage("신고 파일을 업로드하고 사고 신고를 생성하는 중입니다.");
      await uploadReport(payload);
      setStatusMessage("신고 영상/이미지 업로드 및 신고 생성이 완료되었습니다.");
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
          우선순위
          <select name="priority" className="h-11 rounded-lg border border-slate-200 px-3">
            <option value="LOW">낮음</option>
            <option value="MEDIUM">보통</option>
            <option value="HIGH">높음</option>
            <option value="URGENT">긴급</option>
          </select>
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          위도
          <input name="latitude" type="number" step="any" defaultValue="37.2636" className="h-11 rounded-lg border border-slate-200 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          경도
          <input name="longitude" type="number" step="any" defaultValue="127.0286" className="h-11 rounded-lg border border-slate-200 px-3" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input name="isDemoData" type="checkbox" className="h-4 w-4" />
        데모 데이터로 업로드
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        이미지/영상 업로드
        <input name="files" type="file" multiple accept="image/*,video/*" className="rounded-lg border border-slate-200 p-3" />
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
