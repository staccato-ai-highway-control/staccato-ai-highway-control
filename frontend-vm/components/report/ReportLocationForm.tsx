/**
 * 파일 역할: 보고서 영역에서 사용하는 ReportLocationForm UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useRef, useState } from "react";
// 코드 설명: @/features/reports/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { searchLocations, type LocationSearchItem } from "@/features/reports/api";

// 코드 설명: ReportLocationFormProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ReportLocationFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: { label: string; latitude: number; longitude: number }) => void;
};

// 코드 설명: getLocationLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getLocationLabel(item: LocationSearchItem) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: item.location ?? item.name ?? item.title ?? item.locationName ?? item.l…
  return item.location ?? item.name ?? item.title ?? item.locationName ?? item.location_name ?? item.address ?? "";
}

// 코드 설명: getLocationDetail 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getLocationDetail(item: LocationSearchItem) {
  // 코드 설명: roadName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const roadName = item.roadName ?? item.road_name;
  // 코드 설명: address 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const address = item.address;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: roadName && address && roadName !== address
  if (roadName && address && roadName !== address) return roadName + " · " + address;
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: roadName ?? address ?? ""
  return roadName ?? address ?? "";
}

// 코드 설명: toNumber 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function toNumber(value: number | string | undefined) {
  // 코드 설명: numberValue 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const numberValue = Number(value);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Number.isFinite(numberValue) ? numberValue : null
  return Number.isFinite(numberValue) ? numberValue : null;
}

// 코드 설명: ReportLocationForm 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ReportLocationForm({ value, onChange, onSelect }: ReportLocationFormProps) {
  // 코드 설명: [items, setItems] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [items, setItems] = useState<LocationSearchItem[]>([]);
  // 코드 설명: [isSearching, setIsSearching] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSearching, setIsSearching] = useState(false);
  // 코드 설명: [isOpen, setIsOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isOpen, setIsOpen] = useState(false);
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: requestIdRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const requestIdRef = useRef(0);

  // 코드 설명: trimmedValue 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const trimmedValue = useMemo(() => value.trim(), [value]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: trimmedValue.length < 2
    if (trimmedValue.length < 2) {
      // 코드 설명: setItems 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setItems([]);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");
      // 코드 설명: setIsSearching 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSearching(false);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: requestId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const requestId = requestIdRef.current + 1;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: requestIdRef.current = requestId;
    requestIdRef.current = requestId;
    // 코드 설명: timer 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const timer = window.setTimeout(async () => {
      // 코드 설명: setIsSearching 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSearching(true);
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage("");

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: results 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const results = await searchLocations(trimmedValue, 5);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: requestIdRef.current !== requestId
        if (requestIdRef.current !== requestId) return;
        // 코드 설명: setItems 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setItems(results);
        // 코드 설명: setIsOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setIsOpen(true);
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: requestIdRef.current !== requestId
        if (requestIdRef.current !== requestId) return;
        // 코드 설명: setItems 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setItems([]);
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage(error instanceof Error ? error.message : "위치 검색 중 오류가 발생했습니다.");
      } finally {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: requestIdRef.current === requestId
        if (requestIdRef.current === requestId) setIsSearching(false);
      }
    }, 250);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => window.clearTimeout(timer)
    return () => window.clearTimeout(timer);
  }, [trimmedValue]);

  // 코드 설명: handleSelect 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleSelect(item: LocationSearchItem) {
    // 코드 설명: label 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const label = getLocationLabel(item);
    // 코드 설명: latitude 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const latitude = toNumber(item.latitude);
    // 코드 설명: longitude 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const longitude = toNumber(item.longitude);

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !label || latitude === null || longitude === null
    if (!label || latitude === null || longitude === null) return;

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onSelect({ label, latitude, longitude });
    onSelect({ label, latitude, longitude });
    // 코드 설명: setIsOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsOpen(false);
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className="relative grid gap-2">
      <input
        name="location"
        value={value}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onChange(event.target.value);
          onChange(event.target.value);
          // 코드 설명: setIsOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setIsOpen(true);
        }}
        onFocus={() => {
          // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: items.length > 0
          if (items.length > 0) setIsOpen(true);
        }}
        autoComplete="off"
        className="h-11 rounded-lg border border-slate-200 px-3"
        placeholder="예: 경부고속도로 수원IC 123.4K"
      />
      {isOpen && items.length > 0 ? (
        <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {items.map((item, index) => {
            // 코드 설명: label 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const label = getLocationLabel(item);
            // 코드 설명: detail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const detail = getLocationDetail(item);
            // 코드 설명: latitude 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const latitude = toNumber(item.latitude);
            // 코드 설명: longitude 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const longitude = toNumber(item.longitude);
            // 코드 설명: disabled 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const disabled = !label || latitude === null || longitude === null;

            // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
            return (
              <button
                key={String(item.id ?? label ?? index)}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item)}
                className="grid w-full gap-1 px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="font-bold text-slate-800">{label || "이름 없는 위치"}</span>
                {detail ? <span className="text-xs font-medium text-slate-500">{detail}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {isSearching ? <span className="text-xs font-semibold text-slate-500">위치를 검색하는 중입니다.</span> : null}
      {errorMessage ? <span className="text-xs font-semibold text-red-700">{errorMessage}</span> : null}
    </div>
  );
}