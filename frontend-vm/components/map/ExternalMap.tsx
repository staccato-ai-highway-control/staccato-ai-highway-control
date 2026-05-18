"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { getMapConfig, type MapConfig, type MapProvider } from "@/features/map/api";

declare global {
  interface Window {
    kakao?: any;
    naver?: any;
    google?: any;
  }
}

export type ExternalMapMarker = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type?: string;
};

type ExternalMapProps = {
  markers: ExternalMapMarker[];
  selectedMarkerId?: string;
  onMarkerSelect?: (markerId: string) => void;
  className?: string;
};

const loadedScripts = new Map<string, Promise<void>>();

function getScriptUrl(config: MapConfig) {
  if (config.provider === "kakao") {
    const appKey = config.appKey ?? config.key;
    if (!appKey) throw new Error("Kakao 지도 app key가 없습니다.");
    return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
  }

  if (config.provider === "naver") {
    const key = config.clientId ?? config.key;
    if (!key) throw new Error("Naver 지도 client id 또는 ncp key id가 없습니다.");
    return `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}`;
  }

  const key = config.key ?? config.appKey;
  if (!key) throw new Error("Google 지도 API key가 없습니다.");
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
}

function loadScript(src: string) {
  const existing = loadedScripts.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("지도 SDK 스크립트를 불러오지 못했습니다. 네트워크, API 키, 허용 도메인 설정을 확인해주세요."));
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}

async function loadMapSdk(config: MapConfig) {
  await loadScript(getScriptUrl(config));

  if (config.provider === "kakao") {
    if (!window.kakao?.maps?.load) {
      throw new Error("Kakao Maps SDK 초기화에 실패했습니다. JavaScript 키와 Web 플랫폼 도메인을 확인해주세요.");
    }

    await new Promise<void>((resolve) => {
      window.kakao.maps.load(() => resolve());
    });
    return;
  }

  if (config.provider === "naver" && !window.naver?.maps) {
    throw new Error("Naver Maps SDK 초기화에 실패했습니다. 지도 키와 Web 서비스 URL을 확인해주세요.");
  }

  if (config.provider === "google" && !window.google?.maps) {
    throw new Error("Google Maps SDK 초기화에 실패했습니다. API 키와 HTTP referrer 제한을 확인해주세요.");
  }
}

function getMapCenter(config: MapConfig, markers: ExternalMapMarker[]) {
  const firstMarker = markers[0];

  return {
    latitude: config.center?.latitude ?? firstMarker?.latitude ?? 37.2636,
    longitude: config.center?.longitude ?? firstMarker?.longitude ?? 127.0286,
  };
}

function createMarkerLabel(marker: ExternalMapMarker) {
  return marker.type ? `${marker.title} (${marker.type})` : marker.title;
}

export function ExternalMap({ markers, selectedMarkerId, onMarkerSelect, className }: ExternalMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [status, setStatus] = useState("지도 설정을 불러오는 중입니다.");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedMarker = useMemo(() => {
    return markers.find((marker) => marker.id === selectedMarkerId) ?? markers[0];
  }, [markers, selectedMarkerId]);

  useEffect(() => {
    let ignore = false;

    async function loadConfig() {
      try {
        setStatus("지도 설정을 불러오는 중입니다.");
        const nextConfig = await getMapConfig();
        if (ignore) return;
        setConfig(nextConfig);
        setErrorMessage("");
      } catch (error) {
        if (ignore) return;
        setErrorMessage(error instanceof Error ? error.message : "지도 설정을 불러오지 못했습니다.");
      }
    }

    loadConfig();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    let ignore = false;
    const mapConfig = config;

    async function renderMap() {
      try {
        setStatus("지도 SDK를 불러오는 중입니다.");
        await loadMapSdk(mapConfig);
        if (ignore || !containerRef.current) return;

        markerRefs.current.forEach((marker) => {
          if (mapConfig.provider === "kakao") marker.setMap(null);
          if (mapConfig.provider === "naver") marker.setMap(null);
          if (mapConfig.provider === "google") marker.setMap(null);
        });
        markerRefs.current = [];

        const center = getMapCenter(mapConfig, markers);
        const map = createMap(mapConfig.provider, mapConfig, containerRef.current, center);
        mapRef.current = map;

        markerRefs.current = markers.map((marker) =>
          createMapMarker(mapConfig.provider, map, marker, () => onMarkerSelect?.(marker.id))
        );

        setStatus("");
        setErrorMessage("");
      } catch (error) {
        if (ignore) return;
        setErrorMessage(error instanceof Error ? error.message : "지도를 표시하지 못했습니다.");
      }
    }

    renderMap();

    return () => {
      ignore = true;
    };
  }, [config, markers, onMarkerSelect]);

  useEffect(() => {
    if (!config || !mapRef.current || !selectedMarker) return;
    panToMarker(config.provider, mapRef.current, selectedMarker);
  }, [config, selectedMarker]);

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

function createMap(provider: MapProvider, config: MapConfig, container: HTMLDivElement, center: { latitude: number; longitude: number }) {
  if (provider === "kakao") {
    return new window.kakao.maps.Map(container, {
      center: new window.kakao.maps.LatLng(center.latitude, center.longitude),
      level: config.level ?? 8,
    });
  }

  if (provider === "naver") {
    return new window.naver.maps.Map(container, {
      center: new window.naver.maps.LatLng(center.latitude, center.longitude),
      zoom: config.zoom ?? 10,
    });
  }

  return new window.google.maps.Map(container, {
    center: { lat: center.latitude, lng: center.longitude },
    zoom: config.zoom ?? 10,
  });
}

function createMapMarker(provider: MapProvider, map: any, marker: ExternalMapMarker, onClick: () => void) {
  if (provider === "kakao") {
    const kakaoMarker = new window.kakao.maps.Marker({
      map,
      position: new window.kakao.maps.LatLng(marker.latitude, marker.longitude),
      title: createMarkerLabel(marker),
    });
    window.kakao.maps.event.addListener(kakaoMarker, "click", onClick);
    return kakaoMarker;
  }

  if (provider === "naver") {
    const naverMarker = new window.naver.maps.Marker({
      map,
      position: new window.naver.maps.LatLng(marker.latitude, marker.longitude),
      title: createMarkerLabel(marker),
    });
    window.naver.maps.Event.addListener(naverMarker, "click", onClick);
    return naverMarker;
  }

  const googleMarker = new window.google.maps.Marker({
    map,
    position: { lat: marker.latitude, lng: marker.longitude },
    title: createMarkerLabel(marker),
  });
  googleMarker.addListener("click", onClick);
  return googleMarker;
}

function panToMarker(provider: MapProvider, map: any, marker: ExternalMapMarker) {
  if (provider === "kakao") {
    map.panTo(new window.kakao.maps.LatLng(marker.latitude, marker.longitude));
    return;
  }

  if (provider === "naver") {
    map.panTo(new window.naver.maps.LatLng(marker.latitude, marker.longitude));
    return;
  }

  map.panTo({ lat: marker.latitude, lng: marker.longitude });
}
