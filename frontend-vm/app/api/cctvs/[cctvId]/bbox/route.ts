/**
 * 파일 역할: CCTV 요청을 백엔드 또는 외부 미디어 서버로 중계하는 Next.js Route Handler입니다.
 * 유지보수 참고: 브라우저에 노출할 응답 상태와 헤더를 정리하며, 서버 주소나 내부 오류 정보가 그대로 전달되지 않도록 주의합니다.
 */
import { NextRequest, NextResponse } from "next/server";

// 코드 설명: dynamic 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const dynamic = "force-dynamic";

// 코드 설명: AI_VM_BASE_URL 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

// 코드 설명: GET 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  // 코드 설명: { cctvId } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { cctvId } = await context.params;
  // 코드 설명: upstreamUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const upstreamUrl = new URL(
    `/internal/cameras/${encodeURIComponent(cctvId)}/detections`,
    AI_VM_BASE_URL.replace(/\/$/, "")
  );

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: request.nextUrl.searchParams.forEach((value, key) => { upstreamUrl.sear…
  request.nextUrl.searchParams.forEach((value, key) => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: upstreamUrl.searchParams.set(key, value);
    upstreamUrl.searchParams.set(key, value);
  });

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
    });

    // 코드 설명: data 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const data = await response.json().catch(() => null);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: NextResponse.json(data ?? { success: false, error: "Invalid AI VM respo…
    return NextResponse.json(data ?? { success: false, error: "Invalid AI VM response" }, {
      status: response.status,
    });
  } catch (error) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: NextResponse.json( { success: false, camera_id: cctvId, error: error in…
    return NextResponse.json(
      {
        success: false,
        camera_id: cctvId,
        error: error instanceof Error ? error.message : "Failed to fetch CCTV detections",
      },
      { status: 502 }
    );
  }
}
