"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createReportDraft, deleteReportAttachment, deleteReportDraft, getMyReportDrafts, getReportDraft, submitReportDraft, updateReportDraft, uploadReport, uploadReportAttachments, type UploadReportPayload } from "@/features/reports/api";
import type { ReportDraft, ReportDraftPayload, ReportPriority, ReportType, UploadPurpose } from "@/features/reports/types";
import { ReportAttachmentPreview } from "./ReportAttachmentPreview";
import { ReportFilePreview } from "./ReportFilePreview";
import { ReportLocationForm } from "./ReportLocationForm";

function getDraftId(draft: ReportDraft) {
  return draft.draft_id ?? draft.id;
}

function getAttachmentId(attachment: NonNullable<ReportDraft["attachments"]>[number]) {
  return attachment.attachment_id ?? attachment.id;
}

function getAttachmentName(attachment: NonNullable<ReportDraft["attachments"]>[number]) {
  return attachment.original_filename ?? attachment.filename ?? "첨부파일";
}

function formatDraftDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ReportUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentDraft, setCurrentDraft] = useState<ReportDraft | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | number | null>(null);
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [draftPage, setDraftPage] = useState(1);
  const [draftTotalPages, setDraftTotalPages] = useState(1);
  const [showDrafts, setShowDrafts] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [uploadingDraftAttachment, setUploadingDraftAttachment] = useState(false);
  const [deletingDraftAttachmentId, setDeletingDraftAttachmentId] = useState<string | null>(null);
  const [submittingDraft, setSubmittingDraft] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  function handleFileSelectClick() {
    fileInputRef.current?.click();
  }

  function handleRemoveSelectedFile(fileIndex: number) {
    const nextFiles = selectedFiles.filter((_, index) => index !== fileIndex);
    setSelectedFiles(nextFiles);

    if (!fileInputRef.current) return;
    const dataTransfer = new DataTransfer();
    nextFiles.forEach((file) => dataTransfer.items.add(file));
    fileInputRef.current.files = dataTransfer.files;
  }

  function getFormString(formData: FormData, key: string) {
    return String(formData.get(key) || "").trim();
  }

  function buildDraftPayload(): { payload?: ReportDraftPayload; error?: string } {
    const form = formRef.current;
    if (!form) return { error: "임시저장할 입력값을 확인할 수 없습니다." };

    const formData = new FormData(form);
    const title = getFormString(formData, "title");
    const locationText = getFormString(formData, "location");
    const latitudeText = getFormString(formData, "latitude");
    const longitudeText = getFormString(formData, "longitude");
    const cctvIdText = getFormString(formData, "cctv_id");
    const latitudeValue = latitudeText ? Number(latitudeText) : undefined;
    const longitudeValue = longitudeText ? Number(longitudeText) : undefined;

    if (cctvIdText && !Number.isFinite(Number(cctvIdText))) {
      return { error: "CCTV 선택값이 올바르지 않습니다." };
    }

    if ((latitudeText && !Number.isFinite(latitudeValue)) || (longitudeText && !Number.isFinite(longitudeValue))) {
      return { error: "위도와 경도는 숫자로 입력해 주세요." };
    }

    const payload: ReportDraftPayload = {
      title: title || undefined,
      subject: title || undefined,
      report_type: getFormString(formData, "reportType") || "GENERAL",
      upload_purpose: getFormString(formData, "purpose") || "ANALYSIS",
      description: getFormString(formData, "description") || undefined,
      priority: getFormString(formData, "priority") || "NORMAL",
      cctv_id: cctvIdText ? Number(cctvIdText) : undefined,
      location: locationText || undefined,
      latitude: latitudeValue !== undefined ? String(latitudeValue) : undefined,
      longitude: longitudeValue !== undefined ? String(longitudeValue) : undefined,
    };

    return {
      payload: Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")) as ReportDraftPayload,
    };
  }

  function setFieldValue(name: string, value: string | number | null | undefined) {
    const field = formRef.current?.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      field.value = value === null || value === undefined ? "" : String(value);
    }
  }

  function applyDraftToForm(draft: ReportDraft) {
    setFieldValue("reportType", draft.report_type ?? "GENERAL");
    setFieldValue("purpose", draft.upload_purpose ?? "ANALYSIS");
    setFieldValue("title", draft.title ?? draft.subject ?? "");
    setFieldValue("priority", draft.priority ?? "NORMAL");
    setFieldValue("description", draft.description ?? "");
    setLocation(draft.location ?? draft.address ?? draft.place_name ?? draft.locationName ?? "");
    setLatitude(draft.latitude === null || draft.latitude === undefined ? "" : String(draft.latitude));
    setLongitude(draft.longitude === null || draft.longitude === undefined ? "" : String(draft.longitude));
    setCurrentDraft(draft);
    setCurrentDraftId(getDraftId(draft));
    setStatusMessage("임시저장 신고를 불러왔습니다.");
    setErrorMessage("");
    setShowDrafts(false);
  }

  useEffect(() => {
    const draftId = new URLSearchParams(window.location.search).get("draftId");
    if (!draftId) return;

    const storedDraft = window.sessionStorage.getItem("staccato:reportDraftToLoad");
    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft) as { draftId?: string | number; draft?: ReportDraft };
        if (parsed.draft && String(parsed.draftId ?? getDraftId(parsed.draft)) === String(draftId)) {
          applyDraftToForm(parsed.draft);
          window.sessionStorage.removeItem("staccato:reportDraftToLoad");
          return;
        }
      } catch {
        window.sessionStorage.removeItem("staccato:reportDraftToLoad");
      }
    }

    getReportDraft(draftId)
      .then(applyDraftToForm)
      .catch(() => setErrorMessage("임시저장 신고를 불러오지 못했습니다."));
  }, []);

  async function loadDrafts(page = draftPage) {
    setLoadingDrafts(true);
    setErrorMessage("");

    try {
      const response = await getMyReportDrafts({ page, size: 10 });
      setDrafts(response.items);
      setDraftPage(response.page);
      setDraftTotalPages(response.total_pages || 1);
      setShowDrafts(true);
    } catch {
      setErrorMessage("임시저장 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingDrafts(false);
    }
  }

  async function handleSaveDraft() {
    const { payload, error } = buildDraftPayload();
    if (error || !payload) {
      setErrorMessage(error ?? "임시저장할 입력값을 확인해 주세요.");
      return;
    }

    setSavingDraft(true);
    setErrorMessage("");

    try {
      const response = currentDraftId ? await updateReportDraft(currentDraftId, payload) : await createReportDraft(payload);
      const nextDraft = response.draft ?? response.data;
      const nextDraftId = response.draft_id ?? nextDraft?.draft_id ?? nextDraft?.id;
      if (nextDraft) setCurrentDraft(nextDraft);
      if (nextDraftId !== undefined && nextDraftId !== null) {
        setCurrentDraftId(nextDraftId);
        if (!nextDraft) setCurrentDraft(await getReportDraft(nextDraftId));
      }
      setStatusMessage("임시저장되었습니다.");
      if (showDrafts) await loadDrafts(draftPage);
    } catch {
      setErrorMessage("임시저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function refreshCurrentDraft(draftId = currentDraftId) {
    if (!draftId) return null;
    const draft = await getReportDraft(draftId);
    setCurrentDraft(draft);
    setCurrentDraftId(getDraftId(draft));
    return draft;
  }

  async function handleUploadDraftAttachments(files: FileList | null) {
    if (!currentDraftId || !files || files.length === 0) return;
    setUploadingDraftAttachment(true);
    setErrorMessage("");

    try {
      await uploadReportAttachments(currentDraftId, Array.from(files));
      await refreshCurrentDraft(currentDraftId);
      setStatusMessage("첨부파일이 추가되었습니다.");
    } catch {
      setErrorMessage("첨부파일 추가에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUploadingDraftAttachment(false);
    }
  }

  async function handleDeleteDraftAttachment(attachmentId: string | number) {
    if (!currentDraftId) return;
    const confirmed = window.confirm("첨부파일을 삭제하시겠습니까?");
    if (!confirmed) return;

    setDeletingDraftAttachmentId(String(attachmentId));
    setErrorMessage("");

    try {
      await deleteReportAttachment(currentDraftId, attachmentId);
      await refreshCurrentDraft(currentDraftId);
      setStatusMessage("첨부파일이 삭제되었습니다.");
    } catch {
      setErrorMessage("첨부파일 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingDraftAttachmentId(null);
    }
  }

  async function handleSubmitDraft() {
    if (!currentDraftId) return;
    const confirmed = window.confirm("임시저장 신고를 최종 제출하시겠습니까?");
    if (!confirmed) return;

    setSubmittingDraft(true);
    setErrorMessage("");

    try {
      const { payload, error } = buildDraftPayload();
      if (error) {
        setErrorMessage(error);
        setSubmittingDraft(false);
        return;
      }
      if (payload) await updateReportDraft(currentDraftId, payload);
      const response = await submitReportDraft(currentDraftId);
      const reportId = response.report_id ?? response.report?.id ?? response.data?.report_id ?? response.data?.id;
      setStatusMessage("임시저장 신고가 최종 제출되었습니다.");
      window.setTimeout(() => {
        router.replace(reportId ? "/reports/" + reportId : "/reports");
      }, 500);
    } catch {
      setErrorMessage("제출할 수 없는 임시저장 신고입니다.");
    } finally {
      setSubmittingDraft(false);
    }
  }

  async function handleLoadDraft(draftId: string | number) {
    setErrorMessage("");

    try {
      const draft = await getReportDraft(draftId);
      applyDraftToForm(draft);
    } catch {
      setErrorMessage("임시저장 신고를 불러오지 못했습니다.");
    }
  }

  async function handleDeleteDraft(draft: ReportDraft) {
    const draftId = getDraftId(draft);
    if (!draftId) return;
    const confirmed = window.confirm("임시저장 신고를 삭제하시겠습니까?");
    if (!confirmed) return;

    setDeletingDraftId(String(draftId));
    setErrorMessage("");

    try {
      await deleteReportDraft(draftId);
      if (currentDraftId !== null && String(currentDraftId) === String(draftId)) {
        setCurrentDraft(null);
        setCurrentDraftId(null);
        formRef.current?.reset();
        setLocation("");
        setLatitude("");
        setLongitude("");
        setSelectedFiles([]);
      }
      setStatusMessage("임시저장 신고가 삭제되었습니다.");
      await loadDrafts(draftPage);
    } catch {
      setErrorMessage("임시저장 신고를 삭제하지 못했습니다.");
    } finally {
      setDeletingDraftId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsCompleted(false);
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

    const title = String(formData.get("title") || "").trim();

    if (!title) {
      setErrorMessage("신고 제목을 입력해 주세요.");
      setIsSubmitting(false);
      return;
    }

    const locationText = String(formData.get("location") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const latitudeText = String(formData.get("latitude") || "").trim();
    const longitudeText = String(formData.get("longitude") || "").trim();
    const latitudeValue = latitudeText ? Number(latitudeText) : undefined;
    const longitudeValue = longitudeText ? Number(longitudeText) : undefined;

    if ((latitudeText && !Number.isFinite(latitudeValue)) || (longitudeText && !Number.isFinite(longitudeValue))) {
      setErrorMessage("위도와 경도는 숫자로 입력해 주세요.");
      setIsSubmitting(false);
      return;
    }

    const payload: UploadReportPayload = {
      files,
      title,
      reportType: (formData.get("reportType") || "GENERAL") as ReportType,
      uploadPurpose: (formData.get("purpose") || "ANALYSIS") as UploadPurpose,
      description: description || undefined,
      priority: (formData.get("priority") || "NORMAL") as ReportPriority,
      location: locationText || undefined,
      latitude: latitudeValue,
      longitude: longitudeValue,
      isDemoData: formData.get("isDemoData") === "on",
    };

    try {
      setStatusMessage("신고 파일을 업로드하고 사고 신고를 생성하는 중입니다.");
      const response = await uploadReport(payload);
      const reportId = response.report_id ?? response.id ?? response.data?.report_id ?? response.data?.id;
      const reportCodeValue = response.report_code ?? response.data?.report_code;
      const reportCode = reportCodeValue ? " (" + reportCodeValue + ")" : "";

      setStatusMessage("리포트가 성공적으로 접수되었습니다." + reportCode);
      setIsCompleted(true);

      window.setTimeout(() => {
        if (reportId === undefined || reportId === null || String(reportId) === "") {
          router.replace("/reports");
          return;
        }

        router.replace(`/reports/${reportId}`);
      }, 800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "신고 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">임시저장</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{currentDraftId ? `현재 임시저장 #${currentDraftId} 편집 중` : "작성 중인 신고를 임시저장하거나 기존 임시저장을 불러옵니다."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || isSubmitting} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">
            {savingDraft ? "임시저장 중" : currentDraftId ? "임시저장 수정" : "임시저장"}
          </button>
          <button type="button" onClick={() => loadDrafts(1)} disabled={loadingDrafts} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">
            {loadingDrafts ? "불러오는 중" : "임시저장 목록"}
          </button>
        </div>
      </div>

      {showDrafts ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900">내 임시저장 목록</h3>
            <button type="button" onClick={() => setShowDrafts(false)} className="text-xs font-bold text-slate-500 hover:text-slate-900">닫기</button>
          </div>
          {drafts.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">저장된 임시신고가 없습니다.</p>
          ) : (
            <div className="grid gap-2">
              {drafts.map((draft) => {
                const draftId = getDraftId(draft);
                return (
                  <div key={String(draftId ?? draft.title)} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{draft.title ?? draft.subject ?? "제목 없음"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{draft.status ?? "DRAFT"} · {formatDraftDate(draft.updated_at ?? draft.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={!draftId} onClick={() => draftId && handleLoadDraft(draftId)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">불러오기</button>
                      <button type="button" disabled={!draftId || deletingDraftId === String(draftId)} onClick={() => handleDeleteDraft(draft)} className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{deletingDraftId === String(draftId) ? "삭제 중" : "삭제"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" disabled={draftPage <= 1 || loadingDrafts} onClick={() => loadDrafts(draftPage - 1)} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">이전</button>
            <span className="text-xs font-bold text-slate-500">{draftPage} / {draftTotalPages}</span>
            <button type="button" disabled={draftPage >= draftTotalPages || loadingDrafts} onClick={() => loadDrafts(draftPage + 1)} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">다음</button>
          </div>
        </div>
      ) : null}
      {currentDraftId && currentDraft ? (
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">임시저장 첨부파일</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">임시저장 상태의 첨부파일을 추가하거나 삭제할 수 있습니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
                {uploadingDraftAttachment ? "업로드 중" : "첨부파일 추가"}
                <input
                  type="file"
                  multiple
                  disabled={uploadingDraftAttachment}
                  onChange={(event) => {
                    handleUploadDraftAttachments(event.target.files);
                    event.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
              <button type="button" onClick={handleSubmitDraft} disabled={submittingDraft} className="h-10 rounded-lg bg-staccato px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
                {submittingDraft ? "제출 중" : "임시저장 최종 제출"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <ReportAttachmentPreview report={currentDraft} />
            <div className="grid content-start gap-2">
              {(currentDraft.attachments ?? []).length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">첨부파일이 없습니다.</p>
              ) : (
                (currentDraft.attachments ?? []).map((attachment, index) => {
                  const attachmentId = getAttachmentId(attachment);
                  return (
                    <div key={String(attachmentId ?? index)} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="truncate text-xs font-black text-slate-900">{getAttachmentName(attachment)}</p>
                      <button
                        type="button"
                        disabled={!attachmentId || deletingDraftAttachmentId === String(attachmentId)}
                        onClick={() => attachmentId && handleDeleteDraftAttachment(attachmentId)}
                        className="mt-3 h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingDraftAttachmentId === String(attachmentId) ? "삭제 중" : "삭제"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          신고 유형
          <select name="reportType" className="h-11 rounded-lg border border-slate-200 px-3">
            <option value="GENERAL">일반 리포트</option>
            <option value="ACCIDENT">사고 리포트</option>
            <option value="LANE_STOP_REPORT">주행차로 정차 신고</option>
            <option value="SHOULDER_STOP_REPORT">갓길 정차 신고</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          업로드 목적
          <select name="purpose" className="h-11 rounded-lg border border-slate-200 px-3">
            <option value="ANALYSIS">분석</option>
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
            <option value="NORMAL">보통</option>
            <option value="LOW">낮음</option>
            <option value="MEDIUM">중간</option>
            <option value="HIGH">높음</option>
            <option value="URGENT">긴급</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        설명
        <textarea name="description" className="min-h-28 rounded-lg border border-slate-200 p-3" />
      </label>
      <div className="grid gap-2 text-sm font-semibold">
        <span>위치 입력</span>
        <ReportLocationForm
          value={location}
          onChange={setLocation}
          onSelect={(selectedLocation) => {
            setLocation(selectedLocation.label);
            setLatitude(String(selectedLocation.latitude));
            setLongitude(String(selectedLocation.longitude));
          }}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          위도
          <input name="latitude" type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          경도
          <input name="longitude" type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input name="isDemoData" type="checkbox" className="h-4 w-4" />
        데모 데이터로 업로드
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        이미지/영상 업로드
        <input
          ref={fileInputRef}
          name="files"
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="rounded-lg border border-slate-200 p-3"
        />
      </label>
      <ReportFilePreview
        files={selectedFiles}
        onSelectFiles={handleFileSelectClick}
        onRemoveFile={handleRemoveSelectedFile}
      />
      {statusMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-staccato">{statusMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{errorMessage}</p> : null}
      <button type="submit" disabled={isSubmitting || isCompleted} className="h-11 rounded-lg bg-staccato font-bold text-white disabled:opacity-60">
        {isCompleted ? "신고 상세로 이동 중..." : isSubmitting ? "처리 중..." : "신고 등록"}
      </button>
    </form>
  );
}