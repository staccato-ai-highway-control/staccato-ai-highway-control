/**
 * 파일 역할: CCTV 요청을 백엔드 또는 외부 미디어 서버로 중계하는 Next.js Route Handler입니다.
 * 유지보수 참고: 브라우저에 노출할 응답 상태와 헤더를 정리하며, 서버 주소나 내부 오류 정보가 그대로 전달되지 않도록 주의합니다.
 */
import { NextRequest } from "next/server";
import { authFailureResponse, requireServerAuth } from "@/lib/serverAuth";

// 코드 설명: dynamic 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
export const dynamic = "force-dynamic";

const FLASK_API_BASE_URL =
  process.env.FLASK_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://192.168.0.187:5000";

const CCTV_ACCESS_ROLES = ["SUPER_ADMIN", "CONTROL_ADMIN", "DISPATCH_ADMIN"] as const;

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
  request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const auth = await requireServerAuth(request, CCTV_ACCESS_ROLES);
  if (!auth.ok) return authFailureResponse(auth);

  // 코드 설명: { cctvId } 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const { cctvId } = await context.params;
  // 코드 설명: cameraId 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const cameraId = normalizeAiCameraId(cctvId);
  const upstreamAbortController = new AbortController();
  const abortUpstream = () => {
    if (upstreamAbortController.signal.aborted) return;
    upstreamAbortController.abort();
  };
  const handleRequestAbort = () => {
    console.info({ event: "request_signal_aborted", cctvId });
    abortUpstream();
  };
  request.signal.addEventListener("abort", handleRequestAbort, { once: true });
  let isRequestAbortListenerActive = true;
  const cleanupRequestAbortListener = () => {
    if (!isRequestAbortListenerActive) return;
    request.signal.removeEventListener("abort", handleRequestAbort);
    isRequestAbortListenerActive = false;
  };

  // 코드 설명: upstreamUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const upstreamUrl = new URL(
    `/api/ai-media/cctvs/${encodeURIComponent(cameraId)}/stream.mjpeg`,
    FLASK_API_BASE_URL.replace(/\/$/, "")
  );

  // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: request.nextUrl.searchParams.forEach((value, key) => { upstreamUrl.sear…
  request.nextUrl.searchParams.forEach((value, key) => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: upstreamUrl.searchParams.set(key, value);
    upstreamUrl.searchParams.set(key, value);
  });

  // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${auth.token}` },
      signal: upstreamAbortController.signal,
    });
  } catch (error) {
    cleanupRequestAbortListener();
    throw error;
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !response.ok
  if (!response.ok) {
    cleanupRequestAbortListener();
    return new Response("Failed to fetch CCTV stream", {
      status: response.status || 502,
    });
  }

  if (!response.body) {
    cleanupRequestAbortListener();
    return Response.json(
      { success: false, error: "CCTV stream upstream returned no body." },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }


  const responseHeaders = new Headers();
  responseHeaders.set(
    "Content-Type",
    response.headers.get("content-type") || "multipart/x-mixed-replace"
  );
  responseHeaders.set("Cache-Control", "no-store, no-transform");
  responseHeaders.set("X-Accel-Buffering", "no");

  const reader = response.body.getReader();
  let isStreamClosed = false;
  const closeStream = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (isStreamClosed) return;
    isStreamClosed = true;
    controller.close();
  };
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.info({ event: "upstream_reader_done", cctvId });
          cleanupRequestAbortListener();
          closeStream(controller);
          return;
        }
        if (value) controller.enqueue(value);
      } catch (error) {
        cleanupRequestAbortListener();
        if (upstreamAbortController.signal.aborted) {
          try {
            closeStream(controller);
          } catch {
            // The consumer may have already closed the stream after abort.
          }
          return;
        }
        isStreamClosed = true;
        controller.error(error);
      }
    },
    async cancel(reason) {
      const logPayload: { event: string; cctvId: string; reason?: string } = {
        event: "response_stream_cancelled",
        cctvId,
      };
      if (typeof reason === "string") logPayload.reason = reason.slice(0, 80);
      console.info(logPayload);
      cleanupRequestAbortListener();
      abortUpstream();

      try {
        await reader.cancel(reason);
      } catch {
        // Upstream may already be closed after browser disconnect.
      }
    },
  });

  return new Response(stream, {
    status: response.status,
    headers: responseHeaders,
  });
}
