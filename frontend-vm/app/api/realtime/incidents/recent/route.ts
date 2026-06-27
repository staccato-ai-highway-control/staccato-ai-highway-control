/**
 * 파일 역할: 실시간 이벤트 요청을 백엔드 또는 외부 미디어 서버로 중계하는 Next.js Route Handler입니다.
 * 유지보수 참고: 브라우저에 노출할 응답 상태와 헤더를 정리하며, 서버 주소나 내부 오류 정보가 그대로 전달되지 않도록 주의합니다.
 */
import { NextResponse } from "next/server";

// 코드 설명: dynamic 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const dynamic = "force-dynamic";

// 코드 설명: FLASK_API_BASE_URL 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://192.168.0.187:5000";

// 코드 설명: GET 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export async function GET() {
  // 코드 설명: flaskUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const flaskUrl = `${FLASK_API_BASE_URL.replace(/\/$/, "")}/api/realtime/incidents/recent`;

  // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
  try {
    // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const response = await fetch(flaskUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    // 코드 설명: body 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const body = await response.text();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: new NextResponse(body, { status: response.status, headers: { "Content-T…
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: NextResponse.json( { success: false, count: 0, items: [], message: erro…
    return NextResponse.json(
      {
        success: false,
        count: 0,
        items: [],
        message: error instanceof Error ? error.message : "Flask realtime incidents proxy failed",
      },
      { status: 500 }
    );
  }
}
