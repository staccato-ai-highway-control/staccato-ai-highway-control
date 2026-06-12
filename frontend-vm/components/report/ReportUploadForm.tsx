/**
 * 파일 역할: 보고서 영역에서 사용하는 ReportUploadForm UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { createReportDraft, deleteReportAttachment, deleteReportDraft, getMyReportDrafts, getReportDraft, submitReportDraft, updateReportDraft, uploadReport, uploadReportAttachments, type UploadReportPayload } from "@/features/reports/api";
// 코드 설명: @/features/reports/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReportDraft, ReportDraftPayload, ReportPriority, ReportType, UploadPurpose } from "@/features/reports/types";
// 코드 설명: ./ReportAttachmentPreview 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ReportAttachmentPreview } from "./ReportAttachmentPreview";
// 코드 설명: ./ReportFilePreview 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ReportFilePreview } from "./ReportFilePreview";
// 코드 설명: ./ReportLocationForm 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ReportLocationForm } from "./ReportLocationForm";

// 코드 설명: getDraftId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getDraftId(draft: ReportDraft) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: draft.draft_id ?? draft.id
  return draft.draft_id ?? draft.id;
}

// 코드 설명: getAttachmentId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentId(attachment: NonNullable<ReportDraft["attachments"]>[number]) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment.attachment_id ?? attachment.id
  return attachment.attachment_id ?? attachment.id;
}

// 코드 설명: getAttachmentName 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAttachmentName(attachment: NonNullable<ReportDraft["attachments"]>[number]) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: attachment.original_filename ?? attachment.filename ?? "첨부파일"
  return attachment.original_filename ?? attachment.filename ?? "첨부파일";
}

// 코드 설명: formatDraftDate 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDraftDate(value?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !value
  if (!value) return "-";
  // 코드 설명: date 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const date = new Date(value);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: Number.isNaN(date.getTime())
  if (Number.isNaN(date.getTime())) return value;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", ho…
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

// 코드 설명: ReportUploadForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ReportUploadForm() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: formRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const formRef = useRef<HTMLFormElement>(null);
  // 코드 설명: fileInputRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 코드 설명: [statusMessage, setStatusMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [statusMessage, setStatusMessage] = useState("");
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [isSubmitting, setIsSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 코드 설명: [isCompleted, setIsCompleted] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isCompleted, setIsCompleted] = useState(false);
  // 코드 설명: [location, setLocation] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [location, setLocation] = useState("");
  // 코드 설명: [latitude, setLatitude] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [latitude, setLatitude] = useState("");
  // 코드 설명: [longitude, setLongitude] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [longitude, setLongitude] = useState("");
  // 코드 설명: [selectedFiles, setSelectedFiles] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // 코드 설명: [currentDraft, setCurrentDraft] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [currentDraft, setCurrentDraft] = useState<ReportDraft | null>(null);
  // 코드 설명: [currentDraftId, setCurrentDraftId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [currentDraftId, setCurrentDraftId] = useState<string | number | null>(null);
  // 코드 설명: [drafts, setDrafts] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  // 코드 설명: [draftPage, setDraftPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [draftPage, setDraftPage] = useState(1);
  // 코드 설명: [draftTotalPages, setDraftTotalPages] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [draftTotalPages, setDraftTotalPages] = useState(1);
  // 코드 설명: [showDrafts, setShowDrafts] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [showDrafts, setShowDrafts] = useState(false);
  // 코드 설명: [loadingDrafts, setLoadingDrafts] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  // 코드 설명: [savingDraft, setSavingDraft] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [savingDraft, setSavingDraft] = useState(false);
  // 코드 설명: [deletingDraftId, setDeletingDraftId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  // 코드 설명: [uploadingDraftAttachment, setUploadingDraftAttachment] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [uploadingDraftAttachment, setUploadingDraftAttachment] = useState(false);
  // 코드 설명: [deletingDraftAttachmentId, setDeletingDraftAttachmentId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [deletingDraftAttachmentId, setDeletingDraftAttachmentId] = useState<string | null>(null);
  // 코드 설명: [submittingDraft, setSubmittingDraft] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [submittingDraft, setSubmittingDraft] = useState(false);

  // 코드 설명: handleFileChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    // 코드 설명: setSelectedFiles 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  // 코드 설명: handleFileSelectClick 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleFileSelectClick() {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: fileInputRef.current?.click();
    fileInputRef.current?.click();
  }

  // 코드 설명: handleRemoveSelectedFile 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleRemoveSelectedFile(fileIndex: number) {
    // 코드 설명: nextFiles 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const nextFiles = selectedFiles.filter((_, index) => index !== fileIndex);
    // 코드 설명: setSelectedFiles 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedFiles(nextFiles);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !fileInputRef.current
    if (!fileInputRef.current) return;
    // 코드 설명: dataTransfer 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const dataTransfer = new DataTransfer();
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: nextFiles.forEach((file) => dataTransfer.items.add(file));
    nextFiles.forEach((file) => dataTransfer.items.add(file));
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: fileInputRef.current.files = dataTransfer.files;
    fileInputRef.current.files = dataTransfer.files;
  }

  // 코드 설명: getFormString 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function getFormString(formData: FormData, key: string) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: String(formData.get(key) || "").trim()
    return String(formData.get(key) || "").trim();
  }

  // 코드 설명: buildDraftPayload 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function buildDraftPayload(): { payload?: ReportDraftPayload; error?: string } {
    // 코드 설명: form 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const form = formRef.current;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !form
    if (!form) return { error: "임시저장할 입력값을 확인할 수 없습니다." };

    // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
    const formData = new FormData(form);
    // 코드 설명: title 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const title = getFormString(formData, "title");
    // 코드 설명: locationText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const locationText = getFormString(formData, "location");
    // 코드 설명: latitudeText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const latitudeText = getFormString(formData, "latitude");
    // 코드 설명: longitudeText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const longitudeText = getFormString(formData, "longitude");
    // 코드 설명: cctvIdText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const cctvIdText = getFormString(formData, "cctv_id");
    // 코드 설명: latitudeValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const latitudeValue = latitudeText ? Number(latitudeText) : undefined;
    // 코드 설명: longitudeValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const longitudeValue = longitudeText ? Number(longitudeText) : undefined;

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: cctvIdText && !Number.isFinite(Number(cctvIdText))
    if (cctvIdText && !Number.isFinite(Number(cctvIdText))) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { error: "CCTV 선택값이 올바르지 않습니다." }
      return { error: "CCTV 선택값이 올바르지 않습니다." };
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: (latitudeText && !Number.isFinite(latitudeValue)) || (longitudeText && …
    if ((latitudeText && !Number.isFinite(latitudeValue)) || (longitudeText && !Number.isFinite(longitudeValue))) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { error: "위도와 경도는 숫자로 입력해 주세요." }
      return { error: "위도와 경도는 숫자로 입력해 주세요." };
    }

    // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
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

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { payload: Object.fromEntries(Object.entries(payload).filter(([, value]…
    return {
      payload: Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")) as ReportDraftPayload,
    };
  }

  // 코드 설명: setFieldValue 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function setFieldValue(name: string, value: string | number | null | undefined) {
    // 코드 설명: field 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const field = formRef.current?.elements.namedItem(name);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: field instanceof HTMLInputElement || field instanceof HTMLSelectElement…
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: field.value = value === null || value === undefined ? "" : String(value…
      field.value = value === null || value === undefined ? "" : String(value);
    }
  }

  // 코드 설명: applyDraftToForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function applyDraftToForm(draft: ReportDraft) {
    // 코드 설명: setFieldValue 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFieldValue("reportType", draft.report_type ?? "GENERAL");
    // 코드 설명: setFieldValue 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFieldValue("purpose", draft.upload_purpose ?? "ANALYSIS");
    // 코드 설명: setFieldValue 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFieldValue("title", draft.title ?? draft.subject ?? "");
    // 코드 설명: setFieldValue 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFieldValue("priority", draft.priority ?? "NORMAL");
    // 코드 설명: setFieldValue 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setFieldValue("description", draft.description ?? "");
    // 코드 설명: setLocation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLocation(draft.location ?? draft.address ?? draft.place_name ?? draft.locationName ?? "");
    // 코드 설명: setLatitude 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLatitude(draft.latitude === null || draft.latitude === undefined ? "" : String(draft.latitude));
    // 코드 설명: setLongitude 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLongitude(draft.longitude === null || draft.longitude === undefined ? "" : String(draft.longitude));
    // 코드 설명: setCurrentDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCurrentDraft(draft);
    // 코드 설명: setCurrentDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCurrentDraftId(getDraftId(draft));
    // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setStatusMessage("임시저장 신고를 불러왔습니다.");
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: setShowDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setShowDrafts(false);
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: draftId 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
    const draftId = new URLSearchParams(window.location.search).get("draftId");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !draftId
    if (!draftId) return;

    // 코드 설명: storedDraft 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const storedDraft = window.sessionStorage.getItem("staccato:reportDraftToLoad");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: storedDraft
    if (storedDraft) {
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: parsed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const parsed = JSON.parse(storedDraft) as { draftId?: string | number; draft?: ReportDraft };
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: parsed.draft && String(parsed.draftId ?? getDraftId(parsed.draft)) === …
        if (parsed.draft && String(parsed.draftId ?? getDraftId(parsed.draft)) === String(draftId)) {
          // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: applyDraftToForm(parsed.draft);
          applyDraftToForm(parsed.draft);
          // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.sessionStorage.removeItem("staccato:reportDraftToLoad");
          window.sessionStorage.removeItem("staccato:reportDraftToLoad");
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }
      } catch {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.sessionStorage.removeItem("staccato:reportDraftToLoad");
        window.sessionStorage.removeItem("staccato:reportDraftToLoad");
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: getReportDraft(draftId) .then(applyDraftToForm) .catch(() => setErrorMe…
    getReportDraft(draftId)
      .then(applyDraftToForm)
      .catch(() => setErrorMessage("임시저장 신고를 불러오지 못했습니다."));
  }, []);

  // 코드 설명: loadDrafts 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadDrafts(page = draftPage) {
    // 코드 설명: setLoadingDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoadingDrafts(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await getMyReportDrafts({ page, size: 10 });
      // 코드 설명: setDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDrafts(response.items);
      // 코드 설명: setDraftPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDraftPage(response.page);
      // 코드 설명: setDraftTotalPages 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDraftTotalPages(response.total_pages || 1);
      // 코드 설명: setShowDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setShowDrafts(true);
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("임시저장 목록을 불러오지 못했습니다.");
    } finally {
      // 코드 설명: setLoadingDrafts 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoadingDrafts(false);
    }
  }

  // 코드 설명: handleSaveDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSaveDraft() {
    // 코드 설명: { payload, error } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const { payload, error } = buildDraftPayload();
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: error || !payload
    if (error || !payload) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error ?? "임시저장할 입력값을 확인해 주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: setSavingDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSavingDraft(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = currentDraftId ? await updateReportDraft(currentDraftId, payload) : await createReportDraft(payload);
      // 코드 설명: nextDraft 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextDraft = response.draft ?? response.data;
      // 코드 설명: nextDraftId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const nextDraftId = response.draft_id ?? nextDraft?.draft_id ?? nextDraft?.id;
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nextDraft
      if (nextDraft) setCurrentDraft(nextDraft);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: nextDraftId !== undefined && nextDraftId !== null
      if (nextDraftId !== undefined && nextDraftId !== null) {
        // 코드 설명: setCurrentDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setCurrentDraftId(nextDraftId);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !nextDraft
        if (!nextDraft) setCurrentDraft(await getReportDraft(nextDraftId));
      }
      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("임시저장되었습니다.");
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: showDrafts
      if (showDrafts) await loadDrafts(draftPage);
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("임시저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setSavingDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSavingDraft(false);
    }
  }

  // 코드 설명: refreshCurrentDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function refreshCurrentDraft(draftId = currentDraftId) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !draftId
    if (!draftId) return null;
    // 코드 설명: draft 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const draft = await getReportDraft(draftId);
    // 코드 설명: setCurrentDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCurrentDraft(draft);
    // 코드 설명: setCurrentDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCurrentDraftId(getDraftId(draft));
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: draft
    return draft;
  }

  // 코드 설명: handleUploadDraftAttachments 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleUploadDraftAttachments(files: FileList | null) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !currentDraftId || !files || files.length === 0
    if (!currentDraftId || !files || files.length === 0) return;
    // 코드 설명: setUploadingDraftAttachment 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUploadingDraftAttachment(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await uploadReportAttachments(currentDraftId, Array.from(files));
      await uploadReportAttachments(currentDraftId, Array.from(files));
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await refreshCurrentDraft(currentDraftId);
      await refreshCurrentDraft(currentDraftId);
      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("첨부파일이 추가되었습니다.");
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("첨부파일 추가에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setUploadingDraftAttachment 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUploadingDraftAttachment(false);
    }
  }

  // 코드 설명: handleDeleteDraftAttachment 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDeleteDraftAttachment(attachmentId: string | number) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !currentDraftId
    if (!currentDraftId) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("첨부파일을 삭제하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setDeletingDraftAttachmentId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeletingDraftAttachmentId(String(attachmentId));
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteReportAttachment(currentDraftId, attachmentId);
      await deleteReportAttachment(currentDraftId, attachmentId);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await refreshCurrentDraft(currentDraftId);
      await refreshCurrentDraft(currentDraftId);
      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("첨부파일이 삭제되었습니다.");
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("첨부파일 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 코드 설명: setDeletingDraftAttachmentId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeletingDraftAttachmentId(null);
    }
  }

  // 코드 설명: handleSubmitDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmitDraft() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !currentDraftId
    if (!currentDraftId) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("임시저장 신고를 최종 제출하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setSubmittingDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSubmittingDraft(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: { payload, error } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const { payload, error } = buildDraftPayload();
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: error
      if (error) {
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage(error);
        // 코드 설명: setSubmittingDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setSubmittingDraft(false);
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: payload
      if (payload) await updateReportDraft(currentDraftId, payload);
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await submitReportDraft(currentDraftId);
      // 코드 설명: reportId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const reportId = response.report_id ?? response.report?.id ?? response.data?.report_id ?? response.data?.id;
      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("임시저장 신고가 최종 제출되었습니다.");
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      window.setTimeout(() => {
        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.replace(reportId ? "/reports/" + reportId : "/reports");
      }, 500);
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("제출할 수 없는 임시저장 신고입니다.");
    } finally {
      // 코드 설명: setSubmittingDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setSubmittingDraft(false);
    }
  }

  // 코드 설명: handleLoadDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleLoadDraft(draftId: string | number) {
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: draft 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const draft = await getReportDraft(draftId);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: applyDraftToForm(draft);
      applyDraftToForm(draft);
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("임시저장 신고를 불러오지 못했습니다.");
    }
  }

  // 코드 설명: handleDeleteDraft 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleDeleteDraft(draft: ReportDraft) {
    // 코드 설명: draftId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const draftId = getDraftId(draft);
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !draftId
    if (!draftId) return;
    // 코드 설명: confirmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const confirmed = window.confirm("임시저장 신고를 삭제하시겠습니까?");
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !confirmed
    if (!confirmed) return;

    // 코드 설명: setDeletingDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setDeletingDraftId(String(draftId));
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await deleteReportDraft(draftId);
      await deleteReportDraft(draftId);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: currentDraftId !== null && String(currentDraftId) === String(draftId)
      if (currentDraftId !== null && String(currentDraftId) === String(draftId)) {
        // 코드 설명: setCurrentDraft 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setCurrentDraft(null);
        // 코드 설명: setCurrentDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setCurrentDraftId(null);
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: formRef.current?.reset();
        formRef.current?.reset();
        // 코드 설명: setLocation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setLocation("");
        // 코드 설명: setLatitude 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setLatitude("");
        // 코드 설명: setLongitude 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setLongitude("");
        // 코드 설명: setSelectedFiles 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setSelectedFiles([]);
      }
      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("임시저장 신고가 삭제되었습니다.");
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadDrafts(draftPage);
      await loadDrafts(draftPage);
    } catch {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("임시저장 신고를 삭제하지 못했습니다.");
    } finally {
      // 코드 설명: setDeletingDraftId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setDeletingDraftId(null);
    }
  }

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");
    // 코드 설명: setIsCompleted 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsCompleted(false);
    // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsSubmitting(true);

    // 코드 설명: formData FormData를 만들어 텍스트와 파일을 multipart 요청으로 함께 보냅니다.
    const formData = new FormData(event.currentTarget);
    // 코드 설명: files 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: files.length === 0
    if (files.length === 0) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("업로드할 이미지 또는 영상 파일을 선택해주세요.");
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: title 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const title = String(formData.get("title") || "").trim();

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !title
    if (!title) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("신고 제목을 입력해 주세요.");
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: locationText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const locationText = String(formData.get("location") || "").trim();
    // 코드 설명: description 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const description = String(formData.get("description") || "").trim();
    // 코드 설명: latitudeText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const latitudeText = String(formData.get("latitude") || "").trim();
    // 코드 설명: longitudeText 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const longitudeText = String(formData.get("longitude") || "").trim();
    // 코드 설명: latitudeValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const latitudeValue = latitudeText ? Number(latitudeText) : undefined;
    // 코드 설명: longitudeValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const longitudeValue = longitudeText ? Number(longitudeText) : undefined;

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: (latitudeText && !Number.isFinite(latitudeValue)) || (longitudeText && …
    if ((latitudeText && !Number.isFinite(latitudeValue)) || (longitudeText && !Number.isFinite(longitudeValue))) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("위도와 경도는 숫자로 입력해 주세요.");
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: payload 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
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

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("신고 파일을 업로드하고 사고 신고를 생성하는 중입니다.");
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await uploadReport(payload);
      // 코드 설명: reportId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const reportId = response.report_id ?? response.id ?? response.data?.report_id ?? response.data?.id;
      // 코드 설명: reportCodeValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const reportCodeValue = response.report_code ?? response.data?.report_code;
      // 코드 설명: reportCode 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const reportCode = reportCodeValue ? " (" + reportCodeValue + ")" : "";

      // 코드 설명: setStatusMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatusMessage("리포트가 성공적으로 접수되었습니다." + reportCode);
      // 코드 설명: setIsCompleted 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsCompleted(true);

      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.setTimeout(() => { if (reportId === undefined || reportId === nu…
      window.setTimeout(() => {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: reportId === undefined || reportId === null || String(reportId) === ""
        if (reportId === undefined || reportId === null || String(reportId) === "") {
          // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
          router.replace("/reports");
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
          return;
        }

        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.replace(`/reports/${reportId}`);
      }, 800);
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "신고 처리 중 오류가 발생했습니다.");
    } finally {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                // 코드 설명: draftId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                const draftId = getDraftId(draft);
                // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
                    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: handleUploadDraftAttachments(event.target.files);
                    handleUploadDraftAttachments(event.target.files);
                    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.target.value = "";
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
                  // 코드 설명: attachmentId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const attachmentId = getAttachmentId(attachment);
                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
            // 코드 설명: setLocation 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
            setLocation(selectedLocation.label);
            // 코드 설명: setLatitude 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
            setLatitude(String(selectedLocation.latitude));
            // 코드 설명: setLongitude 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
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