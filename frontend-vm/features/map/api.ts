/**
 * 파일 역할: 지도 기능이 사용하는 백엔드 API 호출을 한곳에 모아 제공합니다.
 * 유지보수 참고: 공통 API 클라이언트를 통해 인증과 오류 처리를 일관되게 적용하고, 응답 형태가 달라질 수 있는 경우 화면용 데이터로 정규화합니다.
 */
import { apiClient } from "@/lib/apiClient";

// 코드 설명: MapProvider 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type MapProvider = "kakao" | "naver" | "google";

// 코드 설명: MapConfig 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: RawMapConfig 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
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

// 코드 설명: MapConfigResponse 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type MapConfigResponse = RawMapConfig | { data: RawMapConfig };

// 코드 설명: normalizeMapConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeMapConfig(response: MapConfigResponse): MapConfig {
  // 코드 설명: root 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const root = "data" in response ? response.data : response;
  // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const data = root.map ?? root;
  // 코드 설명: inferredProvider 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const inferredProvider =
    data.provider ??
    data.mapProvider ??
    data.map_provider ??
    (data.kakaoMapJsKey || data.kakao_map_js_key || data.kakao_app_key || data.kakao_javascript_key
      ? "kakao"
      : undefined);
  // 코드 설명: provider 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const provider = inferredProvider?.toLowerCase() as MapProvider | undefined;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !provider || !["kakao", "naver", "google"].includes(provider)
  if (!provider || !["kakao", "naver", "google"].includes(provider)) {
    // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("지도 provider 설정을 확인해주세요. kakao, naver, google 중 하나여야 합니다.")
    throw new Error("지도 provider 설정을 확인해주세요. kakao, naver, google 중 하나여야 합니다.");
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { provider, appKey: data.appKey ?? data.app_key ?? data.map_app_key ?? …
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

// 코드 설명: getMapConfig 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function getMapConfig() {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizeMapConfig(await apiClient<MapConfigResponse>("/api/config/publ…
  return normalizeMapConfig(await apiClient<MapConfigResponse>("/api/config/public", { auth: false }));
}
