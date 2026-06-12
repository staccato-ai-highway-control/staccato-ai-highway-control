/**
 * 파일 역할: 돌발 상황 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Search } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useRef, useState } from "react";
// 코드 설명: @/components/auth/RequireAuth 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RequireAuth } from "@/components/auth/RequireAuth";
// 코드 설명: @/components/layout/AppLayout 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { AppLayout } from "@/components/layout/AppLayout";
// 코드 설명: @/components/common/ErrorPage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ErrorPage } from "@/components/common/ErrorPage";
// 코드 설명: @/components/incident/IncidentStatusBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { IncidentStatusBadge } from "@/components/incident/IncidentStatusBadge";
// 코드 설명: @/components/incident/RiskLevelBadge 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { RiskLevelBadge } from "@/components/incident/RiskLevelBadge";
// 코드 설명: @/features/incidents/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getIncidents, updateIncidentStatus } from "@/features/incidents/api";
// 코드 설명: @/features/incidents/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  incidentTypeLabels,
  type Incident,
  type IncidentStatus,
  type IncidentType,
  type RiskLevel,
} from "@/features/incidents/types";

// 코드 설명: IncidentTypeFilter 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type IncidentTypeFilter = "ALL" | IncidentType;
// 코드 설명: RiskLevelFilter 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type RiskLevelFilter = "ALL" | RiskLevel;
// 코드 설명: IncidentStatusFilter 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type IncidentStatusFilter = "ALL" | IncidentStatus;

// 코드 설명: typeOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const typeOptions: Array<{ label: string; value: IncidentTypeFilter }> = [
  { label: "전체 유형", value: "ALL" },
  { label: "주행차로 정차", value: "LANE_STOP" },
  { label: "갓길 정차", value: "SHOULDER_STOP" },
];

// 코드 설명: riskOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const riskOptions: Array<{ label: string; value: RiskLevelFilter }> = [
  { label: "전체 위험도", value: "ALL" },
  { label: "낮음", value: "LOW" },
  { label: "보통", value: "MEDIUM" },
  { label: "높음", value: "HIGH" },
  { label: "긴급", value: "CRITICAL" },
];

// 코드 설명: statusOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const statusOptions: Array<{ label: string; value: IncidentStatusFilter }> = [
  { label: "전체 상태", value: "ALL" },
  { label: "탐지됨", value: "DETECTED" },
  { label: "검토중", value: "REVIEWING" },
  { label: "담당 배정", value: "ASSIGNED" },
  { label: "처리완료", value: "RESOLVED" },
  { label: "오탐종료", value: "FALSE_POSITIVE" },
  { label: "종결", value: "CLOSED" },
];

// 코드 설명: incidentStatusOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const incidentStatusOptions = statusOptions.filter(
  (option): option is { label: string; value: IncidentStatus } => option.value !== "ALL"
);

// 코드 설명: pageSizeOptions 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const pageSizeOptions = [10, 20, 50];

// 코드 설명: formatDetectedAt 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function formatDetectedAt(detectedAt: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: detectedAt.replace("T", " ")
  return detectedAt.replace("T", " ");
}

// 코드 설명: matchesSearch 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function matchesSearch(incident: Incident, keyword: string) {
  // 코드 설명: normalizedKeyword 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalizedKeyword = keyword.trim().toLowerCase();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !normalizedKeyword
  if (!normalizedKeyword) return true;

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: [incident.code, incident.roadName, incident.title, incident.location] .…
  return [incident.code, incident.roadName, incident.title, incident.location]
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

// 코드 설명: IncidentsPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function IncidentsPage() {
  // 코드 설명: [incidents, setIncidents] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [incidents, setIncidents] = useState<Incident[]>([]);
  // 코드 설명: [typeFilter, setTypeFilter] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [typeFilter, setTypeFilter] = useState<IncidentTypeFilter>("ALL");
  // 코드 설명: [riskFilter, setRiskFilter] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [riskFilter, setRiskFilter] = useState<RiskLevelFilter>("ALL");
  // 코드 설명: [statusFilter, setStatusFilter] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [statusFilter, setStatusFilter] = useState<IncidentStatusFilter>("ALL");
  // 코드 설명: [searchKeyword, setSearchKeyword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [searchKeyword, setSearchKeyword] = useState("");
  // 코드 설명: [pageSize, setPageSize] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [pageSize, setPageSize] = useState(10);
  // 코드 설명: [currentPage, setCurrentPage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [currentPage, setCurrentPage] = useState(1);
  // 코드 설명: [loading, setLoading] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loading, setLoading] = useState(true);
  // 코드 설명: [errorMessage, setErrorMessage] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 코드 설명: [updatingId, setUpdatingId] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // 코드 설명: [bulkStatus, setBulkStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [bulkStatus, setBulkStatus] = useState<IncidentStatus>("REVIEWING");
  // 코드 설명: [bulkUpdating, setBulkUpdating] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [bulkUpdating, setBulkUpdating] = useState(false);
  // 코드 설명: [selectedIncidentIds, setSelectedIncidentIds] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<Set<string>>(new Set());
  // 코드 설명: selectAllRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  // 코드 설명: loadIncidents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function loadIncidents() {
    // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setLoading(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIncidents 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIncidents(await getIncidents());
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "이벤트 목록을 불러오지 못했습니다.");
      // 코드 설명: setIncidents 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIncidents([]);
    } finally {
      // 코드 설명: setLoading 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setLoading(false);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadIncidents();
    loadIncidents();
  }, []);

  // 코드 설명: handleStatusChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleStatusChange(incident: Incident, status: IncidentStatus) {
    // 코드 설명: setUpdatingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setUpdatingId(incident.id);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await updateIncidentStatus(incident.id, status);
      await updateIncidentStatus(incident.id, status);
      // 코드 설명: setIncidents 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIncidents((current) => current.map((item) => (item.id === incident.id ? { ...item, status } : item)));
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(error instanceof Error ? error.message : "이벤트 상태 변경에 실패했습니다.");
    } finally {
      // 코드 설명: setUpdatingId 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setUpdatingId(null);
    }
  }

  // 코드 설명: filteredIncidents 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const filteredIncidents = useMemo(() => {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: incidents.filter((incident) => { const typeMatched = typeFilter === "AL…
    return incidents.filter((incident) => {
      // 코드 설명: typeMatched 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const typeMatched = typeFilter === "ALL" || incident.eventType === typeFilter;
      // 코드 설명: riskMatched 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const riskMatched = riskFilter === "ALL" || incident.riskLevel === riskFilter;
      // 코드 설명: statusMatched 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const statusMatched = statusFilter === "ALL" || incident.status === statusFilter;

      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: typeMatched && riskMatched && statusMatched && matchesSearch(incident, …
      return typeMatched && riskMatched && statusMatched && matchesSearch(incident, searchKeyword);
    });
  }, [incidents, riskFilter, searchKeyword, statusFilter, typeFilter]);

  // 코드 설명: totalPages 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  // 코드 설명: visibleCurrentPage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  // 코드 설명: pageStartIndex 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const pageStartIndex = filteredIncidents.length === 0 ? 0 : (visibleCurrentPage - 1) * pageSize + 1;
  // 코드 설명: pageEndIndex 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const pageEndIndex = Math.min(visibleCurrentPage * pageSize, filteredIncidents.length);
  // 코드 설명: paginatedIncidents 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const paginatedIncidents = useMemo(
    () => filteredIncidents.slice((visibleCurrentPage - 1) * pageSize, visibleCurrentPage * pageSize),
    [filteredIncidents, pageSize, visibleCurrentPage]
  );
  // 코드 설명: visibleIncidentIds 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const visibleIncidentIds = useMemo(() => paginatedIncidents.map((incident) => incident.id), [paginatedIncidents]);
  // 코드 설명: allVisibleSelected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const allVisibleSelected = visibleIncidentIds.length > 0 && visibleIncidentIds.every((id) => selectedIncidentIds.has(id));
  // 코드 설명: someVisibleSelected 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const someVisibleSelected = visibleIncidentIds.some((id) => selectedIncidentIds.has(id));

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: selectAllRef.current
    if (selectAllRef.current) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: selectAllRef.current.indeterminate = someVisibleSelected && !allVisible…
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setSelectedIncidentIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedIncidentIds((current) => {
      // 코드 설명: visibleIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const visibleIds = new Set(visibleIncidentIds);
      // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next.size === current.size ? current : next
      return next.size === current.size ? current : next;
    });
  }, [visibleIncidentIds]);

  // 코드 설명: toggleAllIncidents 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function toggleAllIncidents(checked: boolean) {
    // 코드 설명: setSelectedIncidentIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedIncidentIds(checked ? new Set(visibleIncidentIds) : new Set());
  }

  // 코드 설명: toggleIncident 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function toggleIncident(incidentId: string, checked: boolean) {
    // 코드 설명: setSelectedIncidentIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedIncidentIds((current) => {
      // 코드 설명: next 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const next = new Set(current);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: checked
      if (checked) next.add(incidentId);
      else next.delete(incidentId);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: next
      return next;
    });
  }

  // 코드 설명: selectedIncidents 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedIncidents = useMemo(
    () => paginatedIncidents.filter((incident) => selectedIncidentIds.has(incident.id)),
    [paginatedIncidents, selectedIncidentIds]
  );

  // 코드 설명: handleBulkStatusChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleBulkStatusChange() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: selectedIncidents.length === 0
    if (selectedIncidents.length === 0) return;
    // 코드 설명: setBulkUpdating 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBulkUpdating(true);
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage(null);

    // 코드 설명: results 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const results = await Promise.allSettled(
      selectedIncidents.map((incident) => updateIncidentStatus(incident.id, bulkStatus))
    );
    // 코드 설명: succeededIds 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const succeededIds = new Set(
      selectedIncidents
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map((incident) => incident.id)
    );

    // 코드 설명: setIncidents 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIncidents((current) => current.map((incident) => (
      succeededIds.has(incident.id) ? { ...incident, status: bulkStatus } : incident
    )));
    // 코드 설명: setSelectedIncidentIds 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setSelectedIncidentIds(new Set());
    // 코드 설명: setBulkUpdating 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setBulkUpdating(false);

    // 코드 설명: failedCount 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const failedCount = results.length - succeededIds.size;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: failedCount > 0
    if (failedCount > 0) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(`${failedCount}건의 이벤트 상태를 변경하지 못했습니다.`);
    }
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setCurrentPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCurrentPage(1);
  }, [pageSize, riskFilter, searchKeyword, statusFilter, typeFilter]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setCurrentPage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <RequireAuth>
      <AppLayout title="이벤트 관리">
        <section className="mb-5">
          <h2 className="text-2xl font-black text-slate-950">이벤트 관리</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">전체 실시간 이벤트 목록과 상태, 담당자, 오탐 처리를 통합 관리합니다.</p>
        </section>

        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="이벤트 코드, 도로명, 제목 검색" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white" />
            </div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as IncidentTypeFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskLevelFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {riskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatusFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </section>

        {errorMessage && !loading && incidents.length === 0 ? (
          <ErrorPage
            statusCode={500}
            title="이벤트 목록을 불러오지 못했습니다"
            description={errorMessage}
            actionLabel="다시 시도"
            actionHref={undefined}
            onAction={loadIncidents}
            secondaryActionLabel="대시보드로 이동"
            secondaryActionHref="/dashboard"
          />
        ) : null}
        {errorMessage && incidents.length > 0 ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

        {!(errorMessage && !loading && incidents.length === 0) ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{loading ? "불러오는 중" : `전체 ${filteredIncidents.length}건 · 현재 ${pageStartIndex}-${pageEndIndex}건 · ${selectedIncidentIds.size}건 선택`}</span>
            <button type="button" onClick={loadIncidents} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">새로고침</button>
          </div>
          {selectedIncidentIds.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3">
              <span className="text-sm font-black text-sky-800">{selectedIncidentIds.size}건 선택됨</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value as IncidentStatus)}
                  disabled={bulkUpdating}
                  aria-label="선택 이벤트 변경 상태"
                  className="h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-800 disabled:opacity-50"
                >
                  {incidentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" onClick={handleBulkStatusChange} disabled={bulkUpdating} className="h-9 rounded-lg bg-sky-700 px-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-50">
                  {bulkUpdating ? "변경 중" : "선택 상태 변경"}
                </button>
              </div>
            </div>
          ) : null}
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-11 px-2 py-3 text-center"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllIncidents(event.target.checked)} aria-label="현재 이벤트 전체 선택" className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="w-[9%] px-2 py-3">코드</th>
                  <th className="w-[9%] px-2 py-3">유형</th>
                  <th className="w-[12%] px-2 py-3">제목</th>
                  <th className="w-[13%] px-2 py-3">도로명/위치</th>
                  <th className="w-[6%] px-2 py-3">위험도</th>
                  <th className="w-[7%] px-2 py-3">상태</th>
                  <th className="w-[11%] px-2 py-3">탐지 시각</th>
                  <th className="w-[9%] px-2 py-3">담당자</th>
                  <th className="w-[180px] px-2 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIncidents.map((incident) => {
                  // 코드 설명: roadName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const roadName = incident.roadName.trim();
                  // 코드 설명: location 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const location = incident.location.trim();

                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                  return (
                    <tr key={incident.id} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-4 text-center"><input type="checkbox" checked={selectedIncidentIds.has(incident.id)} onChange={(event) => toggleIncident(incident.id, event.target.checked)} aria-label={incident.title + " 선택"} className="h-4 w-4 rounded border-slate-300" /></td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-bold text-slate-700" title={incident.code}>{incident.code}</td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600" title={incidentTypeLabels[incident.eventType]}>{incidentTypeLabels[incident.eventType]}</td>
                      <td className="min-w-0 px-2 py-4">
                        <b className="block truncate text-slate-950" title={incident.title}>{incident.title}</b>
                        <p className="mt-1 text-xs font-semibold text-slate-400">신뢰도 {Math.round(incident.confidence * 100)}%</p>
                      </td>
                      <td className="min-w-0 px-2 py-4">
                        {roadName || location ? (
                          <>
                            <b className="block truncate text-slate-700" title={roadName}>{roadName || "-"}</b>
                            {location ? <p className="mt-1 truncate text-xs font-semibold text-slate-500" title={location}>{location}</p> : null}
                          </>
                        ) : (
                          <span className="font-semibold text-slate-500">-</span>
                        )}
                      </td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><RiskLevelBadge level={incident.riskLevel} /></td>
                      <td className="truncate whitespace-nowrap px-2 py-4"><IncidentStatusBadge status={incident.status} /></td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-500" title={formatDetectedAt(incident.detectedAt)}>{formatDetectedAt(incident.detectedAt)}</td>
                      <td className="truncate whitespace-nowrap px-2 py-4 font-semibold text-slate-600" title={incident.assignee?.trim() || "미배정"}>{incident.assignee?.trim() || "미배정"}</td>
                      <td className="px-2 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Link href={`/incidents/${incident.id}`} className="whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 no-underline transition hover:bg-slate-50">상세 보기</Link>
                          <select
                            value={incident.status}
                            disabled={updatingId === incident.id}
                            onChange={(event) => handleStatusChange(incident, event.target.value as IncidentStatus)}
                            aria-label={`${incident.title} 상태 변경`}
                            className="h-8 min-w-24 rounded-lg border border-sky-200 bg-white px-2 text-xs font-bold text-sky-700 outline-none transition focus:border-sky-400 disabled:cursor-wait disabled:opacity-50"
                          >
                            {incidentStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && filteredIncidents.length === 0 ? <p className="border-t border-slate-100 p-6 text-center text-sm font-semibold text-slate-500">조건에 맞는 이벤트가 없습니다.</p> : null}

          {!loading && filteredIncidents.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">전체 {filteredIncidents.length}건 · 현재 {pageStartIndex}-{pageEndIndex}건 표시</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                  aria-label="페이지당 표시 건수"
                >
                  {pageSizeOptions.map((option) => <option key={option} value={option}>{option}건</option>)}
                </select>
                <button
                  type="button"
                  disabled={visibleCurrentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="min-w-[76px] text-center text-xs font-bold text-slate-500">{visibleCurrentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={visibleCurrentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}
        </section> : null}
      </AppLayout>
    </RequireAuth>
  );
}
