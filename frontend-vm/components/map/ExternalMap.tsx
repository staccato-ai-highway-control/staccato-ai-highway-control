/**
 * 파일 역할: 지도 영역에서 사용하는 ExternalMap UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useMemo, useRef, useState } from "react";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { MapPin } from "lucide-react";
// 코드 설명: @/features/map/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getMapConfig, type MapConfig, type MapProvider } from "@/features/map/api";

declare global {
  // 코드 설명: Window 인터페이스로 모듈 사이에 전달되는 객체 계약을 정의합니다.
  interface Window {
    // 코드 설명: kakao 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
    kakao?: any;
    // 코드 설명: naver 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
    naver?: any;
    // 코드 설명: google 필드가 객체 계약에서 사용할 값의 타입과 선택 여부를 정의합니다.
    google?: any;
  }
}

// 코드 설명: ExternalMapMarker 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ExternalMapMarker = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type?: string;
};

// 코드 설명: ExternalMapProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type ExternalMapProps = {
  markers: ExternalMapMarker[];
  selectedMarkerId?: string;
  onMarkerSelect?: (markerId: string) => void;
  className?: string;
};

// 코드 설명: loadedScripts 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const loadedScripts = new Map<string, Promise<void>>();

// 코드 설명: getScriptUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getScriptUrl(config: MapConfig) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: config.provider === "kakao"
  if (config.provider === "kakao") {
    // 코드 설명: appKey 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const appKey = config.appKey ?? config.key;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !appKey
    if (!appKey) throw new Error("Kakao 지도 app key가 없습니다.");
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appK…
    return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: config.provider === "naver"
  if (config.provider === "naver") {
    // 코드 설명: key 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const key = config.clientId ?? config.key;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !key
    if (!key) throw new Error("Naver 지도 client id 또는 ncp key id가 없습니다.");
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComp…
    return `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}`;
  }

  // 코드 설명: key 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const key = config.key ?? config.appKey;
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !key
  if (!key) throw new Error("Google 지도 API key가 없습니다.");
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
}

// 코드 설명: loadScript 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function loadScript(src: string) {
  // 코드 설명: existing 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const existing = loadedScripts.get(src);
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: existing
  if (existing) return existing;

  // 코드 설명: promise 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const promise = new Promise<void>((resolve, reject) => {
    // 코드 설명: script 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const script = document.createElement("script");
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: script.src = src;
    script.src = src;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: script.async = true;
    script.async = true;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: script.onload = () => resolve();
    script.onload = () => resolve();
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: script.onerror = () => reject(new Error("지도 SDK 스크립트를 불러오지 못했습니다. 네트워크,…
    script.onerror = () => reject(new Error("지도 SDK 스크립트를 불러오지 못했습니다. 네트워크, API 키, 허용 도메인 설정을 확인해주세요."));
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: document.head.appendChild(script);
    document.head.appendChild(script);
  });

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadedScripts.set(src, promise);
  loadedScripts.set(src, promise);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: promise
  return promise;
}

// 코드 설명: loadMapSdk 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
async function loadMapSdk(config: MapConfig) {
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadScript(getScriptUrl(config));
  await loadScript(getScriptUrl(config));

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: config.provider === "kakao"
  if (config.provider === "kakao") {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !window.kakao?.maps?.load
    if (!window.kakao?.maps?.load) {
      // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("Kakao Maps SDK 초기화에 실패했습니다. JavaScript 키와 Web 플랫폼 도메인을 확인해주세…
      throw new Error("Kakao Maps SDK 초기화에 실패했습니다. JavaScript 키와 Web 플랫폼 도메인을 확인해주세요.");
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await new Promise<void>((resolve) => { window.kakao.maps.load(() => res…
    await new Promise<void>((resolve) => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.kakao.maps.load(() => resolve());
      window.kakao.maps.load(() => resolve());
    });
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
    return;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: config.provider === "naver" && !window.naver?.maps
  if (config.provider === "naver" && !window.naver?.maps) {
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("Naver Maps SDK 초기화에 실패했습니다. 지도 키와 Web 서비스 URL을 확인해주세요.")
    throw new Error("Naver Maps SDK 초기화에 실패했습니다. 지도 키와 Web 서비스 URL을 확인해주세요.");
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: config.provider === "google" && !window.google?.maps
  if (config.provider === "google" && !window.google?.maps) {
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("Google Maps SDK 초기화에 실패했습니다. API 키와 HTTP referrer 제한을 확인해주세요…
    throw new Error("Google Maps SDK 초기화에 실패했습니다. API 키와 HTTP referrer 제한을 확인해주세요.");
  }
}

// 코드 설명: getMapCenter 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getMapCenter(config: MapConfig, markers: ExternalMapMarker[]) {
  // 코드 설명: firstMarker 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const firstMarker = markers[0];

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { latitude: config.center?.latitude ?? firstMarker?.latitude ?? 37.2636…
  return {
    latitude: config.center?.latitude ?? firstMarker?.latitude ?? 37.2636,
    longitude: config.center?.longitude ?? firstMarker?.longitude ?? 127.0286,
  };
}

// 코드 설명: createMarkerLabel 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function createMarkerLabel(marker: ExternalMapMarker) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: marker.type ? `${marker.title} (${marker.type})` : marker.title
  return marker.type ? `${marker.title} (${marker.type})` : marker.title;
}

// 코드 설명: ExternalMap 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ExternalMap({ markers, selectedMarkerId, onMarkerSelect, className }: ExternalMapProps) {
  // 코드 설명: containerRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const containerRef = useRef<HTMLDivElement | null>(null);
  // 코드 설명: mapRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const mapRef = useRef<any>(null);
  // 코드 설명: markerRefs 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const markerRefs = useRef<any[]>([]);
  // 코드 설명: [config, setConfig] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [config, setConfig] = useState<MapConfig | null>(null);
  // 코드 설명: [status, setStatus] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [status, setStatus] = useState("지도 설정을 불러오는 중입니다.");
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");

  // 코드 설명: selectedMarker 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const selectedMarker = useMemo(() => {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: markers.find((marker) => marker.id === selectedMarkerId) ?? markers[0]
    return markers.find((marker) => marker.id === selectedMarkerId) ?? markers[0];
  }, [markers, selectedMarkerId]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: ignore 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let ignore = false;

    // 코드 설명: loadConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function loadConfig() {
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setStatus("지도 설정을 불러오는 중입니다.");
        // 코드 설명: nextConfig 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const nextConfig = await getMapConfig();
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ignore
        if (ignore) return;
        // 코드 설명: setConfig 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setConfig(nextConfig);
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage("");
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ignore
        if (ignore) return;
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage(error instanceof Error ? error.message : "지도 설정을 불러오지 못했습니다.");
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: loadConfig();
    loadConfig();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { ignore = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: ignore = true;
      ignore = true;
    };
  }, []);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !config || !containerRef.current
    if (!config || !containerRef.current) return;

    // 코드 설명: ignore 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let ignore = false;
    // 코드 설명: mapConfig 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const mapConfig = config;

    // 코드 설명: renderMap 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function renderMap() {
      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setStatus("지도 SDK를 불러오는 중입니다.");
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await loadMapSdk(mapConfig);
        await loadMapSdk(mapConfig);
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ignore || !containerRef.current
        if (ignore || !containerRef.current) return;

        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: markerRefs.current.forEach((marker) => { if (mapConfig.provider === "ka…
        markerRefs.current.forEach((marker) => {
          // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: mapConfig.provider === "kakao"
          if (mapConfig.provider === "kakao") marker.setMap(null);
          // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: mapConfig.provider === "naver"
          if (mapConfig.provider === "naver") marker.setMap(null);
          // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: mapConfig.provider === "google"
          if (mapConfig.provider === "google") marker.setMap(null);
        });
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: markerRefs.current = [];
        markerRefs.current = [];

        // 코드 설명: center 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const center = getMapCenter(mapConfig, markers);
        // 코드 설명: map 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const map = createMap(mapConfig.provider, mapConfig, containerRef.current, center);
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: mapRef.current = map;
        mapRef.current = map;

        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: markerRefs.current = markers.map((marker) => createMapMarker(mapConfig.…
        markerRefs.current = markers.map((marker) =>
          createMapMarker(mapConfig.provider, map, marker, () => onMarkerSelect?.(marker.id))
        );

        // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setStatus("");
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage("");
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: ignore
        if (ignore) return;
        // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setErrorMessage(error instanceof Error ? error.message : "지도를 표시하지 못했습니다.");
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: renderMap();
    renderMap();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { ignore = true; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: ignore = true;
      ignore = true;
    };
  }, [config, markers, onMarkerSelect]);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !config || !mapRef.current || !selectedMarker
    if (!config || !mapRef.current || !selectedMarker) return;
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: panToMarker(config.provider, mapRef.current, selectedMarker);
    panToMarker(config.provider, mapRef.current, selectedMarker);
  }, [config, selectedMarker]);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <div className={`relative min-h-[620px] overflow-hidden bg-slate-100 ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {status && !errorMessage ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-50">
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            {status}
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-50 p-6">
          <div className="max-w-md rounded-lg border border-amber-200 bg-white p-5 text-center shadow-sm">
            <MapPin className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-black text-slate-950">지도 연결 설정이 필요합니다.</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{errorMessage}</p>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
              Flask에서 <code className="rounded bg-slate-100 px-1">GET /api/config/public</code>가 지도 공개 설정을 JSON으로 반환해야 합니다.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// 코드 설명: createMap 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function createMap(provider: MapProvider, config: MapConfig, container: HTMLDivElement, center: { latitude: number; longitude: number }) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: provider === "kakao"
  if (provider === "kakao") {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new window.kakao.maps.Map(container, { center: new window.kakao.maps.La…
    return new window.kakao.maps.Map(container, {
      center: new window.kakao.maps.LatLng(center.latitude, center.longitude),
      level: config.level ?? 8,
    });
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: provider === "naver"
  if (provider === "naver") {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new window.naver.maps.Map(container, { center: new window.naver.maps.La…
    return new window.naver.maps.Map(container, {
      center: new window.naver.maps.LatLng(center.latitude, center.longitude),
      zoom: config.zoom ?? 10,
    });
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new window.google.maps.Map(container, { center: { lat: center.latitude,…
  return new window.google.maps.Map(container, {
    center: { lat: center.latitude, lng: center.longitude },
    zoom: config.zoom ?? 10,
  });
}

// 코드 설명: createMapMarker 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function createMapMarker(provider: MapProvider, map: any, marker: ExternalMapMarker, onClick: () => void) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: provider === "kakao"
  if (provider === "kakao") {
    // 코드 설명: kakaoMarker 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const kakaoMarker = new window.kakao.maps.Marker({
      map,
      position: new window.kakao.maps.LatLng(marker.latitude, marker.longitude),
      title: createMarkerLabel(marker),
    });
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.kakao.maps.event.addListener(kakaoMarker, "click", onClick);
    window.kakao.maps.event.addListener(kakaoMarker, "click", onClick);
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: kakaoMarker
    return kakaoMarker;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: provider === "naver"
  if (provider === "naver") {
    // 코드 설명: naverMarker 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const naverMarker = new window.naver.maps.Marker({
      map,
      position: new window.naver.maps.LatLng(marker.latitude, marker.longitude),
      title: createMarkerLabel(marker),
    });
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.naver.maps.Event.addListener(naverMarker, "click", onClick);
    window.naver.maps.Event.addListener(naverMarker, "click", onClick);
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: naverMarker
    return naverMarker;
  }

  // 코드 설명: googleMarker 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const googleMarker = new window.google.maps.Marker({
    map,
    position: { lat: marker.latitude, lng: marker.longitude },
    title: createMarkerLabel(marker),
  });
  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: googleMarker.addListener("click", onClick);
  googleMarker.addListener("click", onClick);
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: googleMarker
  return googleMarker;
}

// 코드 설명: panToMarker 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function panToMarker(provider: MapProvider, map: any, marker: ExternalMapMarker) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: provider === "kakao"
  if (provider === "kakao") {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.panTo(new window.kakao.maps.LatLng(marker.latitude, marker.longitud…
    map.panTo(new window.kakao.maps.LatLng(marker.latitude, marker.longitude));
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
    return;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: provider === "naver"
  if (provider === "naver") {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.panTo(new window.naver.maps.LatLng(marker.latitude, marker.longitud…
    map.panTo(new window.naver.maps.LatLng(marker.latitude, marker.longitude));
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
    return;
  }

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: map.panTo({ lat: marker.latitude, lng: marker.longitude });
  map.panTo({ lat: marker.latitude, lng: marker.longitude });
}
