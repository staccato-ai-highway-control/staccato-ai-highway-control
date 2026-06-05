import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const AI_VM_BASE_URL =
  process.env.AI_VM_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_VM_BASE_URL ||
  "http://192.168.0.186:5001";

function normalizeAiCameraId(cctvId: string) {
  const decoded = decodeURIComponent(cctvId);
  const match = decoded.match(/^CCTV-0*([1-9]\d*)$/i);

  if (match) {
    return `camera-${Number(match[1])}`;
  }

  return decoded;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cctvId: string }> }
) {
  const { cctvId } = await context.params;
  const cameraId = normalizeAiCameraId(cctvId);
  const upstreamUrl = new URL(
    `/streams/${encodeURIComponent(cameraId)}.mjpeg`,
    AI_VM_BASE_URL.replace(/\/$/, "")
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    return new Response("Failed to fetch CCTV stream", {
      status: response.status || 502,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "multipart/x-mixed-replace",
      "Cache-Control": "no-store",
    },
  });
}
