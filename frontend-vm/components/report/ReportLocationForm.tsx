"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchLocations, type LocationSearchItem } from "@/features/reports/api";

type ReportLocationFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: { label: string; latitude: number; longitude: number }) => void;
};

function getLocationLabel(item: LocationSearchItem) {
  return item.location ?? item.name ?? item.title ?? item.locationName ?? item.location_name ?? item.address ?? "";
}

function getLocationDetail(item: LocationSearchItem) {
  const roadName = item.roadName ?? item.road_name;
  const address = item.address;

  if (roadName && address && roadName !== address) return roadName + " · " + address;
  return roadName ?? address ?? "";
}

function toNumber(value: number | string | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function ReportLocationForm({ value, onChange, onSelect }: ReportLocationFormProps) {
  const [items, setItems] = useState<LocationSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const requestIdRef = useRef(0);

  const trimmedValue = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    if (trimmedValue.length < 2) {
      setItems([]);
      setErrorMessage("");
      setIsSearching(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setErrorMessage("");

      try {
        const results = await searchLocations(trimmedValue, 5);
        if (requestIdRef.current !== requestId) return;
        setItems(results);
        setIsOpen(true);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        setItems([]);
        setErrorMessage(error instanceof Error ? error.message : "위치 검색 중 오류가 발생했습니다.");
      } finally {
        if (requestIdRef.current === requestId) setIsSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [trimmedValue]);

  function handleSelect(item: LocationSearchItem) {
    const label = getLocationLabel(item);
    const latitude = toNumber(item.latitude);
    const longitude = toNumber(item.longitude);

    if (!label || latitude === null || longitude === null) return;

    onSelect({ label, latitude, longitude });
    setIsOpen(false);
  }

  return (
    <div className="relative grid gap-2">
      <input
        name="location"
        value={value}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (items.length > 0) setIsOpen(true);
        }}
        autoComplete="off"
        className="h-11 rounded-lg border border-slate-200 px-3"
        placeholder="예: 경부고속도로 수원IC 123.4K"
      />
      {isOpen && items.length > 0 ? (
        <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {items.map((item, index) => {
            const label = getLocationLabel(item);
            const detail = getLocationDetail(item);
            const latitude = toNumber(item.latitude);
            const longitude = toNumber(item.longitude);
            const disabled = !label || latitude === null || longitude === null;

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
