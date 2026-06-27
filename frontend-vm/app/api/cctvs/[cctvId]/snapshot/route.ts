/**
 * 파일 역할: CCTV 요청을 백엔드 또는 외부 미디어 서버로 중계하는 Next.js Route Handler입니다.
 * 유지보수 참고: 브라우저에 노출할 응답 상태와 헤더를 정리하며, 서버 주소나 내부 오류 정보가 그대로 전달되지 않도록 주의합니다.
 */
import { NextRequest } from "next/server";

// 코드 설명: dynamic 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const dynamic = "force-dynamic";

// 코드 설명: AI_VM_BASE_URL 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

// 코드 설명: normalizeAiCameraId 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function normalizeAiCameraId(cctvId: string) {
  // 코드 설명: decoded 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const decoded = decodeURIComponent(cctvId);
  // 코드 설명: match 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const match = decoded.match(/^CCTV-0*([1-9]\d*)$/i);

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: match
  if (match) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: `camera-${Number(match[1])}`
    return `camera-${Number(match[1])}`;
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: decoded
  return decoded;
}

// 코드 설명: GET 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  // 코드 설명: { cctvId } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { cctvId } = await context.params;
  // 코드 설명: cameraId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cameraId = normalizeAiCameraId(cctvId);
  // 코드 설명: upstreamUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const upstreamUrl = new URL(
    `/snapshots/${encodeURIComponent(cameraId)}/latest.jpg`,
    AI_VM_BASE_URL.replace(/\/$/, "")
  );

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
  });

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok || !response.body
  if (!response.ok || !response.body) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Response("Snapshot not available", { status: response.status || 502…
    return new Response("Snapshot not available", {
      status: response.status || 502,
    });
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new Response(response.body, { status: response.status, headers: { "Cont…
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
