/**
 * 파일 역할: mediaUrl 관련 처리를 여러 기능에서 재사용할 수 있도록 제공하는 공통 유틸리티입니다.
 * 유지보수 참고: 호출 범위가 넓으므로 입력 경계값과 브라우저/서버 실행 환경 차이를 고려해 동작을 변경해야 합니다.
 */
import { API_BASE_URL } from "@/lib/constants";

// 코드 설명: AI_MEDIA_PROXY_PREFIXES 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const AI_MEDIA_PROXY_PREFIXES = ["/events/", "/streams/", "/snapshots/"];
// 코드 설명: FLASK_MEDIA_PREFIXES 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const FLASK_MEDIA_PREFIXES = ["/api/", "/backend-api/", "/event_media/", "/uploads/", "/static/", "/media/"];

// 코드 설명: isAiProxyPath 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isAiProxyPath(pathname: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: AI_MEDIA_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  return AI_MEDIA_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// 코드 설명: isPrivateAiOrigin 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isPrivateAiOrigin(url: URL) {
  // 코드 설명: 여러 검사 조건을 논리 연산으로 결합해 최종 boolean 판정 결과를 반환합니다.
  return (
    url.port === "5001" &&
    ["192.168.0.186", "localhost", "127.0.0.1"].includes(url.hostname)
  );
}

// 코드 설명: normalizeMediaUrl 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function normalizeMediaUrl(rawUrl?: string | null) {
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !rawUrl || rawUrl === "null" || rawUrl === "undefined"
  if (!rawUrl || rawUrl === "null" || rawUrl === "undefined") return null;

  // 코드 설명: trimmed 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const trimmed = rawUrl.trim();
  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !trimmed
  if (!trimmed) return null;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: /^https?:\/\//i.test(trimmed)
  if (/^https?:\/\//i.test(trimmed)) {
    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: url 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const url = new URL(trimmed);

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isPrivateAiOrigin(url)
      if (isPrivateAiOrigin(url)) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isAiProxyPath(url.pathname)
        if (isAiProxyPath(url.pathname)) {
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${url.pathname}${url.search}${url.hash}`
          return `${url.pathname}${url.search}${url.hash}`;
        }

        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `/ai-vm${url.pathname}${url.search}${url.hash}`
        return `/ai-vm${url.pathname}${url.search}${url.hash}`;
      }

      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: trimmed
      return trimmed;
    } catch {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: trimmed
      return trimmed;
    }
  }

  // 코드 설명: normalizedPath 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isAiProxyPath(normalizedPath)
  if (isAiProxyPath(normalizedPath)) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizedPath
    return normalizedPath;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: FLASK_MEDIA_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  if (FLASK_MEDIA_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: normalizedPath.startsWith("/backend-api/")
    if (normalizedPath.startsWith("/backend-api/")) return normalizedPath;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`
    return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: normalizedPath
  return normalizedPath;
}
