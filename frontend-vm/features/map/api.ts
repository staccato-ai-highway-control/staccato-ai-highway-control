import { apiClient } from "@/lib/apiClient";

export type MapProvider = "kakao" | "naver" | "google";

export type MapConfig = {
  provider: MapProvider;
  appKey?: string;
  clientId?: string;
  key?: string;
  center?: {
    latitude: number;
    longitude: number;
  };
  level?: number;
  zoom?: number;
};

type RawMapConfig = Partial<MapConfig> & {
  map?: RawMapConfig;
  map_provider?: string;
  mapProvider?: string;
  app_key?: string;
  map_app_key?: string;
  kakao_app_key?: string;
  kakao_javascript_key?: string;
  kakaoMapJsKey?: string;
  kakao_map_js_key?: string;
  javascript_key?: string;
  js_key?: string;
  client_id?: string;
  map_client_id?: string;
  ncp_key_id?: string;
  naver_client_id?: string;
  naver_ncp_key_id?: string;
  api_key?: string;
  map_api_key?: string;
  google_api_key?: string;
};

type MapConfigResponse = RawMapConfig | { data: RawMapConfig };

function normalizeMapConfig(response: MapConfigResponse): MapConfig {
  const root = "data" in response ? response.data : response;
  const data = root.map ?? root;
  const inferredProvider =
    data.provider ??
    data.mapProvider ??
    data.map_provider ??
    (data.kakaoMapJsKey || data.kakao_map_js_key || data.kakao_app_key || data.kakao_javascript_key
      ? "kakao"
      : undefined);
  const provider = inferredProvider?.toLowerCase() as MapProvider | undefined;

  if (!provider || !["kakao", "naver", "google"].includes(provider)) {
    throw new Error("지도 provider 설정을 확인해주세요. kakao, naver, google 중 하나여야 합니다.");
  }

  return {
    provider,
    appKey:
      data.appKey ??
      data.app_key ??
      data.map_app_key ??
      data.kakao_app_key ??
      data.kakao_javascript_key ??
      data.kakaoMapJsKey ??
      data.kakao_map_js_key ??
      data.javascript_key ??
      data.js_key,
    clientId:
      data.clientId ??
      data.client_id ??
      data.map_client_id ??
      data.ncp_key_id ??
      data.naver_client_id ??
      data.naver_ncp_key_id,
    key: data.key ?? data.api_key ?? data.map_api_key ?? data.google_api_key,
    center: data.center,
    level: data.level,
    zoom: data.zoom,
  };
}

export async function getMapConfig() {
  return normalizeMapConfig(await apiClient<MapConfigResponse>("/api/config/public"));
}
